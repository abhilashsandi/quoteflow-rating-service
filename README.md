# quoteflow-rating-service

Rating/quoting engine for the fictional carrier **Acme Insurance** — and the piece that ships
its own form config and field validators to the browser as versioned, cache-busted bundles.
Portfolio sample; see [CLAUDE.md](./CLAUDE.md) for the architecture summary and the
middleware-ordering trap worth knowing about.

> Status: full quote lifecycle (schema -> rc1 -> rc2 -> bind), config + validator bundlers,
> RabbitMQ producer + SSE, OpenTelemetry (steps 1-9 of the build). This README grows as the
> final step (this doc + ADR) lands.

## Requirements

- Node.js 20+ (developed against Node 24)
- Postgres, Redis, RabbitMQ reachable locally — this service does **not** provide them; point
  it at your own via env vars. Local Docker containers used during development:
  ```bash
  docker run -d --name quoteflow-postgres -p 5432:5432 -e POSTGRES_PASSWORD=quoteflow -e POSTGRES_DB=quoteflow_rating postgres:16
  docker run -d --name quoteflow-redis -p 6379:6379 redis:7
  docker run -d --name quoteflow-rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
  ```

## Environment variables

Copy `.env.example` to `.env` and fill in. The process **fails fast at startup** with a clear
error if any of these are missing — it never assumes a default connection:

| Var | Required | Example |
|---|---|---|
| `DATABASE_URL` | yes | `postgres://postgres:quoteflow@localhost:5432/quoteflow_rating` |
| `REDIS_URL` | yes | `redis://localhost:6379` |
| `RABBITMQ_URL` | yes | `amqp://guest:guest@localhost:5672` |
| `PORT` | no (default `4000`) | |
| `CORS_ORIGINS` | no | `http://localhost:3000,http://localhost:3001` |
| `LOG_LEVEL` | no (default `info`) | |

## Setup

```bash
npm install
createdb quoteflow_rating   # already created if you used -e POSTGRES_DB=quoteflow_rating above;
                            # otherwise: docker exec quoteflow-postgres createdb -U postgres quoteflow_rating
npm run migrate             # applies src/db/migrations/** (carriers, carrier_config_versions, quotes, carrier_jobs)
npm run seed                # seeds one carrier ("Acme Insurance") + a config version
npm run dev
```

Server listens on `:4000`. `GET /health` for liveness, `GET /internal/health` for the
no-CORS internal namespace, `GET /bundles/manifest.json` for the config/validator bundle
index.

## Quote lifecycle endpoints (steps 1-4 of `schema -> rc1 -> rc2 -> bind`)

| Method & path | Stage | What it does |
|---|---|---|
| `POST /quotes` `{ carrierCode }` | creates | resolves the carrier's latest published config, pre-seeds one empty answers object per page (JSON Patch `add` needs an existing parent), returns `quoteId` |
| `GET /quotes/:quoteId/schemas` | schema | returns the carrier-resolved page/section/field config + the bundle manifest URL the frontend renders from |
| `PATCH /quotes/:quoteId` `[JSON Patch ops]` | -> rc1 | applies `add`/`replace` ops at `/pageKey/fieldKey`, re-validated server-side against the resolved config (never trusts the client), then computes a mock rate |
| `POST /quotes/:quoteId/reports` | -> rc2 | simulates an MVR lookup (fixed delay) and re-rates; 400s if the quote hasn't reached rc1 yet |

| `POST /quotes/:quoteId/bind` | -> bind | 400s unless the quote is at rc2; creates a `carrier_jobs` row and publishes `carrier.bind.requested` to RabbitMQ (this service only produces — the consumer lives in `quoteflow-apps`' automation-worker) |
| `GET /quotes/:quoteId/bind-status` | bind | polls the latest job's status/attempt_count/last_error |
| `GET /quotes/:quoteId/bind-events` | bind | Server-Sent Events stream of the same, pushed live as the worker reports progress |
| `PATCH /internal/carrier-jobs/:jobId` | bind | **server-to-server only, no CORS** — the automation-worker's progress callback; marks the quote `bound` on `succeeded` and pushes an SSE event to any open `bind-events` connection for that quote |

## Config bundler (Pattern 1)

`src/carriers/acme/routeConfigs/**` authors the Acme Auto form as TypeScript: a
Pages → Sections → Fields tree (`base.ts`) plus a `Base → Portal → State` override chain
(`overrides.ts`, `resolve.ts`) that can only change a field's **visibility, options, or
validator** — never duplicate the field. `npm run build:bundles` (or `npm run dev`, which runs
it under a watcher) compiles `routeConfigs/index.ts` with esbuild into a content-hashed
browser ESM chunk under `bundles/configs/acme/`, indexed at `GET /bundles/manifest.json` under
`configs.acme`. The compiled bundle exports real functions (`getAcmeAutoQuoteConfig`,
`resolveRouteConfig`), not just data — the browser resolves the final portal+state config
itself, no extra round trip. `GET /quotes/:quoteId/schemas` serves the DB-stored, customer
portal / no-state baseline (`carrier_config_versions.json_schema`, seeded directly from this
same TS source so it can't drift); full portal/state-aware resolution is what the bundle is
for, exercised end-to-end from `quoteflow-apps`' agent-portal vs. customer-portal.

## Validator bundler (Pattern 2)

`src/validators/*.validator.ts` are pure, browser-safe functions (`validateSsn`,
`validatePhone`) — the same ESLint rule that guards `routeConfigs/**` also guards this
directory (no `fs`, `process.env`, or db imports). A carrier config field references one by
name (`{ validator: 'ssn' }`); `src/validators/index.ts` barrels them into a `validators`
name -> function registry, bundled by the same esbuild pipeline into
`bundles/validators/index-<hash>.js`, indexed at `manifest.json`'s `validators` key.

The payoff: `src/quotes/quote-validation.ts` **imports this exact same module directly**
(unbundled) for server-side re-validation on every `PATCH /quotes/:quoteId` — so tightening
the SSN regex, or adding a carrier-specific phone format, is a one-file, backend-only change.
It takes effect server-side on this service's next deploy, and browser-side for every
frontend the moment it re-fetches the manifest — zero frontend code change, zero frontend
deploy, and the content hash makes serving a stale cached copy structurally impossible.

The tradeoff, worth naming without being asked: this ships **executable code** to the
browser, not just data — real arbitrary logic (checksum digits, cross-field checks) at the
cost of needing to trust that code path (only ever this service's own versioned first-party
bundles, never `eval` of a string). A pure "config is data" rules engine gives up that power
in exchange for a smaller trust surface. Pattern 1 (config) stays data-shaped on purpose;
Pattern 2 (validators) deliberately isn't — picking the right one per situation is the actual
architectural judgment call this sample is demonstrating.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | dev server + bundle watcher, both live-reloading |
| `npm test` | Jest (`*.spec.ts`, co-located with source) |
| `npm run lint` | ESLint, including the validators-must-be-browser-safe rule |
| `npm run migrate` / `migrate:rollback` | Knex migrations |
| `npm run seed` | seeds the Acme Insurance carrier + one config version |
| `npm run build` | TypeScript build to `dist/` |
| `npm run build:bundles` | one-shot esbuild of config + validator bundles |

## Observability

OpenTelemetry (`src/telemetry/otel.ts`, imported first thing in `server.ts` — instrumentation
patches Express/pg/http at `require()` time, so it has to load before those modules do) auto-
instruments incoming HTTP requests and outbound Postgres calls, exported to the console by
default. Point `traceExporter` at an OTLP exporter and a local Jaeger if you want a trace UI;
console output is enough to see the request -> `pg.connect` -> `pg.query` span tree per call.

## Design notes

- [docs/adr/0001-jsonb-answers.md](./docs/adr/0001-jsonb-answers.md) — why quote answers are a
  single JSONB column rather than a normalized table.

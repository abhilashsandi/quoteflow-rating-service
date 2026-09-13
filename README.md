# quoteflow-rating-service

Rating/quoting engine for two fictional carriers, **Acme Insurance** and **Vantage Direct** —
and the piece that ships its own form config and field validators to the browser as versioned,
cache-busted bundles. Portfolio sample; see [CLAUDE.md](./CLAUDE.md) for the architecture
summary and the middleware-ordering trap worth knowing about.

> Status: complete (all 10 build steps, plus a second carrier) — full quote lifecycle, both
> shipped-bundle patterns, RabbitMQ producer + SSE, OpenTelemetry, and this README.

## Two carriers, two very different bind stories

Acme and Vantage share every quote-lifecycle code path in this service (same routes, same
`quote.service.ts`, same JSON Patch validation) — the only thing that differs per carrier is
config: each has its own `routeConfigs/` (form shape) and its own rating/reports adapter pair,
resolved via `src/di/container.ts`. What genuinely differs is what happens **after** this
service hands a bind job to RabbitMQ, in `quoteflow-apps`' `automation-worker`: Acme is bound
by driving a mock carrier *portal* with Playwright (no API to call instead); Vantage is bound
by calling a mock carrier *REST API* directly. This service is deliberately blind to that
distinction — it just publishes `carrier.bind.requested` with a `carrierCode` and lets the
worker decide. See that repo's README for the worker-side half of this story.

## What this demonstrates

Two architecture patterns, both centered on one idea: **the backend ships executable/compiled
frontend logic instead of the frontend hardcoding it.**

1. **Config bundler** — a carrier's form (Pages → Sections → Fields, with a
   Base → Portal → State override chain) is authored as TypeScript here, compiled with esbuild
   into a content-hashed browser ESM chunk, and served immutably. A config change is a
   backend-only redeploy.
2. **Validator bundler** — field-level validation logic (`validateSsn`, `validatePhone`) is a
   pure function shipped the same way, *and* reused directly (unbundled) for server-side
   re-validation — one implementation, two runtimes, and the classic "never trust the client"
   rule enforced without duplicating the rule.

Both are demoed end-to-end against real Postgres/Redis/RabbitMQ, not mocked — see the "Verified
live" notes in each step's commit message for what was actually exercised.

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
npm run seed                # seeds both carriers (Acme, Vantage Direct) + a config version each
npm run dev
```

Server listens on `:4000`. `GET /health` for liveness, `GET /internal/health` for the
no-CORS internal namespace, `GET /bundles/manifest.json` for the config/validator bundle
index.

## Quote lifecycle endpoints (`schema -> rc1 -> rc2 -> bind`)

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

`src/carriers/<code>/routeConfigs/**` authors each carrier's Auto form as TypeScript: a
Pages → Sections → Fields tree (`base.ts`) plus a `Base → Portal → State` override chain
(`overrides.ts`, `resolve.ts`) that can only change a field's **visibility, options, or
validator** — never duplicate the field. Acme's is one page; Vantage's is two (it also
collects vehicle info, including a VIN validated by `src/validators/vin.validator.ts`) — the
schema shape supports either, nothing about it is Acme-specific. `npm run build:bundles` (or
`npm run dev`, which runs it under a watcher) compiles each carrier's `routeConfigs/index.ts`
with esbuild into a content-hashed browser ESM chunk under `bundles/configs/<code>/`, indexed
at `GET /bundles/manifest.json` under `configs.<code>`. The compiled bundle exports real
functions (`getAcmeAutoQuoteConfig`/`getVantageAutoQuoteConfig`, `resolveRouteConfig`), not
just data — the browser resolves the final portal+state config
itself, no extra round trip. `GET /quotes/:quoteId/schemas` serves the DB-stored, customer
portal / no-state baseline (`carrier_config_versions.json_schema`, seeded directly from this
same TS source so it can't drift); full portal/state-aware resolution is what the bundle is
for, exercised end-to-end from `quoteflow-apps`' agent-portal vs. customer-portal.

## Validator bundler (Pattern 2)

`src/validators/*.validator.ts` are pure, browser-safe functions (`validateSsn`,
`validatePhone`, `validateVin`) — the same ESLint rule that guards `routeConfigs/**` also
guards this directory (no `fs`, `process.env`, or db imports). A carrier config field
references one by name (`{ validator: 'ssn' }`); `src/validators/index.ts` barrels them into a
`validators` name -> function registry, bundled by the same esbuild pipeline into
`bundles/validators/index-<hash>.js`, indexed at `manifest.json`'s `validators` key. The
registry is shared across every carrier — Vantage's VIN field uses the same lookup mechanism
Acme's SSN/phone fields do, nothing carrier-specific about the registry itself.

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
| `npm run seed` | seeds both carriers (Acme, Vantage Direct) + one config version each |
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
- [CLAUDE.md](./CLAUDE.md) — architecture summary and the middleware-ordering trap
  (`internalRouter` must be mounted before the CORS-wrapped `apiRouter` in `app.ts`).

## Relationship to `quoteflow-apps`

This service is the system of record and is talked to **only over HTTP** — never a shared
database connection. `quoteflow-apps` (a separate repo/monorepo: `customer-portal` :3000,
`agent-portal` :3001, `bff-gateway` :4100, `automation-worker`) is the frontend/orchestration
layer: it renders the config-driven forms by fetching `/bundles/manifest.json` and this
service's quote endpoints through `bff-gateway`, and its `automation-worker` is the consumer
on the other end of `carrier.bind.requested` — it drives a mock Acme carrier portal via
Playwright *or* calls a mock Vantage Direct REST API directly, picking per job based on
`carrierCode`, and reports progress back through `PATCH /internal/carrier-jobs/:jobId` either
way. Run this service first; `quoteflow-apps`' README assumes it's already up on `:4000`.

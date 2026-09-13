# quoteflow-rating-service

Two fictional carriers — **Acme Insurance** (bound via Playwright against a mock portal) and
**Vantage Direct** (bound via a REST API) — on one rating/quoting engine. Portfolio sample —
prioritize a working end-to-end flow at each step over completeness.

## Architecture in one paragraph

Express + Knex (Postgres, system of record) + Redis (session/cache) + RabbitMQ (produces
`carrier.bind.requested` jobs; a worker in the separate `quoteflow-apps` repo consumes them —
that worker is also where the Playwright-vs-API bind split actually happens; this service
never knows or cares which one a given carrier uses). Carrier-specific behavior is resolved
through InversifyJS by a `carrierId × lineOfBusiness` token, so adding a second carrier is a
config-only change — proven, not just claimed, by Vantage Direct existing alongside Acme with
zero changes to `src/quotes/quote.service.ts` or any route. This service also **compiles and
ships its own frontend**: form/page config (`src/carriers/**/routeConfigs`) and field
validators (`src/validators/**`) are bundled with esbuild into content-hashed, immutable ESM
chunks served at `/bundles`, indexed by `/bundles/manifest.json`. The frontend never
hardcodes form layout or validation logic — it fetches the manifest and dynamically imports
the current bundles.

## The middleware-ordering trap (read this before touching `app.ts`)

`src/app.ts` mounts `internalRouter` (server-to-server routes, no Origin header expected)
**before** the CORS-wrapped `apiRouter`. The CORS config here is deliberately strict — it
rejects any request with no `Origin` header, not just disallowed origins — which is a
realistic "secure by default" pattern teams reach for. If a no-CORS route is ever moved to
after the `cors()` mount, it will start getting rejected. `src/app.spec.ts` guards this
ordering; don't remove those tests, and if you add another server-to-server route, mount it
alongside `internalRouter`, not inside `apiRouter`.

## Two shipped-bundle patterns

1. **Config bundler** (`src/carriers/<code>/routeConfigs/**` → esbuild → `/bundles`, `configs`
   key in the manifest, one entry per carrier): Pages → Sections → Subsections → Fields, with a
   Base → Portal (agent/customer) → State override chain. The carrier-agnostic parts of this
   (the type defs, the resolver) live in `src/carriers/shared/route-config-kit.ts` — each
   carrier's own `routeConfigs/types.ts` and `resolve.ts` just re-export from there; only
   `base.ts` and `overrides.ts` are genuinely carrier-specific. Adding a third carrier means a
   new `src/carriers/<code>/` directory (routeConfigs + a rating/reports adapter pair), a DI
   registration in `src/di/container.ts`, a bundle entry in `scripts/bundle-lib.ts`, and an
   additive (no `.del()`) seed file — see `src/carriers/vantage/` for the reference shape.
2. **Validator bundler** (`src/validators/**` → esbuild → `/bundles`, `validators` key in the
   manifest): pure functions only. `eslint.config.js` has a `no-restricted-imports` /
   `no-restricted-globals` block scoped to `src/validators/**` that forbids `fs`, `path`,
   `process.env`, and db imports — anything imported there has to survive running in a
   browser. Never weaken that rule to "fix" a lint error; fix the import instead.

## Commands

- `npm run dev` — server + bundle watcher, both with live reload.
- `npm test` / `npm run lint` — Jest / ESLint; run both before committing.
- `npm run migrate` / `npm run seed` — Knex migrations and both carriers' seeds (`001_acme_carrier.ts` clears and seeds Acme; `002_vantage_carrier.ts` runs after it and is additive-only — never add a `.del()` there, it would wipe out what 001 just inserted).
- `npm run build:bundles` — one-shot config + validator bundle build.

## Env vars

See `.env.example` — `DATABASE_URL`, `REDIS_URL`, `RABBITMQ_URL` are required and the process
exits with a clear message if any are missing. Never add a docker-compose default fallback
here; failing loudly on missing config is intentional.

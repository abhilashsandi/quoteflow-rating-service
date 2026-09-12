# quoteflow-rating-service

Rating/quoting engine for the fictional carrier **Acme Insurance** — and the piece that ships
its own form config and field validators to the browser as versioned, cache-busted bundles.
Portfolio sample; see [CLAUDE.md](./CLAUDE.md) for the architecture summary and the
middleware-ordering trap worth knowing about.

> Status: skeleton (step 1 of the build). This README grows as each step lands.

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
createdb quoteflow_rating   # or: docker exec quoteflow-postgres createdb -U postgres quoteflow_rating
npm run migrate
npm run seed
npm run dev
```

Server listens on `:4000`. `GET /health` for liveness, `GET /internal/health` for the
no-CORS internal namespace, `GET /bundles/manifest.json` for the config/validator bundle
index.

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

## Design notes

- [docs/adr/0001-jsonb-answers.md](./docs/adr/0001-jsonb-answers.md) — why quote answers are a
  single JSONB column rather than a normalized table.

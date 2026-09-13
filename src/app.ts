import cors from 'cors';
import express, { type Express } from 'express';
import { env } from './config/env';
import { HttpError, errorHandler, notFoundHandler } from './middleware/error-handler';
import { requestContextMiddleware } from './logging/request-context';
import { pinoHttpMiddleware } from './logging/http-logger';
import { healthRouter } from './routes/health.route';
import { internalRouter } from './routes/internal.route';
import { bundlesRouter } from './routes/bundles.route';
import { apiRouter } from './routes/api.router';

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.use(requestContextMiddleware);
  app.use(pinoHttpMiddleware);
  app.use(express.json());

  // Unauthenticated liveness/readiness probe — deliberately outside CORS too, load balancers
  // and container health checks never send an Origin header either.
  app.use(healthRouter);

  // Immutable, content-hashed config/validator bundles — served with long-lived cache headers
  // and permissive CORS: unlike /quotes, these are public, non-credentialed static assets (no
  // per-user data), fetched directly by the browser (not proxied through bff-gateway) via
  // fetch() and dynamic import(), both of which need CORS headers to succeed cross-origin.
  app.use('/bundles', cors({ origin: true }), bundlesRouter);

  // --- Middleware-order trap, on purpose: internal (no-CORS) routes MUST be mounted here,
  // before the `cors()` main API router below. See internal.route.ts for why. ---
  app.use(internalRouter);

  // Deliberately strict: reject requests with no Origin header at all, not just origins
  // outside the allowlist. This is a realistic "more secure by default" config teams reach
  // for — and exactly what makes route-mounting order matter (see internal.route.ts).
  const corsMiddleware = cors({
    origin(origin, callback) {
      if (!origin) {
        callback(new HttpError(403, 'cors_origin_required'));
        return;
      }
      if (env.CORS_ORIGINS.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new HttpError(403, 'cors_origin_not_allowed'));
    },
  });
  // No path prefix: endpoint paths follow the spec exactly (e.g. GET /quotes/:quoteId/schemas).
  app.use(corsMiddleware, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

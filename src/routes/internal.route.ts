import { Router } from 'express';

/**
 * Server-to-server routes only (automation-worker callbacks in quoteflow-apps land here in
 * step 7). MUST be mounted before the CORS-wrapped main API router in app.ts: the `cors`
 * middleware rejects any request with no `Origin` header and short-circuits the chain, so a
 * server-to-server caller (which never sends Origin) would get a CORS rejection instead of
 * reaching this handler if it were mounted after. See app.spec.ts for the regression test.
 */
export const internalRouter = Router();

internalRouter.get('/internal/health', (_req, res) => {
  res.json({ status: 'ok', scope: 'internal' });
});

import { Router } from 'express';
import { quotesRouter } from './quotes.route';

/**
 * All browser-facing, CORS-protected routes are composed here and mounted behind the CORS
 * middleware in app.ts.
 */
export const apiRouter = Router();

apiRouter.get('/ping', (_req, res) => {
  res.json({ pong: true });
});

apiRouter.use(quotesRouter);

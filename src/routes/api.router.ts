import { Router } from 'express';

/**
 * All browser-facing, CORS-protected routes are composed here and mounted behind the CORS
 * middleware in app.ts. Quote lifecycle routes are added to this router in step 4.
 */
export const apiRouter = Router();

apiRouter.get('/ping', (_req, res) => {
  res.json({ pong: true });
});

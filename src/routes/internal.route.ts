import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../middleware/error-handler';
import { CARRIER_JOB_STATUSES } from '../quotes/quote.repository';
import * as bindService from '../quotes/bind.service';

/**
 * Server-to-server routes only (the automation-worker's bind-progress callback in
 * quoteflow-apps lands here). MUST be mounted before the CORS-wrapped main API router in
 * app.ts: the `cors` middleware rejects any request with no `Origin` header and
 * short-circuits the chain, so a server-to-server caller (which never sends Origin) would get
 * a CORS rejection instead of reaching this handler if it were mounted after. See
 * app.spec.ts for the regression test.
 */
export const internalRouter = Router();

internalRouter.get('/internal/health', (_req, res) => {
  res.json({ status: 'ok', scope: 'internal' });
});

const reportProgressSchema = z.object({
  status: z.enum(CARRIER_JOB_STATUSES),
  lastError: z.string().nullable().optional(),
  incrementAttempt: z.boolean().optional(),
});

internalRouter.patch('/internal/carrier-jobs/:jobId', async (req, res, next) => {
  try {
    const body = reportProgressSchema.parse(req.body);
    const job = await bindService.reportBindProgress(req.params.jobId, body);
    res.json({
      jobId: job.id,
      quoteId: job.quote_id,
      status: job.status,
      attemptCount: job.attempt_count,
      lastError: job.last_error,
    });
  } catch (err) {
    next(err instanceof z.ZodError ? new HttpError(400, 'invalid_request', err.issues) : err);
  }
});

import { Router } from 'express';
import type { Operation } from 'fast-json-patch';
import { z } from 'zod';
import { bindQuoteIdMiddleware } from '../logging/request-context';
import { HttpError } from '../middleware/error-handler';
import * as bindService from '../quotes/bind.service';
import { subscribeBindProgress } from '../quotes/bind-events';
import * as quoteService from '../quotes/quote.service';

export const quotesRouter = Router();

quotesRouter.use('/quotes/:quoteId', bindQuoteIdMiddleware);

function toHttpError(err: unknown, code: string): unknown {
  return err instanceof z.ZodError ? new HttpError(400, code, err.issues) : err;
}

const createQuoteSchema = z.object({ carrierCode: z.string().min(1) });

quotesRouter.post('/quotes', async (req, res, next) => {
  try {
    const body = createQuoteSchema.parse(req.body);
    const quote = await quoteService.createQuote(body.carrierCode);
    res.status(201).json({
      quoteId: quote.id,
      funnelStage: quote.funnel_stage,
      currentPageKey: quote.current_page_key,
    });
  } catch (err) {
    next(toHttpError(err, 'invalid_request'));
  }
});

quotesRouter.get('/quotes/:quoteId/schemas', async (req, res, next) => {
  try {
    const { quote, carrier, schema, bundle, rate } = await quoteService.getResolvedSchema(req.params.quoteId);
    res.json({
      quoteId: quote.id,
      funnelStage: quote.funnel_stage,
      carrier: { code: carrier.code, name: carrier.name },
      schema,
      bundle,
      // So a resume link (quoteId with no browser sessionStorage) can hydrate the form from
      // scratch without a second endpoint — see quoteflow-apps' useQuoteSession.
      answers: quote.answers,
      // Recomputed from stored answers (see getResolvedSchema) rather than persisted — null
      // until the quote has left the schema stage. Lets a compare page or page reload show
      // the last-quoted price without a second round trip.
      rate,
    });
  } catch (err) {
    next(err);
  }
});

const jsonPatchOpSchema = z.object({
  op: z.enum(['add', 'replace', 'remove', 'move', 'copy', 'test']),
  path: z.string(),
  value: z.unknown().optional(),
  from: z.string().optional(),
});
const patchBodySchema = z.array(jsonPatchOpSchema).min(1);

quotesRouter.patch('/quotes/:quoteId', async (req, res, next) => {
  try {
    // zod validates the general RFC 6902 op shape (all 6 op kinds, so we can return a
    // targeted 400 for unsupported ones); quoteService.applyAnswerPatch further restricts
    // to add/replace with a required value, which is what fast-json-patch's Operation
    // union actually needs, hence the cast.
    const ops = patchBodySchema.parse(req.body) as unknown as Operation[];
    const { quote, rate } = await quoteService.applyAnswerPatch(req.params.quoteId, ops);
    res.json({ quoteId: quote.id, funnelStage: quote.funnel_stage, answers: quote.answers, rate });
  } catch (err) {
    next(toHttpError(err, 'invalid_json_patch_body'));
  }
});

quotesRouter.post('/quotes/:quoteId/reports', async (req, res, next) => {
  try {
    const { quote, report, rate } = await quoteService.pullReportAndRerate(req.params.quoteId);
    res.json({ quoteId: quote.id, funnelStage: quote.funnel_stage, report, rate });
  } catch (err) {
    next(err);
  }
});

quotesRouter.post('/quotes/:quoteId/bind', async (req, res, next) => {
  try {
    const job = await bindService.requestBind(req.params.quoteId);
    res.status(202).json({
      jobId: job.id,
      quoteId: job.quote_id,
      status: job.status,
      attemptCount: job.attempt_count,
    });
  } catch (err) {
    next(err);
  }
});

quotesRouter.get('/quotes/:quoteId/bind-status', async (req, res, next) => {
  try {
    const job = await bindService.getBindStatus(req.params.quoteId);
    res.json({
      jobId: job.id,
      quoteId: job.quote_id,
      status: job.status,
      attemptCount: job.attempt_count,
      lastError: job.last_error,
      updatedAt: job.updated_at,
    });
  } catch (err) {
    next(err);
  }
});

quotesRouter.get('/quotes/:quoteId/bind-events', (req, res) => {
  const { quoteId } = req.params;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(': connected\n\n');

  const unsubscribe = subscribeBindProgress(quoteId, (event) => {
    res.write(`event: bind-progress\ndata: ${JSON.stringify(event)}\n\n`);
  });

  const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
    res.end();
  });
});

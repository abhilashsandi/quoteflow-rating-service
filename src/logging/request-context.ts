import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export interface RequestContext {
  requestId: string;
  quoteId?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string | undefined) ?? randomUUID();
  res.setHeader('x-request-id', requestId);
  storage.run({ requestId }, () => next());
}

/**
 * Route params aren't populated yet when requestContextMiddleware runs globally, so
 * quote-scoped routes call this once :quoteId is known to enrich the same context object.
 */
export function bindQuoteIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const ctx = getRequestContext();
  if (ctx && typeof req.params.quoteId === 'string') {
    ctx.quoteId = req.params.quoteId;
  }
  next();
}

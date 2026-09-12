import { EventEmitter } from 'node:events';
import type { CarrierJobRow } from './quote.repository';

export interface BindProgressEvent {
  status: CarrierJobRow['status'];
  attemptCount: number;
  lastError: string | null;
  updatedAt: string;
}

/**
 * In-process pub/sub for SSE (GET /quotes/:quoteId/bind-events): when the automation-worker's
 * callback (PATCH /internal/carrier-jobs/:jobId) updates a job's status, bind.service emits
 * here and every open SSE connection for that quoteId gets pushed the update immediately,
 * instead of each client polling bind-status.
 */
const emitter = new EventEmitter();
emitter.setMaxListeners(0);

function eventName(quoteId: string): string {
  return `bind:${quoteId}`;
}

export function emitBindProgress(quoteId: string, event: BindProgressEvent): void {
  emitter.emit(eventName(quoteId), event);
}

export function subscribeBindProgress(
  quoteId: string,
  listener: (event: BindProgressEvent) => void,
): () => void {
  const name = eventName(quoteId);
  emitter.on(name, listener);
  return () => emitter.off(name, listener);
}

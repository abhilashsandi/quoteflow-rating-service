import { emitBindProgress } from './bind-events';
import { HttpError } from '../middleware/error-handler';
import { publishBindRequested } from '../queue/rabbitmq';
import * as repo from './quote.repository';

export async function requestBind(quoteId: string): Promise<repo.CarrierJobRow> {
  const quote = await repo.findQuoteById(quoteId);
  if (!quote) throw new HttpError(404, 'quote_not_found', { quoteId });
  if (quote.funnel_stage !== 'rc2') {
    throw new HttpError(400, 'quote_not_ready', { funnelStage: quote.funnel_stage, required: 'rc2' });
  }

  const carrier = await repo.findCarrierById(quote.carrier_id);
  if (!carrier) throw new HttpError(500, 'carrier_missing_for_quote', { carrierId: quote.carrier_id });

  const job = await repo.insertCarrierJob({ quoteId: quote.id, carrierId: quote.carrier_id });
  await repo.updateQuote(quoteId, { funnel_stage: 'bind' });

  try {
    await publishBindRequested({
      jobId: job.id,
      quoteId: quote.id,
      carrierId: quote.carrier_id,
      carrierCode: carrier.code,
      requestedAt: new Date().toISOString(),
    });
  } catch (err) {
    const failed = await repo.updateCarrierJob(job.id, {
      status: 'failed',
      last_error: `Failed to publish to RabbitMQ: ${(err as Error).message}`,
    });
    emitBindProgress(quoteId, toProgressEvent(failed));
    throw new HttpError(502, 'bind_publish_failed', { message: (err as Error).message });
  }

  emitBindProgress(quoteId, toProgressEvent(job));
  return job;
}

export async function getBindStatus(quoteId: string): Promise<repo.CarrierJobRow> {
  const job = await repo.findLatestCarrierJobByQuoteId(quoteId);
  if (!job) throw new HttpError(404, 'bind_job_not_found', { quoteId });
  return job;
}

function toProgressEvent(job: repo.CarrierJobRow) {
  return {
    status: job.status,
    attemptCount: job.attempt_count,
    lastError: job.last_error,
    updatedAt: job.updated_at instanceof Date ? job.updated_at.toISOString() : new Date().toISOString(),
  };
}

/**
 * Called from the internal (no-CORS) callback route that quoteflow-apps' automation-worker
 * hits to report progress. Advancing carrier_jobs.status to 'succeeded' also marks the quote
 * bound; the worker is the only caller of this path, never a browser.
 */
export async function reportBindProgress(
  jobId: string,
  patch: { status: repo.CarrierJobStatus; lastError?: string | null; incrementAttempt?: boolean },
): Promise<repo.CarrierJobRow> {
  const existing = await repo.findCarrierJobById(jobId);
  if (!existing) throw new HttpError(404, 'bind_job_not_found', { jobId });

  const job = await repo.updateCarrierJob(jobId, {
    status: patch.status,
    last_error: patch.lastError ?? null,
    attempt_count: patch.incrementAttempt ? existing.attempt_count + 1 : existing.attempt_count,
  });

  if (patch.status === 'succeeded') {
    await repo.updateQuote(job.quote_id, { status: 'bound' });
  }

  emitBindProgress(job.quote_id, toProgressEvent(job));
  return job;
}

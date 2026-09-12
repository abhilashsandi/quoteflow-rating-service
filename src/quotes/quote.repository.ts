import { db } from '../db/knex';

export interface QuoteRow {
  id: string;
  carrier_id: string;
  status: string;
  funnel_stage: string;
  current_page_key: string | null;
  answers: Record<string, Record<string, unknown>>;
  created_at: Date;
  updated_at: Date;
}

export interface CarrierRow {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

export interface CarrierConfigVersionRow {
  id: string;
  carrier_id: string;
  version: number;
  json_schema: unknown;
  published_at: Date | null;
}

export function findCarrierByCode(code: string): Promise<CarrierRow | undefined> {
  return db<CarrierRow>('carriers').where({ code }).first();
}

export function findCarrierById(id: string): Promise<CarrierRow | undefined> {
  return db<CarrierRow>('carriers').where({ id }).first();
}

export function findLatestConfigVersion(carrierId: string): Promise<CarrierConfigVersionRow | undefined> {
  return db<CarrierConfigVersionRow>('carrier_config_versions')
    .where({ carrier_id: carrierId })
    .whereNotNull('published_at')
    .orderBy('version', 'desc')
    .first();
}

export async function insertQuote(data: {
  carrierId: string;
  currentPageKey: string | null;
  initialAnswers: Record<string, Record<string, unknown>>;
}): Promise<QuoteRow> {
  const [row] = await db<QuoteRow>('quotes')
    .insert({
      carrier_id: data.carrierId,
      funnel_stage: 'schema',
      current_page_key: data.currentPageKey,
      answers: data.initialAnswers,
    })
    .returning('*');
  if (!row) throw new Error('insertQuote: insert returned no row');
  return row;
}

export function findQuoteById(id: string): Promise<QuoteRow | undefined> {
  return db<QuoteRow>('quotes').where({ id }).first();
}

export async function updateQuote(
  id: string,
  patch: Partial<{
    answers: Record<string, Record<string, unknown>>;
    funnel_stage: string;
    current_page_key: string;
    status: string;
  }>,
): Promise<QuoteRow> {
  const [row] = await db<QuoteRow>('quotes')
    .where({ id })
    .update({ ...patch, updated_at: db.fn.now() })
    .returning('*');
  if (!row) throw new Error(`updateQuote: no quote found for id ${id}`);
  return row;
}

export const CARRIER_JOB_STATUSES = ['pending', 'running', 'succeeded', 'failed', 'dead_lettered'] as const;
export type CarrierJobStatus = (typeof CARRIER_JOB_STATUSES)[number];

export interface CarrierJobRow {
  id: string;
  quote_id: string;
  carrier_id: string;
  status: CarrierJobStatus;
  attempt_count: number;
  last_error: string | null;
  created_at: Date;
  updated_at: Date;
}

export async function insertCarrierJob(data: { quoteId: string; carrierId: string }): Promise<CarrierJobRow> {
  const [row] = await db<CarrierJobRow>('carrier_jobs')
    .insert({ quote_id: data.quoteId, carrier_id: data.carrierId, status: 'pending' })
    .returning('*');
  if (!row) throw new Error('insertCarrierJob: insert returned no row');
  return row;
}

export function findCarrierJobById(id: string): Promise<CarrierJobRow | undefined> {
  return db<CarrierJobRow>('carrier_jobs').where({ id }).first();
}

export function findLatestCarrierJobByQuoteId(quoteId: string): Promise<CarrierJobRow | undefined> {
  return db<CarrierJobRow>('carrier_jobs').where({ quote_id: quoteId }).orderBy('created_at', 'desc').first();
}

export async function updateCarrierJob(
  id: string,
  patch: Partial<{ status: CarrierJobStatus; last_error: string | null; attempt_count: number }>,
): Promise<CarrierJobRow> {
  const [row] = await db<CarrierJobRow>('carrier_jobs')
    .where({ id })
    .update({ ...patch, updated_at: db.fn.now() })
    .returning('*');
  if (!row) throw new Error(`updateCarrierJob: no job found for id ${id}`);
  return row;
}

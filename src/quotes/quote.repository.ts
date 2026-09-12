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
  }>,
): Promise<QuoteRow> {
  const [row] = await db<QuoteRow>('quotes')
    .where({ id })
    .update({ ...patch, updated_at: db.fn.now() })
    .returning('*');
  if (!row) throw new Error(`updateQuote: no quote found for id ${id}`);
  return row;
}

import { applyPatch, type Operation } from 'fast-json-patch';
import { resolveCarrierRatingAdapter, resolveCarrierReportAdapter } from '../di/container';
import { HttpError } from '../middleware/error-handler';
import * as repo from './quote.repository';
import { validatePatchOpsAgainstSchema, type CarrierSchema } from './quote-validation';

const LINE_OF_BUSINESS = 'auto' as const;

function flattenAnswers(answers: Record<string, Record<string, unknown>>): Record<string, unknown> {
  return Object.entries(answers)
    .filter(([pageKey]) => !pageKey.startsWith('__'))
    .reduce<Record<string, unknown>>((acc, [, pageAnswers]) => ({ ...acc, ...pageAnswers }), {});
}

async function loadCarrierAndSchema(carrierId: string): Promise<{
  carrier: repo.CarrierRow;
  schema: CarrierSchema;
}> {
  const carrier = await repo.findCarrierById(carrierId);
  if (!carrier) throw new HttpError(500, 'carrier_missing_for_quote', { carrierId });
  const configVersion = await repo.findLatestConfigVersion(carrier.id);
  if (!configVersion) throw new HttpError(500, 'carrier_config_not_published', { carrierId: carrier.id });
  return { carrier, schema: configVersion.json_schema as CarrierSchema };
}

export async function createQuote(carrierCode: string): Promise<repo.QuoteRow> {
  const carrier = await repo.findCarrierByCode(carrierCode);
  if (!carrier || !carrier.is_active) throw new HttpError(404, 'carrier_not_found', { carrierCode });

  const configVersion = await repo.findLatestConfigVersion(carrier.id);
  if (!configVersion) throw new HttpError(500, 'carrier_config_not_published', { carrierCode });

  const schema = configVersion.json_schema as CarrierSchema;
  const firstPageKey = schema.pages[0]?.key ?? null;
  // Pre-create one empty object per page so JSON Patch `add` ops at /pageKey/fieldKey have
  // an existing parent to add into (RFC 6902 `add` fails against a wholly-missing parent).
  const initialAnswers = Object.fromEntries(schema.pages.map((page) => [page.key, {}]));
  return repo.insertQuote({ carrierId: carrier.id, currentPageKey: firstPageKey, initialAnswers });
}

export async function getResolvedSchema(quoteId: string): Promise<{
  quote: repo.QuoteRow;
  carrier: repo.CarrierRow;
  schema: CarrierSchema;
  bundle: { manifestUrl: string; configKey: string };
}> {
  const quote = await repo.findQuoteById(quoteId);
  if (!quote) throw new HttpError(404, 'quote_not_found', { quoteId });
  const { carrier, schema } = await loadCarrierAndSchema(quote.carrier_id);
  return {
    quote,
    carrier,
    schema,
    bundle: { manifestUrl: '/bundles/manifest.json', configKey: carrier.code },
  };
}

export async function applyAnswerPatch(
  quoteId: string,
  ops: Operation[],
): Promise<{
  quote: repo.QuoteRow;
  rate: ReturnType<ReturnType<typeof resolveCarrierRatingAdapter>['computeMockRate']>;
}> {
  const quote = await repo.findQuoteById(quoteId);
  if (!quote) throw new HttpError(404, 'quote_not_found', { quoteId });
  const { carrier, schema } = await loadCarrierAndSchema(quote.carrier_id);

  validatePatchOpsAgainstSchema(ops, schema);

  const nextAnswers = structuredClone(quote.answers ?? {});
  try {
    applyPatch(nextAnswers, ops, true, true);
  } catch (err) {
    throw new HttpError(400, 'invalid_json_patch', { message: (err as Error).message });
  }

  const nextStage = quote.funnel_stage === 'schema' ? 'rc1' : quote.funnel_stage;
  const updated = await repo.updateQuote(quoteId, { answers: nextAnswers, funnel_stage: nextStage });

  const rate = resolveCarrierRatingAdapter(carrier.code, LINE_OF_BUSINESS).computeMockRate(
    flattenAnswers(nextAnswers),
  );
  return { quote: updated, rate };
}

export async function pullReportAndRerate(quoteId: string): Promise<{
  quote: repo.QuoteRow;
  report: Awaited<ReturnType<ReturnType<typeof resolveCarrierReportAdapter>['pullReport']>>;
  rate: ReturnType<ReturnType<typeof resolveCarrierRatingAdapter>['computeMockRate']>;
}> {
  const quote = await repo.findQuoteById(quoteId);
  if (!quote) throw new HttpError(404, 'quote_not_found', { quoteId });
  if (quote.funnel_stage === 'schema') {
    throw new HttpError(400, 'quote_not_ready', { funnelStage: quote.funnel_stage, required: 'rc1' });
  }
  const { carrier } = await loadCarrierAndSchema(quote.carrier_id);

  const flatAnswers = flattenAnswers(quote.answers ?? {});
  const report = await resolveCarrierReportAdapter(carrier.code, LINE_OF_BUSINESS).pullReport(flatAnswers);

  const nextAnswers = { ...structuredClone(quote.answers ?? {}), __reports: { mvr: report } };
  const nextStage = quote.funnel_stage === 'rc1' ? 'rc2' : quote.funnel_stage;
  const updated = await repo.updateQuote(quoteId, { answers: nextAnswers, funnel_stage: nextStage });

  const rate = resolveCarrierRatingAdapter(carrier.code, LINE_OF_BUSINESS).computeMockRate({
    ...flatAnswers,
    mvrViolations: report.violations,
  });
  return { quote: updated, report, rate };
}

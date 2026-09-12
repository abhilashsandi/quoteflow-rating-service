import type { Knex } from 'knex';
import { getAcmeAutoQuoteConfig } from '../../carriers/acme/routeConfigs';

/**
 * The stored `carrier_config_versions.json_schema` is the customer-portal, no-state
 * resolution of the TS route config in src/carriers/acme/routeConfigs — imported directly
 * here so the DB seed can never drift from that source. Full portal/state-aware resolution
 * (agent overrides, CA options, etc.) happens client-side via the compiled config bundle's
 * exported `resolveRouteConfig`, once step 5 wires up the bundler; this row is the baseline
 * GET /quotes/:quoteId/schemas serves today.
 */
export async function seed(knex: Knex): Promise<void> {
  await knex('carrier_jobs').del();
  await knex('carrier_config_versions').del();
  await knex('quotes').del();
  await knex('carriers').del();

  const [carrier] = await knex('carriers')
    .insert({ name: 'Acme Insurance', code: 'acme', is_active: true })
    .returning(['id']);

  await knex('carrier_config_versions').insert({
    carrier_id: carrier.id,
    version: 1,
    json_schema: JSON.stringify(getAcmeAutoQuoteConfig('customer')),
    published_at: knex.fn.now(),
  });
}

import type { Knex } from 'knex';
import { getVantageAutoQuoteConfig } from '../../carriers/vantage/routeConfigs';

/**
 * Adds Vantage Direct alongside Acme (seeded by 001_acme_carrier.ts, which runs first and
 * already cleared these tables) — deliberately no `.del()` calls here, this seed is additive
 * only. Same "seed straight from the TS route config source" discipline as 001: the stored
 * `json_schema` can't drift from src/carriers/vantage/routeConfigs.
 */
export async function seed(knex: Knex): Promise<void> {
  const [carrier] = await knex('carriers')
    .insert({ name: 'Vantage Direct', code: 'vantage', is_active: true })
    .returning(['id']);

  await knex('carrier_config_versions').insert({
    carrier_id: carrier.id,
    version: 1,
    json_schema: JSON.stringify(getVantageAutoQuoteConfig('customer')),
    published_at: knex.fn.now(),
  });
}

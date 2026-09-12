import type { Knex } from 'knex';

/**
 * Minimal seed config, hand-written to unblock the quote lifecycle endpoints (step 4) ahead
 * of the esbuild config bundler (step 5). Once carriers/acme/routeConfigs/** exists, this
 * JSON should mirror what that TS source compiles to — kept in sync manually for this sample's
 * scope rather than building a publish pipeline that writes this row from the bundler output.
 */
const ACME_AUTO_QUOTE_SCHEMA = {
  pages: [
    {
      key: 'driver-info',
      title: 'Driver Information',
      sections: [
        {
          key: 'personal',
          title: 'Personal Information',
          fields: [
            { key: 'firstName', label: 'First name', type: 'text', required: true },
            { key: 'lastName', label: 'Last name', type: 'text', required: true },
            { key: 'dob', label: 'Date of birth', type: 'date', required: true },
            { key: 'ssn', label: 'Social Security Number', type: 'text', required: true, validator: 'ssn' },
            { key: 'phone', label: 'Phone number', type: 'text', required: true, validator: 'phone' },
          ],
        },
      ],
    },
  ],
};

export async function seed(knex: Knex): Promise<void> {
  await knex('carrier_jobs').del();
  await knex('carrier_config_versions').del();
  await knex('quotes').del();
  await knex('carriers').del();

  const [carrier] = await knex('carriers')
    .insert({ name: 'Acme Insurance', is_active: true })
    .returning(['id']);

  await knex('carrier_config_versions').insert({
    carrier_id: carrier.id,
    version: 1,
    json_schema: JSON.stringify(ACME_AUTO_QUOTE_SCHEMA),
    published_at: knex.fn.now(),
  });
}

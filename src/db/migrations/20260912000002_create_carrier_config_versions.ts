import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('carrier_config_versions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('carrier_id').notNullable().references('id').inTable('carriers').onDelete('CASCADE');
    table.integer('version').notNullable();
    // Page -> Section -> Subsection -> Field config tree, resolved with the
    // Base -> Portal -> State override chain, as compiled by the config bundler.
    table.jsonb('json_schema').notNullable();
    table.timestamp('published_at', { useTz: true });
    table.timestamps(true, true);
    table.unique(['carrier_id', 'version']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('carrier_config_versions');
}

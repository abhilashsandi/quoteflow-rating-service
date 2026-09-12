import type { Knex } from 'knex';

// Explicit funnel stage per the quote lifecycle: schema -> rc1 -> rc2 -> bind.
// See ADR-0001 for why `answers` is a single JSONB column rather than a normalized table.
export const FUNNEL_STAGES = ['schema', 'rc1', 'rc2', 'bind'] as const;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('quotes', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('carrier_id').notNullable().references('id').inTable('carriers').onDelete('RESTRICT');
    table.string('status').notNullable().defaultTo('active');
    table
      .string('funnel_stage')
      .notNullable()
      .defaultTo('schema')
      .checkIn(FUNNEL_STAGES as unknown as string[], 'quotes_funnel_stage_check');
    table.string('current_page_key');
    table.jsonb('answers').notNullable().defaultTo('{}');
    table.timestamps(true, true);
    table.index('carrier_id');
    table.index('funnel_stage');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('quotes');
}

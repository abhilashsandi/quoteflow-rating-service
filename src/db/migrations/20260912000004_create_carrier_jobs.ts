import type { Knex } from 'knex';

export const CARRIER_JOB_STATUSES = ['pending', 'running', 'succeeded', 'failed', 'dead_lettered'] as const;

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('carrier_jobs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('quote_id').notNullable().references('id').inTable('quotes').onDelete('CASCADE');
    table.uuid('carrier_id').notNullable().references('id').inTable('carriers').onDelete('RESTRICT');
    table
      .string('status')
      .notNullable()
      .defaultTo('pending')
      .checkIn(CARRIER_JOB_STATUSES as unknown as string[], 'carrier_jobs_status_check');
    table.integer('attempt_count').notNullable().defaultTo(0);
    table.text('last_error');
    table.timestamps(true, true);
    table.index('quote_id');
    table.index('status');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('carrier_jobs');
}

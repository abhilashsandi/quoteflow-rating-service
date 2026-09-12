import type { Knex } from 'knex';

// Stable, DI-friendly identifier (e.g. "acme") distinct from the DB row's UUID `id` — the
// carrier dispatch factory in src/di needs a compile-time-known token, not a generated one.
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('carriers', (table) => {
    table.string('code').unique();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('carriers', (table) => {
    table.dropColumn('code');
  });
}

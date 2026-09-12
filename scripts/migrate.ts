import { db } from '../src/db/knex';

async function main(): Promise<void> {
  const direction = process.argv[2];
  if (direction === 'rollback') {
    const [, log] = await db.migrate.rollback();
    console.log('Rolled back:', log.length ? log : '(nothing to roll back)');
  } else {
    const [, log] = await db.migrate.latest();
    console.log('Migrated:', log.length ? log : '(already up to date)');
  }
  await db.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

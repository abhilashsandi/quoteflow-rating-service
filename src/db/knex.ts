import path from 'node:path';
import knexFactory, { type Knex } from 'knex';
import { env } from '../config/env';

export const knexConfig: Knex.Config = {
  client: 'pg',
  connection: env.DATABASE_URL,
  migrations: {
    directory: path.join(__dirname, 'migrations'),
    extension: 'ts',
    tableName: 'knex_migrations',
  },
  seeds: {
    directory: path.join(__dirname, 'seeds'),
    extension: 'ts',
  },
};

export const db = knexFactory(knexConfig);

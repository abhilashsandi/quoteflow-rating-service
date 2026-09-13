import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z
    .string({ required_error: 'DATABASE_URL is required (e.g. postgres://user:pass@localhost:5432/db)' })
    .min(1, 'DATABASE_URL must not be empty'),
  REDIS_URL: z
    .string({ required_error: 'REDIS_URL is required (e.g. redis://localhost:6379)' })
    .min(1, 'REDIS_URL must not be empty'),
  RABBITMQ_URL: z
    .string({ required_error: 'RABBITMQ_URL is required (e.g. amqp://guest:guest@localhost:5672)' })
    .min(1, 'RABBITMQ_URL must not be empty'),
  PORT: z.coerce.number().int().positive().default(4000),
  // Includes bff-gateway's own origin (:4100), not just the two frontend ports: bff-gateway
  // proxies quote reads/writes here server-to-server and identifies itself with this Origin
  // header (see quoteflow-apps' RatingServiceClientService) since Node's fetch never sends
  // one on its own, and this router's CORS policy deliberately requires one.
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000,http://localhost:3001,http://localhost:4100')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent']).default('info'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    // Fail fast and loud: this service must never silently fall back to a default connection.
    console.error(
      `Invalid or missing environment configuration:\n${issues}\n\nSee .env.example for the required variables.`,
    );
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
export type Env = typeof env;

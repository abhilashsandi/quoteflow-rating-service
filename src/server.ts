import 'reflect-metadata';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './logging/logger';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`quoteflow-rating-service listening on :${env.PORT}`);
});

function shutdown(signal: string): void {
  logger.info(`${signal} received, shutting down`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

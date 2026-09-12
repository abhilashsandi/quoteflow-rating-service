import pinoHttp from 'pino-http';
import { logger } from './logger';

export const pinoHttpMiddleware = pinoHttp({
  logger,
  autoLogging: { ignore: (req) => req.url === '/health' },
});

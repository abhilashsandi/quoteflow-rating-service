import pino from 'pino';
import { env } from '../config/env';
import { getRequestContext } from './request-context';

export const logger = pino({
  level: env.LOG_LEVEL,
  mixin() {
    const ctx = getRequestContext();
    return ctx ? { requestId: ctx.requestId, quoteId: ctx.quoteId } : {};
  },
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
      : undefined,
});

import amqplib, { type Channel, type ChannelModel } from 'amqplib';
import { env } from '../config/env';
import { logger } from '../logging/logger';

export const BIND_REQUESTED_QUEUE = 'carrier.bind.requested';

let connectionPromise: Promise<{ connection: ChannelModel; channel: Channel }> | undefined;

/**
 * This service only PRODUCES onto carrier.bind.requested — a worker in the separate
 * quoteflow-apps repo consumes it and drives the (mock) carrier portal. Lazily connects once
 * and caches the connection/channel; a broken RABBITMQ_URL surfaces as a 500 on the first
 * bind attempt rather than crashing the whole process at startup.
 */
async function getChannel(): Promise<Channel> {
  connectionPromise ??= (async () => {
    const connection = await amqplib.connect(env.RABBITMQ_URL);
    const channel = await connection.createChannel();
    await channel.assertQueue(BIND_REQUESTED_QUEUE, { durable: true });
    connection.on('close', () => {
      logger.warn('RabbitMQ connection closed');
      connectionPromise = undefined;
    });
    connection.on('error', (err) => {
      logger.error({ err }, 'RabbitMQ connection error');
    });
    return { connection, channel };
  })();

  const { channel } = await connectionPromise;
  return channel;
}

export interface BindRequestedMessage {
  jobId: string;
  quoteId: string;
  carrierId: string;
  carrierCode: string;
  requestedAt: string;
}

export async function publishBindRequested(message: BindRequestedMessage): Promise<void> {
  const channel = await getChannel();
  channel.sendToQueue(BIND_REQUESTED_QUEUE, Buffer.from(JSON.stringify(message)), { persistent: true });
}

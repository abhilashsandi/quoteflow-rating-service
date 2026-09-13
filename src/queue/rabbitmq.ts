import amqplib, { type Channel, type ChannelModel } from 'amqplib';
import { env } from '../config/env';
import { logger } from '../logging/logger';

export const BIND_REQUESTED_QUEUE = 'carrier.bind.requested';

/**
 * Dead-letter topology for carrier.bind.requested. Declared here even though this service
 * only ever produces onto the main queue — quoteflow-apps' automation-worker is the consumer
 * and declares this exact same topology on its side (see its rabbitmq-client.ts). RabbitMQ
 * requires every assertQueue/assertExchange call for a given name to agree on arguments, so
 * whichever service starts first defines the topology and the other must match it exactly;
 * declaring it identically on both sides means either one can boot first.
 */
const BIND_DLX_EXCHANGE = 'carrier.bind.dlx';
const BIND_DLQ_QUEUE = 'carrier.bind.requested.dlq';
const BIND_DLQ_ROUTING_KEY = 'carrier.bind.dead';

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

    await channel.assertExchange(BIND_DLX_EXCHANGE, 'direct', { durable: true });
    await channel.assertQueue(BIND_DLQ_QUEUE, { durable: true });
    await channel.bindQueue(BIND_DLQ_QUEUE, BIND_DLX_EXCHANGE, BIND_DLQ_ROUTING_KEY);

    await channel.assertQueue(BIND_REQUESTED_QUEUE, {
      durable: true,
      arguments: {
        'x-dead-letter-exchange': BIND_DLX_EXCHANGE,
        'x-dead-letter-routing-key': BIND_DLQ_ROUTING_KEY,
      },
    });
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

// Must be the FIRST thing required by server.ts, before express/pg/amqplib are required —
// auto-instrumentation works by monkey-patching those modules at require() time, so starting
// the SDK after they're already loaded silently produces no spans.
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

/**
 * Console exporter by default for this sample — swap in an OTLP exporter pointed at a local
 * Jaeger if you want a UI (see README); spans per incoming HTTP request and per outbound call
 * (Postgres, HTTP) come from @opentelemetry/auto-instrumentations-node, not hand-written spans.
 */
const sdk = new NodeSDK({
  resource: new Resource({ [ATTR_SERVICE_NAME]: 'quoteflow-rating-service' }),
  traceExporter: new ConsoleSpanExporter(),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();

function shutdown(): void {
  sdk.shutdown().catch((err: unknown) => {
    console.error('Error shutting down OpenTelemetry SDK', err);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

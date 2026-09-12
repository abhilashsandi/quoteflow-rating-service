process.env.DATABASE_URL ??= 'postgres://postgres:test@localhost:5432/quoteflow_rating_test';
process.env.REDIS_URL ??= 'redis://localhost:6379';
process.env.RABBITMQ_URL ??= 'amqp://guest:guest@localhost:5672';
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL ??= 'silent';

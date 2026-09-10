import 'dotenv/config';
import { app } from './app.js';
import { redis } from './lib/redis.js';
import { flyerWorker } from './queues/flyerQueue.js';

const port = Number.parseInt(process.env.PORT ?? '3000', 10);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid TCP port');
}

const server = app.listen(port, () => {
  console.info(`Campus backend listening on port ${port}`);
});

const shutdown = async (signal: string) => {
  console.info(`${signal} received, shutting down`);
  await flyerWorker.close();
  await redis.quit();
  server.close(() => process.exit(0));
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

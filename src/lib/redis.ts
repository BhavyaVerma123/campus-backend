import 'dotenv/config';
import IORedis from 'ioredis';

const redisPort = Number.parseInt(process.env.REDIS_PORT ?? '6379', 10);

if (!Number.isInteger(redisPort) || redisPort < 1 || redisPort > 65535) {
  throw new Error('REDIS_PORT must be a valid TCP port');
}

export const redisConnection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: redisPort,
  maxRetriesPerRequest: null,
};

export const redis = new IORedis(redisConnection);

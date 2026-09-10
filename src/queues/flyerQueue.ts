import { Queue, Worker } from 'bullmq';
import { redisConnection } from '../lib/redis.js';

export const flyerQueue = new Queue('flyer-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1_000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export type FlyerJobData = {
  eventId: string;
  flyerUrl: string;
};

export const flyerWorker = new Worker<FlyerJobData>(
  'flyer-processing',
  async (job) => {
    // Replace this with OCR, image validation, or metadata extraction.
    console.info(`Processing flyer ${job.data.flyerUrl} for event ${job.data.eventId}`);
  },
  { connection: redisConnection },
);

flyerWorker.on('completed', (job) => {
  console.info(`Flyer job ${job.id} completed`);
});

flyerWorker.on('failed', (job, error) => {
  console.error(`Flyer job ${job?.id ?? 'unknown'} failed`, error);
});

import { Queue } from "bullmq";
import { config } from "../../config.js";

const redisUrl = new URL(config.REDIS_URL);

export const documentIndexQueue = new Queue("document-processing", {
  connection: {
    host: redisUrl.hostname,
    port: Number(redisUrl.port || 6379),
    username: redisUrl.username || undefined,
    password: redisUrl.password || undefined,
    maxRetriesPerRequest: null,
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
    removeOnComplete: { age: 86_400 },
    removeOnFail: { age: 604_800 },
  },
});

export const documentQueue = documentIndexQueue;

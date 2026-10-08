import { Queue } from "bullmq";
import { config } from "./config.js";

export const documentQueue = new Queue("document-processing", {
    connection: { url: config.REDIS_URL },
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: { age: 3600 * 24 },
        removeOnFail: { age: 3600 * 24 * 7 },
    },
});
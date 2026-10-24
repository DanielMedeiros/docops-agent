import { Worker } from "bullmq";
import { config } from "./config.js";
import { processDocument } from "./processors/document.processor.js";
import { embedDocument } from "./processors/embed-document.processor.js";

const redisUrl = new URL(config.REDIS_URL);

const worker = new Worker(
  "document-processing",
  async (job) => {
    if (job.name === "process-document") {
      await processDocument(job.data);
      return;
    }

    if (job.name === "embed-document") {
      const result = await embedDocument(job.data);
      console.log(
        `Documento ${job.data.documentId} indexado: ${result.indexedChunks} chunks`
      );
      return;
    }

    throw new Error(`Tipo de job desconhecido: ${job.name}`);
  },
  {
    connection: {
      host: redisUrl.hostname,
      port: Number(redisUrl.port || 6379),
      username: redisUrl.username || undefined,
      password: redisUrl.password || undefined,
      maxRetriesPerRequest: null,
    },
    concurrency: 2,
  }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} (${job.name}) concluído.`);
});

worker.on("failed", (job, error) => {
  console.error(
    `Job ${job?.id ?? "?"} (${job?.name ?? "desconhecido"}) falhou:`,
    error.message
  );
});

console.log("Worker iniciado. Aguardando jobs...");

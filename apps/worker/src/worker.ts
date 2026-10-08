import { Worker } from "bullmq";
import { config } from "./config.js";
import { processDocument } from "./processors/document.processor.js";

const worker = new Worker(
    "document-processing",
    async (job) => {
        await processDocument(job.data);
    },
    {
        connection: { url: config.REDIS_URL },
        concurrency: 2,
        autorun: true,
    }
);

worker.on("completed", (job) => {
    console.log(`Job ${job.id} concluído para documento ${job.data.documentId}`);
});

worker.on("failed", (job, error) => {
    console.error(
        `Job ${job?.id ?? "?"} falhou para documento ${job?.data?.documentId ?? "?"}:`,
        error.message
    );
});

console.log("Worker iniciado. Aguardando jobs...");

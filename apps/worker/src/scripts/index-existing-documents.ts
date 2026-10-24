import pg from "pg";
import { Queue } from "bullmq";
import { config } from "../config.js";

const { Client } = pg;

async function main(): Promise<void> {
  const client = new Client({
    connectionString: config.DATABASE_URL,
  });

  const redisUrl = new URL(config.REDIS_URL);

  const queue = new Queue("document-processing", {
    connection: {
      host: redisUrl.hostname,
      port: Number(redisUrl.port || 6379),
      username: redisUrl.username || undefined,
      password: redisUrl.password || undefined,
      maxRetriesPerRequest: null,
    },
  });

  await client.connect();

  try {
    const result = await client.query<{
      id: string;
      organization_id: string;
    }>(
      `
        SELECT d.id, d.organization_id
        FROM documents d
        WHERE d.status = 'completed'
          AND EXISTS (
            SELECT 1
            FROM document_chunks c
            WHERE c.document_id = d.id
              AND c.embedding IS NULL
          )
        ORDER BY d.created_at ASC
      `
    );

    for (const document of result.rows) {
      await queue.add("embed-document", {
        documentId: document.id,
        organizationId: document.organization_id,
      });
    }

    console.log(
      `${result.rows.length} documento(s) enviado(s) para indexação.`
    );
  } finally {
    await client.end();
    await queue.close();
  }
}

main().catch((error) => {
  console.error("Falha ao enfileirar documentos existentes:", error);
  process.exit(1);
});

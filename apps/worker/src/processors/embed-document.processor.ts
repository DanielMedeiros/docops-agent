import pg from "pg";
import { config } from "../config.js";
import { createEmbedding } from "../embeddings.js";

const { Client } = pg;

export interface EmbedDocumentJobData {
  documentId: string;
  organizationId: string;
}

interface ChunkRow {
  id: string;
  content: string;
}

export async function embedDocument(
  data: EmbedDocumentJobData
): Promise<{ indexedChunks: number }> {
  const client = new Client({
    connectionString: config.DATABASE_URL,
  });

  await client.connect();

  try {
    const documentResult = await client.query(
      `
        SELECT id
        FROM documents
        WHERE id = $1
          AND organization_id = $2
          AND status = 'completed'
        LIMIT 1
      `,
      [data.documentId, data.organizationId]
    );

    if (documentResult.rowCount === 0) {
      throw new Error(
        "Documento não encontrado, não pertence à organização ou não está concluído."
      );
    }

    const chunksResult = await client.query<ChunkRow>(
      `
        SELECT id, content
        FROM document_chunks
        WHERE document_id = $1
          AND organization_id = $2
        ORDER BY chunk_index ASC
      `,
      [data.documentId, data.organizationId]
    );

    let indexedChunks = 0;

    for (const chunk of chunksResult.rows) {
      const embedding = await createEmbedding(chunk.content);
      const vectorLiteral = `[${embedding.join(",")}]`;

      await client.query(
        `
          UPDATE document_chunks
          SET embedding = $1::vector
          WHERE id = $2
            AND organization_id = $3
        `,
        [vectorLiteral, chunk.id, data.organizationId]
      );

      indexedChunks++;
    }

    return { indexedChunks };
  } finally {
    await client.end();
  }
}

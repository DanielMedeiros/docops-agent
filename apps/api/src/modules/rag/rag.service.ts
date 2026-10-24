import OpenAI from "openai";
import { config } from "../../config.js";
import { db } from "../../db.js";

const openai = new OpenAI({
  apiKey: config.OPENAI_API_KEY,
});

export interface SearchResult {
  chunkId: string;
  documentId: string;
  documentName: string;
  content: string;
  chunkIndex: number;
  score: number;
}

export async function searchDocuments(
  organizationId: string,
  query: string,
  limit: number
): Promise<SearchResult[]> {
  const embeddingResponse = await openai.embeddings.create({
    model: config.OPENAI_EMBEDDING_MODEL,
    input: query,
    encoding_format: "float",
  });

  const embedding = embeddingResponse.data[0]?.embedding;

  if (!embedding || embedding.length !== 1536) {
    throw new Error("O provedor retornou um embedding inválido.");
  }

  const vectorLiteral = `[${embedding.join(",")}]`;

  const result = await db.query<SearchResult>(
    `
      WITH vector_results AS (
        SELECT
          c.id AS chunk_id,
          c.document_id,
          d.original_name AS document_name,
          c.content,
          c.chunk_index,
          ROW_NUMBER() OVER (
            ORDER BY c.embedding <=> $1::vector
          ) AS rank
        FROM document_chunks c
        INNER JOIN documents d
          ON d.id = c.document_id
        WHERE c.organization_id = $2
          AND c.embedding IS NOT NULL
        ORDER BY c.embedding <=> $1::vector
        LIMIT $3
      ),
      text_results AS (
        SELECT
          c.id AS chunk_id,
          c.document_id,
          d.original_name AS document_name,
          c.content,
          c.chunk_index,
          ROW_NUMBER() OVER (
            ORDER BY ts_rank_cd(
              to_tsvector('simple', c.content),
              websearch_to_tsquery('simple', $4)
            ) DESC
          ) AS rank
        FROM document_chunks c
        INNER JOIN documents d
          ON d.id = c.document_id
        WHERE c.organization_id = $2
          AND to_tsvector('simple', c.content)
              @@ websearch_to_tsquery('simple', $4)
        ORDER BY ts_rank_cd(
          to_tsvector('simple', c.content),
          websearch_to_tsquery('simple', $4)
        ) DESC
        LIMIT $3
      ),
      combined AS (
        SELECT
          chunk_id,
          document_id,
          document_name,
          content,
          chunk_index,
          SUM(1.0 / (60 + rank)) AS fusion_score
        FROM (
          SELECT * FROM vector_results
          UNION ALL
          SELECT * FROM text_results
        ) matches
        GROUP BY
          chunk_id,
          document_id,
          document_name,
          content,
          chunk_index
      )
      SELECT
        chunk_id AS "chunkId",
        document_id AS "documentId",
        document_name AS "documentName",
        content,
        chunk_index AS "chunkIndex",
        fusion_score AS score
      FROM combined
      ORDER BY fusion_score DESC
      LIMIT $3
    `,
    [vectorLiteral, organizationId, limit, query]
  );

  return result.rows;
}

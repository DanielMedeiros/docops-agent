ALTER TABLE documents
  ALTER COLUMN uploaded_by DROP NOT NULL;

CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw_idx
  ON document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS document_chunks_content_fts_idx
  ON document_chunks
  USING gin (to_tsvector('simple', content));

CREATE INDEX IF NOT EXISTS document_chunks_org_document_idx
  ON document_chunks (organization_id, document_id);

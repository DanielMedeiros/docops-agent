import { randomUUID } from "node:crypto";
import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { db } from "../../db.js";
import { config } from "../../config.js";
import { documentQueue } from "../../../../worker/src/queue.js";
import type { UploadDocumentInput } from "./documents.schemas.js";

export interface DocumentRow {
    id: string;
    organization_id: string;
    uploaded_by: string;
    original_name: string;
    stored_name: string;
    mime_type: string;
    file_size_bytes: number | string;
    status: string;
    error_message: string | null;
    metadata: Record<string, unknown>;
    created_at: Date;
    updated_at: Date;
}

export interface DocumentRecord {
    id: string;
    organizationId: string;
    uploadedBy: string;
    originalName: string;
    storedName: string;
    mimeType: string;
    fileSizeBytes: number;
    status: string;
    errorMessage: string | null;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

function toDocumentRecord(row: DocumentRow): DocumentRecord {
    return {
        id: row.id,
        organizationId: row.organization_id,
        uploadedBy: row.uploaded_by,
        originalName: row.original_name,
        storedName: row.stored_name,
        mimeType: row.mime_type,
        fileSizeBytes: Number(row.file_size_bytes),
        status: row.status,
        errorMessage: row.error_message,
        metadata: row.metadata,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

export async function uploadDocument(
    input: UploadDocumentInput,
    organizationId: string,
    userId: string
): Promise<DocumentRecord> {
    const ext = input.file.filename.split(".").pop() ?? "bin";
    const storedName = `${randomUUID()}.${ext}`;

    await mkdir(config.UPLOAD_DIR, { recursive: true });
    const filePath = resolve(config.UPLOAD_DIR, storedName);
    await writeFile(filePath, input.file.data);

    const result = await db.query<DocumentRow>(
        `INSERT INTO documents (
      organization_id, uploaded_by, original_name, stored_name,
      mime_type, file_size_bytes, status, metadata
    ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
    RETURNING *`,
        [
            organizationId,
            userId,
            input.file.filename,
            storedName,
            input.file.mimetype,
            input.file.data.length,
            JSON.stringify({}),
        ]
    );

    const document = toDocumentRecord(result.rows[0]);

    await documentQueue.add("process-document", {
        documentId: document.id,
        storedName: document.storedName,
        mimeType: document.mimeType,
    });

    return document;
}

export async function listDocuments(
    organizationId: string
): Promise<DocumentRecord[]> {
    const result = await db.query<DocumentRow>(
        `SELECT * FROM documents
     WHERE organization_id = $1
     ORDER BY created_at DESC`,
        [organizationId]
    );

    return result.rows.map(toDocumentRecord);
}

export async function getDocument(
    documentId: string,
    organizationId: string
): Promise<DocumentRecord | null> {
    const result = await db.query<DocumentRow>(
        `SELECT * FROM documents
     WHERE id = $1 AND organization_id = $2
     LIMIT 1`,
        [documentId, organizationId]
    );

    return result.rows[0] ? toDocumentRecord(result.rows[0]) : null;
}

export async function getDocumentChunks(
    documentId: string,
    organizationId: string
): Promise<
    Array<{
        id: string;
        chunkIndex: number;
        content: string;
        tokenCount: number;
        metadata: Record<string, unknown>;
    }>
> {
    const result = await db.query<{
        id: string;
        chunk_index: number;
        content: string;
        token_count: number;
        metadata: Record<string, unknown>;
    }>(
        `SELECT id, chunk_index, content, token_count, metadata
     FROM document_chunks
     WHERE document_id = $1 AND organization_id = $2
     ORDER BY chunk_index ASC`,
        [documentId, organizationId]
    );

    return result.rows.map((row) => ({
        id: row.id,
        chunkIndex: row.chunk_index,
        content: row.content,
        tokenCount: row.token_count,
        metadata: row.metadata,
    }));
}
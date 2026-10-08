import { readFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";
import { config } from "../config.js";

const { Client } = pg;

export interface DocumentJobData {
    documentId: string;
    storedName: string;
    mimeType: string;
}

interface Chunk {
    index: number;
    content: string;
    tokenCount: number;
}

const CHUNK_SIZE_CHARS = 1000;
const CHUNK_OVERLAP_CHARS = 200;

function splitIntoChunks(text: string): Chunk[] {
    const chunks: Chunk[] = [];
    let index = 0;
    let start = 0;

    while (start < text.length) {
        const end = Math.min(start + CHUNK_SIZE_CHARS, text.length);
        const content = text.slice(start, end).trim();

        if (content.length > 0) {
            const tokenCount = Math.ceil(content.length / 4);
            chunks.push({ index, content, tokenCount });
            index++;
        }

        start = end - CHUNK_OVERLAP_CHARS;
        if (start < 0) start = 0;
        if (end >= text.length) break;
    }

    return chunks;
}

async function extractText(
    storedName: string,
    mimeType: string
): Promise<string> {
    const filePath = resolve(config.UPLOAD_DIR, storedName);
    const raw = await readFile(filePath, "utf8");

    if (mimeType === "application/pdf") {
        return extractPdfText(raw);
    }

    return raw;
}

function extractPdfText(raw: string): string {
    const lines: string[] = [];
    let inText = false;

    for (const line of raw.split(/\r?\n/)) {
        if (line.includes("BT")) inText = true;
        if (line.includes("ET")) inText = false;
        if (inText && line.includes("Tj")) {
            const match = line.match(/|$([^)]*)$|/);
            if (match) lines.push(match[1]);
        }
    }

    return lines.length > 0 ? lines.join(" ") : raw;
}

export async function processDocument(
    jobData: DocumentJobData
): Promise<void> {
    const client = new Client({
        connectionString: config.DATABASE_URL,
    });

    await client.connect();

    try {
        await client.query("BEGIN");

        await client.query(
            `UPDATE documents SET status = 'processing', updated_at = NOW() WHERE id = $1`,
            [jobData.documentId]
        );

        const text = await extractText(jobData.storedName, jobData.mimeType);

        const chunks = splitIntoChunks(text);

        const docResult = await client.query<{
            organization_id: string;
        }>(
            `SELECT organization_id FROM documents WHERE id = $1`,
            [jobData.documentId]
        );

        const organizationId = docResult.rows[0].organization_id;

        for (const chunk of chunks) {
            await client.query(
                `INSERT INTO document_chunks (
          document_id, organization_id, chunk_index, content, token_count
        ) VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (document_id, chunk_index) DO NOTHING`,
                [
                    jobData.documentId,
                    organizationId,
                    chunk.index,
                    chunk.content,
                    chunk.tokenCount,
                ]
            );
        }

        await client.query(
            `UPDATE documents SET status = 'completed', updated_at = NOW() WHERE id = $1`,
            [jobData.documentId]
        );

        await client.query("COMMIT");

        const filePath = resolve(config.UPLOAD_DIR, jobData.storedName);
        await unlink(filePath).catch(() => { });

        console.log(
            `Documento ${jobData.documentId} processado: ${chunks.length} chunks`
        );
    } catch (error) {
        await client.query("ROLLBACK");

        const message =
            error instanceof Error ? error.message : "Erro desconhecido";

        await client.query(
            `UPDATE documents SET status = 'failed', error_message = $2, updated_at = NOW() WHERE id = $1`,
            [jobData.documentId, message]
        );

        throw error;
    } finally {
        await client.end();
    }
}
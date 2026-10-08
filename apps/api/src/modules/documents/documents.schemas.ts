import { z } from "zod";

export const ALLOWED_MIME_TYPES = [
    "application/pdf",
    "text/markdown",
    "text/plain",
    "text/html",
] as const;

export const uploadDocumentSchema = z.object({
    file: z.object({
        filename: z.string().min(1).max(500),
        mimetype: z.enum(ALLOWED_MIME_TYPES),
        data: z.instanceof(Buffer),
    }),
});

export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
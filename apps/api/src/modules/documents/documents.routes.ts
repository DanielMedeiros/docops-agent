import type { FastifyInstance } from "fastify";
import { uploadDocumentSchema } from "./documents.schemas.js";
import {
    uploadDocument,
    listDocuments,
    getDocument,
    getDocumentChunks,
} from "./documents.service.js";
import { forbidden, notFound } from "../../errors.js";
import { roleHasPermission } from "../../permissions.js";

export async function documentsRoutes(app: FastifyInstance): Promise<void> {
    app.post(
        "/",
        {
            preHandler: [
                app.authenticate,
                async (request) => {
                    const user = await app.getAuthUser(request);
                    if (!roleHasPermission(user.role, "documents:create")) {
                        throw forbidden("Permissão documents:create necessária");
                    }
                },
            ],
        },
        async (request, reply) => {
            const file = await request.file();

            if (!file) {
                return reply.code(400).send({
                    error: {
                        code: "FILE_REQUIRED",
                        message: "Nenhum arquivo enviado",
                    },
                });
            }

            const input = uploadDocumentSchema.parse({
                file: {
                    filename: file.filename,
                    mimetype: file.mimetype,
                    data: await file.toBuffer(),
                },
            });

            const document = await uploadDocument(
                input,
                request.user.organizationId,
                request.user.sub
            );

            return reply.code(201).send({ data: { document } });
        }
    );

    app.get(
        "/",
        {
            preHandler: [
                app.authenticate,
                async (request) => {
                    const user = await app.getAuthUser(request);
                    if (!roleHasPermission(user.role, "documents:read")) {
                        throw forbidden("Permissão documents:read necessária");
                    }
                },
            ],
        },
        async (request) => {
            const documents = await listDocuments(
                request.user.organizationId
            );

            return { data: { documents } };
        }
    );

    app.get(
        "/:documentId",
        {
            preHandler: [
                app.authenticate,
                async (request) => {
                    const user = await app.getAuthUser(request);
                    if (!roleHasPermission(user.role, "documents:read")) {
                        throw forbidden("Permissão documents:read necessária");
                    }
                },
            ],
        },
        async (request) => {
            const params = request.params as { documentId: string };
            const document = await getDocument(
                params.documentId,
                request.user.organizationId
            );

            if (!document) {
                throw notFound("Documento não encontrado");
            }

            return { data: { document } };
        }
    );

    app.get(
        "/:documentId/chunks",
        {
            preHandler: [
                app.authenticate,
                async (request) => {
                    const user = await app.getAuthUser(request);
                    if (!roleHasPermission(user.role, "documents:read")) {
                        throw forbidden("Permissão documents:read necessária");
                    }
                },
            ],
        },
        async (request) => {
            const params = request.params as { documentId: string };
            const document = await getDocument(
                params.documentId,
                request.user.organizationId
            );

            if (!document) {
                throw notFound("Documento não encontrado");
            }

            const chunks = await getDocumentChunks(
                params.documentId,
                request.user.organizationId
            );

            return { data: { chunks } };
        }
    );
}
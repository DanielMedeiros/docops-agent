import Fastify, {
    type FastifyInstance,
    type FastifyReply,
    type FastifyRequest,
} from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import multipart from "@fastify/multipart";
import { ZodError } from "zod";
import { config } from "./config.js";
import { db, checkDatabaseConnection } from "./db.js";
import { AppError, unauthorized } from "./errors.js";
import { findUserById } from "./modules/auth/auth.service.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { usersRoutes } from "./modules/users/users.routes.js";
import { documentsRoutes } from "./modules/documents/documents.routes.js";

export async function buildApp(): Promise<FastifyInstance> {
    const app = Fastify({
        logger: { level: config.LOG_LEVEL },
    });

    await app.register(cors, {
        origin:
            config.CORS_ORIGIN === "*"
                ? true
                : config.CORS_ORIGIN.split(",").map((o) => o.trim()),
    });

    await app.register(helmet);

    await app.register(multipart, {
        limits: {
            fileSize: 50 * 1024 * 1024, // 50MB
        },
    });

    await app.register(jwt, {
        secret: config.JWT_SECRET,
        sign: { expiresIn: config.JWT_EXPIRES_IN },
    });

    app.decorate(
        "authenticate",
        async function authenticate(
            request: FastifyRequest,
            _reply: FastifyReply
        ): Promise<void> {
            try {
                await request.jwtVerify();
            } catch {
                throw unauthorized("Token ausente, inválido ou expirado", "INVALID_TOKEN");
            }
        }
    );

    app.decorate(
        "getAuthUser",
        async function getAuthUser(request: FastifyRequest) {
            const user = await findUserById(request.user.sub);
            if (!user || !user.isActive) {
                throw unauthorized("Usuário não encontrado ou inativo", "USER_NOT_AVAILABLE");
            }
            request.authUser = {
                id: user.id,
                organizationId: user.organizationId,
                name: user.name,
                email: user.email,
                role: user.role,
                isActive: user.isActive,
            };
            return request.authUser;
        }
    );

    app.get("/health", async () => ({
        status: "ok",
        service: "docops-api",
        timestamp: new Date().toISOString(),
    }));

    app.get("/health/database", async () => {
        await checkDatabaseConnection();
        return { status: "ok", database: "connected" };
    });

    app.register(authRoutes, { prefix: "/auth" });
    app.register(usersRoutes, { prefix: "/users" });
    app.register(documentsRoutes, { prefix: "/documents" });

    app.setErrorHandler((error, request, reply) => {
        if (error instanceof ZodError) {
            return reply.code(400).send({
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Os dados informados são inválidos",
                    details: error.flatten(),
                },
            });
        }

        if (error instanceof AppError) {
            return reply.code(error.statusCode).send({
                error: {
                    code: error.code,
                    message: error.message,
                    details: error.details,
                },
            });
        }

        request.log.error(error);

        return reply.code(500).send({
            error: {
                code: "INTERNAL_ERROR",
                message: "Erro interno do servidor",
            },
        });
    });

    app.addHook("onClose", async () => {
        await db.end();
    });

    return app;
}
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import {
    registerSchema,
    loginSchema
} from "./auth.schemas.js";
import {
    findUserById,
    loginUser,
    registerUser
} from "./auth.service.js";
import { unauthorized } from "../../errors.js";

export async function authRoutes(
    app: FastifyInstance
): Promise<void> {
    app.post("/register", async (request, reply) => {
        const input = registerSchema.parse(request.body);

        const result = await registerUser(input, (payload) =>
            app.jwt.sign(payload)
        );

        return reply.code(201).send({
            data: result
        });
    });

    app.post("/login", async (request, reply) => {
        const input = loginSchema.parse(request.body);

        const result = await loginUser(input, (payload) =>
            app.jwt.sign(payload)
        );

        return reply.code(200).send({
            data: result
        });
    });

    app.get(
        "/me",
        {
            preHandler: [app.authenticate]
        },
        async (request, reply) => {
            const user = await findUserById(request.user.sub);

            if (!user || !user.isActive) {
                throw unauthorized();
            }

            return reply.code(200).send({
                data: {
                    user
                }
            });
        }
    );
}
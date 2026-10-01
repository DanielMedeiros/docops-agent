import type { FastifyInstance } from "fastify";
import { db } from "../../db.js";
import {
    forbidden,
    notFound
} from "../../errors.js";
import {
    roleHasPermission,
    type Permission
} from "../../permissions.js";

function requirePermission(
    permission: Permission
) {
    return async function permissionGuard(
        request: {
            authUser: {
                role: "admin" | "manager" | "member";
            };
        }
    ): Promise<void> {
        const hasPermission = roleHasPermission(
            request.authUser.role,
            permission
        );

        if (!hasPermission) {
            throw forbidden(
                `A permissão ${permission} é necessária`,
                "MISSING_PERMISSION"
            );
        }
    };
}

export async function usersRoutes(
    app: FastifyInstance
): Promise<void> {
    app.get(
        "/",
        {
            preHandler: [
                app.authenticate,
                async (request) => {
                    const user = await app.getAuthUser(request);
                    await requirePermission("users:read")({
                        authUser: user
                    });
                }
            ]
        },
        async (request) => {
            const result = await db.query<{
                id: string;
                name: string;
                email: string;
                role: "admin" | "manager" | "member";
                is_active: boolean;
                created_at: Date;
            }>(
                `
          SELECT
            id,
            name,
            email,
            role,
            is_active,
            created_at
          FROM users
          WHERE organization_id = $1
          ORDER BY created_at ASC
        `,
                [request.user.organizationId]
            );

            return {
                data: {
                    users: result.rows
                }
            };
        }
    );

    app.get(
        "/:userId",
        {
            preHandler: [
                app.authenticate,
                async (request) => {
                    const user = await app.getAuthUser(request);
                    await requirePermission("users:read")({
                        authUser: user
                    });
                }
            ]
        },
        async (request) => {
            const params = request.params as {
                userId: string;
            };

            const result = await db.query<{
                id: string;
                name: string;
                email: string;
                role: "admin" | "manager" | "member";
                is_active: boolean;
                created_at: Date;
            }>(
                `
          SELECT
            id,
            name,
            email,
            role,
            is_active,
            created_at
          FROM users
          WHERE id = $1
            AND organization_id = $2
          LIMIT 1
        `,
                [
                    params.userId,
                    request.user.organizationId
                ]
            );

            const user = result.rows[0];

            if (!user) {
                throw notFound(
                    "Usuário não encontrado",
                    "USER_NOT_FOUND"
                );
            }

            return {
                data: {
                    user
                }
            };
        }
    );
}
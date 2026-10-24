import type { FastifyInstance } from "fastify";
import { searchSchema } from "./rag.schemas.js";
import { searchDocuments } from "./rag.service.js";
import { forbidden } from "../../errors.js";
import { roleHasPermission } from "../../permissions.js";

export async function ragRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/search",
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
    async (request, reply) => {
      const input = searchSchema.parse(request.body);

      const results = await searchDocuments(
        request.user.organizationId,
        input.query,
        input.limit
      );

      return reply.code(200).send({
        data: {
          query: input.query,
          results,
        },
      });
    }
  );
}

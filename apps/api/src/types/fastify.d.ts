import "@fastify/jwt";
import "fastify";

declare module "@fastify/jwt" {
    interface FastifyJWT {
        payload: {
            sub: string;
            organizationId: string;
            role: "admin" | "manager" | "member";
            email: string;
        };

        user: {
            sub: string;
            organizationId: string;
            role: "admin" | "manager" | "member";
            email: string;
        };
    }
}

declare module "fastify" {
    interface FastifyRequest {
        authUser: {
            id: string;
            organizationId: string;
            name: string;
            email: string;
            role: "admin" | "manager" | "member";
            isActive: boolean;
        };
    }

    interface FastifyInstance {
        authenticate: (
            request: FastifyRequest,
            reply: FastifyReply
        ) => Promise<void>;

        getAuthUser: (
            request: FastifyRequest
        ) => Promise<FastifyRequest["authUser"]>;
    }
}
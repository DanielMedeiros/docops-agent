import "dotenv/config";
import { z } from "zod";

const configSchema = z.object({
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),

    API_HOST: z.string().default("0.0.0.0"),

    API_PORT: z.coerce.number().int().positive().default(3000),

    DATABASE_URL: z.string().min(1),

    JWT_SECRET: z
        .string()
        .min(32, "JWT_SECRET deve possuir pelo menos 32 caracteres"),

    JWT_EXPIRES_IN: z.string().default("8h"),

    CORS_ORIGIN: z.string().default("*"),

    LOG_LEVEL: z
        .enum(["fatal", "error", "warn", "info", "debug", "trace"])
        .default("info")
});

const parsedConfig = configSchema.safeParse(process.env);

if (!parsedConfig.success) {
    console.error("Configuração inválida:");

    for (const [key, errors] of Object.entries(
        parsedConfig.error.flatten().fieldErrors
    )) {
        console.error(`- ${key}: ${errors?.join(", ")}`);
    }

    process.exit(1);
}

export const config = parsedConfig.data;
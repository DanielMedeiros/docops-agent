import dotenv from "dotenv";
import { resolve, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = resolve(__dirname, "../../../");

// Carrega .env do diretório atual e também da raiz do monorepo
dotenv.config();
dotenv.config({ path: resolve(rootDir, ".env") });

const configSchema = z.object({
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),

    API_HOST: z.string().default("0.0.0.0"),

    API_PORT: z.coerce.number().int().positive().default(3000),

    DATABASE_URL: z.string().min(1),

    REDIS_URL: z.string().default("redis://localhost:6379"),

    JWT_SECRET: z
        .string()
        .min(32, "JWT_SECRET deve possuir pelo menos 32 caracteres"),

    JWT_EXPIRES_IN: z.string().default("8h"),

    CORS_ORIGIN: z.string().default("*"),

    UPLOAD_DIR: z.string().default("./uploads"),

    OPENAI_API_KEY: z.string().min(1),

    OPENAI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),

    OPENAI_CHAT_MODEL: z.string().default("gpt-4o-mini"),

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

export const config = {
    ...parsedConfig.data,
    UPLOAD_DIR: isAbsolute(parsedConfig.data.UPLOAD_DIR)
        ? parsedConfig.data.UPLOAD_DIR
        : resolve(rootDir, parsedConfig.data.UPLOAD_DIR),
};
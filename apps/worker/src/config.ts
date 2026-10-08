import { config as loadEnv } from "dotenv";
import { resolve, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const rootDir = resolve(__dirname, "../../../");
const rootEnvPath = resolve(rootDir, ".env");

loadEnv({ path: rootEnvPath });

const configSchema = z.object({
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().min(1),
    UPLOAD_DIR: z.string().default("./uploads"),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

const parsedConfig = configSchema.safeParse(process.env);

if (!parsedConfig.success) {
    console.error("Configuração inválida no worker:");
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
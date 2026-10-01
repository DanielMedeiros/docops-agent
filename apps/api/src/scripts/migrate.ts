import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config } from "../config.js";

const { Client } = pg;

async function migrate(): Promise<void> {
    const client = new Client({
        connectionString: config.DATABASE_URL
    });

    await client.connect();

    try {
        const __dirname = fileURLToPath(new URL(".", import.meta.url));
        const rootDirectory = resolve(__dirname, "../../../..");
        const migrationPath = resolve(
            rootDirectory,
            "migrations/001_initial_schema.sql"
        );

        const migration = await readFile(migrationPath, "utf8");

        await client.query(migration);

        console.log("Migração executada com sucesso.");
    } finally {
        await client.end();
    }
}

migrate().catch((error) => {
    console.error("Falha ao executar migração:", error);
    process.exit(1);
});
import { readFile, readdir } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config } from "../config.js";

const { Client } = pg;

async function migrate(): Promise<void> {
    const client = new Client({
        connectionString: config.DATABASE_URL,
    });

    await client.connect();

    try {
        const currentFilePath = fileURLToPath(import.meta.url);
        const projectRoot = resolve(currentFilePath, "../../../../..");
        const migrationsDir = resolve(projectRoot, "migrations");

        const files = await readdir(migrationsDir);
        const sqlFiles = files
            .filter((f) => extname(f) === ".sql")
            .sort();

        if (sqlFiles.length === 0) {
            console.log("Nenhuma migração encontrada.");
            return;
        }

        for (const file of sqlFiles) {
            const filePath = resolve(migrationsDir, file);
            const sql = await readFile(filePath, "utf8");

            console.log(`Executando migração: ${file}`);
            await client.query(sql);
            console.log(`Migração ${file} concluída.`);
        }

        console.log("Todas as migrações foram executadas.");
    } finally {
        await client.end();
    }
}

migrate().catch((error) => {
    console.error("Falha ao executar migração:", error);
    process.exit(1);
});
import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

export const db = new Pool({
    connectionString: config.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000
});

db.on("error", (error) => {
    console.error("Erro inesperado no pool do PostgreSQL:", error);
});

export async function checkDatabaseConnection(): Promise<void> {
    const client = await db.connect();

    try {
        await client.query("SELECT 1");
    } finally {
        client.release();
    }
}
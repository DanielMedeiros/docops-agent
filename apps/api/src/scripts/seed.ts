import bcrypt from "bcryptjs";
import { db } from "../db.js";

async function seed(): Promise<void> {
    const organizationName = "DocOps Demo";
    const organizationSlug = "docops-demo";
    const userName = "Administrador";
    const userEmail = "admin@docops.local";
    const userPassword = "Admin123456!";
    const passwordHash = await bcrypt.hash(userPassword, 12);

    const client = await db.connect();

    try {
        await client.query("BEGIN");

        const organizationResult = await client.query<{
            id: string;
        }>(
            `
        INSERT INTO organizations (name, slug)
        VALUES ($1, $2)
        ON CONFLICT (slug)
        DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `,
            [organizationName, organizationSlug]
        );

        const organizationId = organizationResult.rows[0].id;

        await client.query(
            `
        INSERT INTO users (
          organization_id,
          name,
          email,
          password_hash,
          role
        )
        VALUES ($1, $2, $3, $4, 'admin')
        ON CONFLICT (organization_id, email)
        DO UPDATE SET
          name = EXCLUDED.name,
          password_hash = EXCLUDED.password_hash,
          role = 'admin',
          is_active = TRUE
      `,
            [
                organizationId,
                userName,
                userEmail,
                passwordHash
            ]
        );

        await client.query("COMMIT");

        console.log("Seed executado com sucesso.");
        console.log(`E-mail: ${userEmail}`);
        console.log(`Senha: ${userPassword}`);
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
        await db.end();
    }
}

seed().catch((error) => {
    console.error("Falha ao executar seed:", error);
    process.exit(1);
});
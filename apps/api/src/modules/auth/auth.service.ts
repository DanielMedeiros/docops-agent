import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { db } from "../../db.js";
import {
    conflict,
    unauthorized
} from "../../errors.js";
import type {
    LoginInput,
    RegisterInput
} from "./auth.schemas.js";

const PASSWORD_SALT_ROUNDS = 12;

export interface AuthUser {
    id: string;
    organizationId: string;
    organizationName: string;
    name: string;
    email: string;
    role: "admin" | "manager" | "member";
    isActive: boolean;
}

export interface AuthResult {
    user: AuthUser;
    accessToken: string;
}

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

function toAuthUser(row: {
    user_id: string;
    organization_id: string;
    organization_name: string;
    name: string;
    email: string;
    role: "admin" | "manager" | "member";
    is_active: boolean;
}): AuthUser {
    return {
        id: row.user_id,
        organizationId: row.organization_id,
        organizationName: row.organization_name,
        name: row.name,
        email: row.email,
        role: row.role,
        isActive: row.is_active
    };
}

export async function registerUser(
    input: RegisterInput,
    signToken: (payload: {
        sub: string;
        organizationId: string;
        role: "admin" | "manager" | "member";
        email: string;
    }) => string
): Promise<AuthResult> {
    const email = normalizeEmail(input.email);
    const client = await db.connect();

    try {
        await client.query("BEGIN");

        const existingUser = await client.query(
            `
        SELECT id
        FROM users
        WHERE LOWER(email) = $1
        LIMIT 1
      `,
            [email]
        );

        if (existingUser.rowCount && existingUser.rowCount > 0) {
            throw conflict(
                "Já existe um usuário com este e-mail",
                "EMAIL_ALREADY_EXISTS"
            );
        }

        const organizationSlug = `${input.organizationName
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "")}-${randomUUID().slice(0, 8)}`;

        const organizationResult = await client.query<{
            id: string;
            name: string;
        }>(
            `
        INSERT INTO organizations (name, slug)
        VALUES ($1, $2)
        RETURNING id, name
      `,
            [input.organizationName.trim(), organizationSlug]
        );

        const organization = organizationResult.rows[0];

        const passwordHash = await bcrypt.hash(
            input.password,
            PASSWORD_SALT_ROUNDS
        );

        const userResult = await client.query<{
            id: string;
            organization_id: string;
            name: string;
            email: string;
            role: "admin" | "manager" | "member";
            is_active: boolean;
        }>(
            `
        INSERT INTO users (
          organization_id,
          name,
          email,
          password_hash,
          role
        )
        VALUES ($1, $2, $3, $4, 'admin')
        RETURNING
          id,
          organization_id,
          name,
          email,
          role,
          is_active
      `,
            [
                organization.id,
                input.name.trim(),
                email,
                passwordHash
            ]
        );

        const user = userResult.rows[0];

        await client.query(
            `
        INSERT INTO audit_logs (
          organization_id,
          user_id,
          action,
          resource_type,
          resource_id,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `,
            [
                organization.id,
                user.id,
                "auth.register",
                "user",
                user.id,
                JSON.stringify({
                    organizationName: organization.name
                })
            ]
        );

        await client.query("COMMIT");

        const authUser: AuthUser = {
            id: user.id,
            organizationId: user.organization_id,
            organizationName: organization.name,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.is_active
        };

        const accessToken = signToken({
            sub: authUser.id,
            organizationId: authUser.organizationId,
            role: authUser.role,
            email: authUser.email
        });

        return {
            user: authUser,
            accessToken
        };
    } catch (error) {
        await client.query("ROLLBACK");

        if (
            error instanceof Error &&
            "code" in error &&
            error.code === "23505"
        ) {
            throw conflict(
                "Já existe um recurso com os dados informados",
                "RESOURCE_ALREADY_EXISTS"
            );
        }

        throw error;
    } finally {
        client.release();
    }
}

export async function loginUser(
    input: LoginInput,
    signToken: (payload: {
        sub: string;
        organizationId: string;
        role: "admin" | "manager" | "member";
        email: string;
    }) => string
): Promise<AuthResult> {
    const email = normalizeEmail(input.email);

    const result = await db.query<{
        user_id: string;
        organization_id: string;
        organization_name: string;
        name: string;
        email: string;
        password_hash: string;
        role: "admin" | "manager" | "member";
        is_active: boolean;
    }>(
        `
      SELECT
        u.id AS user_id,
        u.organization_id,
        o.name AS organization_name,
        u.name,
        u.email,
        u.password_hash,
        u.role,
        u.is_active
      FROM users u
      INNER JOIN organizations o
        ON o.id = u.organization_id
      WHERE LOWER(u.email) = $1
      LIMIT 1
    `,
        [email]
    );

    const user = result.rows[0];

    if (!user) {
        throw unauthorized(
            "E-mail ou senha inválidos",
            "INVALID_CREDENTIALS"
        );
    }

    const passwordMatches = await bcrypt.compare(
        input.password,
        user.password_hash
    );

    if (!passwordMatches || !user.is_active) {
        throw unauthorized(
            "E-mail ou senha inválidos",
            "INVALID_CREDENTIALS"
        );
    }

    const authUser = toAuthUser(user);

    await db.query(
        `
      INSERT INTO audit_logs (
        organization_id,
        user_id,
        action,
        resource_type,
        resource_id
      )
      VALUES ($1, $2, $3, $4, $5)
    `,
        [
            authUser.organizationId,
            authUser.id,
            "auth.login",
            "user",
            authUser.id
        ]
    );

    const accessToken = signToken({
        sub: authUser.id,
        organizationId: authUser.organizationId,
        role: authUser.role,
        email: authUser.email
    });

    return {
        user: authUser,
        accessToken
    };
}

export async function findUserById(
    userId: string
): Promise<AuthUser | null> {
    const result = await db.query<{
        user_id: string;
        organization_id: string;
        organization_name: string;
        name: string;
        email: string;
        role: "admin" | "manager" | "member";
        is_active: boolean;
    }>(
        `
      SELECT
        u.id AS user_id,
        u.organization_id,
        o.name AS organization_name,
        u.name,
        u.email,
        u.role,
        u.is_active
      FROM users u
      INNER JOIN organizations o
        ON o.id = u.organization_id
      WHERE u.id = $1
      LIMIT 1
    `,
        [userId]
    );

    const user = result.rows[0];

    return user ? toAuthUser(user) : null;
}
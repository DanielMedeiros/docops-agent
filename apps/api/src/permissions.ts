export type UserRole = "admin" | "manager" | "member";

export type Permission =
    | "organization:read"
    | "organization:update"
    | "users:read"
    | "users:create"
    | "users:update"
    | "documents:read"
    | "documents:create"
    | "documents:update"
    | "documents:delete"
    | "tools:execute"
    | "audit:read";

export const rolePermissions: Record<UserRole, Permission[]> = {
    admin: [
        "organization:read",
        "organization:update",
        "users:read",
        "users:create",
        "users:update",
        "documents:read",
        "documents:create",
        "documents:update",
        "documents:delete",
        "tools:execute",
        "audit:read"
    ],

    manager: [
        "organization:read",
        "users:read",
        "users:create",
        "users:update",
        "documents:read",
        "documents:create",
        "documents:update",
        "tools:execute"
    ],

    member: [
        "organization:read",
        "documents:read"
    ]
};

export function roleHasPermission(
    role: UserRole,
    permission: Permission
): boolean {
    return rolePermissions[role].includes(permission);
}
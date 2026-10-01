import { z } from "zod";

export const registerSchema = z.object({
    organizationName: z
        .string()
        .trim()
        .min(2, "O nome da organização deve ter pelo menos 2 caracteres")
        .max(120),

    name: z
        .string()
        .trim()
        .min(2, "O nome deve ter pelo menos 2 caracteres")
        .max(120),

    email: z
        .string()
        .trim()
        .toLowerCase()
        .email("Informe um e-mail válido")
        .max(255),

    password: z
        .string()
        .min(8, "A senha deve ter pelo menos 8 caracteres")
        .max(128)
});

export const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .toLowerCase()
        .email("Informe um e-mail válido"),

    password: z
        .string()
        .min(1, "A senha é obrigatória")
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
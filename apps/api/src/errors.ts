export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly details?: unknown;

    constructor(
        message: string,
        statusCode = 500,
        code = "INTERNAL_ERROR",
        details?: unknown
    ) {
        super(message);

        this.name = "AppError";
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}

export function badRequest(
    message: string,
    code = "BAD_REQUEST",
    details?: unknown
): AppError {
    return new AppError(message, 400, code, details);
}

export function unauthorized(
    message = "Não autenticado",
    code = "UNAUTHORIZED"
): AppError {
    return new AppError(message, 401, code);
}

export function forbidden(
    message = "Acesso negado",
    code = "FORBIDDEN"
): AppError {
    return new AppError(message, 403, code);
}

export function notFound(
    message = "Recurso não encontrado",
    code = "NOT_FOUND"
): AppError {
    return new AppError(message, 404, code);
}

export function conflict(
    message: string,
    code = "CONFLICT"
): AppError {
    return new AppError(message, 409, code);
}
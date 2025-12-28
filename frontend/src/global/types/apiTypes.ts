// src/global/types/apiTypes.ts
// Tipos canónicos para el manejo de errores y respuestas de API
// TASK-FE-004: Elimina la necesidad de usar `any` en thunks y slices

/**
 * Tipo canónico para errores de API rechazados en thunks.
 * Representa la estructura del contrato de error del backend.
 */
export interface ApiError {
    success: false;
    message_key: string;
    message: string;
    data?: Record<string, unknown>;
}

/**
 * Helper para extraer mensaje de error de una excepción de API.
 * Uso: catch (err: unknown) { return rejectWithValue(extractApiError(err)); }
 */
export function extractApiError(err: unknown): ApiError {
    if (isAxiosError(err) && err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'object' && data !== null && 'message' in data) {
            return {
                success: false,
                message_key: (data as Record<string, unknown>).message_key as string || 'error',
                message: (data as Record<string, unknown>).message as string || 'Error desconocido',
                data: (data as Record<string, unknown>).data as Record<string, unknown>,
            };
        }
    }

    // Fallback para errores no estructurados
    const message = err instanceof Error ? err.message : 'Error desconocido';
    return {
        success: false,
        message_key: 'unknown_error',
        message,
    };
}

/**
 * Type guard para verificar si un error es de Axios
 */
function isAxiosError(err: unknown): err is { response?: { data?: unknown } } {
    return (
        typeof err === 'object' &&
        err !== null &&
        'response' in err
    );
}

/**
 * Tipo para thunks con valor de rechazo tipado
 */
export interface ThunkApiConfig {
    rejectValue: ApiError;
}

/**
 * Respuesta paginada canónica del backend
 */
export interface PaginatedResponse<T> {
    results: T[];
    meta: {
        count: number;
        next: string | null;
        previous: string | null;
        page: number;
        page_size: number;
        total_pages: number;
    };
}

/**
 * Respuesta canónica del backend (NotificationHandler)
 */
export interface BackendResponse<T = unknown> {
    success: boolean;
    message_key: string;
    message: string;
    data: T;
    notification?: {
        key?: string;
        message?: string;
        type?: string;
        action?: string;
        target?: string;
    };
}

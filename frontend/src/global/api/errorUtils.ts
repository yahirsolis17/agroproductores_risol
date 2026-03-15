import { isApiClientAxiosError, ApiClientAxiosError } from "./apiClient";

type ApiErrorShape = {
    message?: string;
    detail?: string;
    message_key?: string;
    errors?: Record<string, unknown>;
};

export function isAxiosError(err: unknown): err is ApiClientAxiosError {
    return isApiClientAxiosError(err);
}

export function extractApiMessage(err: unknown, fallback = "Error"): string {
    // Axios
    if (isAxiosError(err)) {
        const data = err.response?.data as ApiErrorShape | undefined;
        return data?.message ?? data?.detail ?? err.message ?? fallback;
    }
    // Thunk reject payload (si lo pasas como object)
    if (typeof err === "object" && err !== null) {
        const e = err as Partial<ApiErrorShape>;
        return e.message ?? e.detail ?? fallback;
    }
    // Error nativo
    if (err instanceof Error) return err.message || fallback;
    return fallback;
}

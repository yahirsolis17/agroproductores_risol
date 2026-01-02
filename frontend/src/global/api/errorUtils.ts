import axios, { AxiosError } from "axios";

type ApiErrorShape = {
    message?: string;
    detail?: string;
    message_key?: string;
    errors?: Record<string, unknown>;
};

export function isAxiosError<T = unknown>(err: unknown): err is AxiosError<T> {
    return axios.isAxiosError(err);
}

export function extractApiMessage(err: unknown, fallback = "Error"): string {
    // Axios
    if (isAxiosError<ApiErrorShape>(err)) {
        const data = err.response?.data;
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

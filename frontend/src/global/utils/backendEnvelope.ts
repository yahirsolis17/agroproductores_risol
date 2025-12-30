// Helper para leer el envelope canónico del backend con compat temporal.
// Canon: { success, message_key, message, data }
// Compat: { success, notification: { key, message, type, ... }, data }
export type CanonicalEnvelope<T> = {
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
};

export function unwrapResponse<T = any>(raw: any): CanonicalEnvelope<T> {
  // Soporta pasar una respuesta de cliente HTTP (que trae .data) o el payload directo.
  const payload =
    raw && raw.data && raw.data.success !== undefined && raw.success === undefined
      ? raw.data
      : raw;

  const fallbackKey = payload?.notification?.key ?? 'unknown';
  const fallbackMsg = payload?.notification?.message ?? '';

  return {
    success: Boolean(payload?.success),
    message_key: payload?.message_key ?? fallbackKey,
    message: payload?.message ?? fallbackMsg ?? '',
    data: (payload?.data ?? {}) as T,
    notification: payload?.notification,
  };
}

export function ensureSuccess<T = any>(raw: any): CanonicalEnvelope<T> {
  const env = unwrapResponse<T>(raw);
  if (!env.success) {
    const error: any = {
      message: env.message || 'Operación no exitosa',
      status: raw?.status ?? raw?.response?.status,
      message_key: env.message_key,
      data: env.data,
      envelope: env,
    };
    throw error;
  }
  return env;
}

export default { unwrapResponse, ensureSuccess };

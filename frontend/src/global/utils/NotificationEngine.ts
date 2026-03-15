import { toast } from 'react-toastify';
import { isValidationError, normalizeBackendErrors } from '../validation/backendFieldErrors';

type NotificationType = 'success' | 'error' | 'warning' | 'info';
type NotificationPayload = {
  key?: string;
  message?: string;
  type?: NotificationType | string;
  action?: string;
  target?: string;
};

type BackendNotificationSource = {
  notification?: NotificationPayload;
  message_key?: string;
  messageKey?: string;
  message?: string;
  detail?: string;
  success?: boolean;
};

// Debounce para evitar notificaciones duplicadas (especialmente en dev con StrictMode)
let _lastNotif: { key?: string; message?: string; ts: number } | null = null;
const NOTIF_DEDUP_WINDOW_MS = 1000; // 1s
const NOTIFICATION_HANDLED_FLAG = '__frontendNotificationHandled';

function shouldSuppressDuplicate(key?: string, message?: string) {
  const now = Date.now();
  if (_lastNotif && now - _lastNotif.ts < NOTIF_DEDUP_WINDOW_MS) {
    if (_lastNotif.key === key && _lastNotif.message === message) {
      return true;
    }
  }
  _lastNotif = { key, message, ts: now };
  return false;
}

function isObjectLike(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object');
}

function wasHandled(value: unknown): boolean {
  return isObjectLike(value) && Boolean((value as Record<string, unknown>)[NOTIFICATION_HANDLED_FLAG]);
}

function markHandled(value: unknown): void {
  if (!isObjectLike(value)) return;
  try {
    Object.defineProperty(value, NOTIFICATION_HANDLED_FLAG, {
      value: true,
      configurable: true,
      enumerable: false,
      writable: true,
    });
  } catch {
    try {
      (value as Record<string, unknown>)[NOTIFICATION_HANDLED_FLAG] = true;
    } catch {
      // no-op
    }
  }
}

const SILENT_NOTIFICATION_KEYS = ['no_notification', 'silent_response', 'data_processed_success'];
const FORCE_TOAST_KEYS = new Set([
  'madera_stock_insuficiente_empaque',
]);

// ⛔ Claves que NO deben provocar redirect automático
const REDIRECT_BLOCKLIST = new Set(['login_success', 'password_change_success']);

const KEY_TO_TYPE: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
  permission_denied: 'error',
  validation_error: 'warning',
  server_error: 'error',
  data_processed_success: 'info',
  login_success: 'success',
  password_change_success: 'success',
  reporte_generado_exitosamente: 'success',
  export_requires_view: 'error',
  export_denied_no_view: 'error',
  export_denied_no_export: 'error',
};

export function handleBackendNotification(response: unknown) {
  if (!isObjectLike(response) || wasHandled(response)) return;
  const source = response as BackendNotificationSource;

  const incomingKey =
    source.notification?.key ??
    source.message_key ??
    source.messageKey;

  const normalized = normalizeBackendErrors(response);
  const shouldForceToast = typeof incomingKey === 'string' && FORCE_TOAST_KEYS.has(incomingKey);
  const hasFieldErrors = Object.keys(normalized.fieldErrors ?? {}).length > 0;
  const hasSpecificBusinessKey =
    typeof incomingKey === 'string' &&
    incomingKey.length > 0 &&
    incomingKey !== 'validation_error';
  const shouldSilenceValidationToast =
    !shouldForceToast &&
    !hasSpecificBusinessKey &&
    isValidationError(normalized) &&
    hasFieldErrors &&
    (normalized.status === 400 || normalized.status === 422 || normalized.messageKey === 'validation_error');

  const notif: NotificationPayload = source.notification ?? {
    key: incomingKey,
    message: source.message ?? source.detail ?? '',
    type: source.success === false ? 'error' : undefined,
    action: undefined,
    target: undefined,
  };
  if (!notif) return;
  markHandled(response);

  if (shouldSilenceValidationToast) {
    return;
  }

  const { key, action, target } = notif;
  let type = notif.type;
  let message = notif.message ?? 'Operación completada.';
  if (!type && key && KEY_TO_TYPE[key]) {
    type = KEY_TO_TYPE[key];
  }
  if (!type) {
    type = source.success === false ? 'error' : 'info';
  }
  if (!message && typeof source.message === 'string' && source.message.trim()) {
    message = source.message;
  }

  // Notificaciones silenciosas (no toast)
  if (key && SILENT_NOTIFICATION_KEYS.includes(key)) {
    // Aun si es silenciosa, respetamos redirect salvo que esté bloqueado
    if (
      action === 'redirect' &&
      typeof target === 'string' &&
      target &&
      !REDIRECT_BLOCKLIST.has(key || '')
    ) {
      window.location.assign(target);
    }
    return;
  }

  // Debounce duplicados recientes
  if (shouldSuppressDuplicate(key, message)) return;

  // Toasts
  switch (type) {
    case 'success':
      toast.success(message);
      break;
    case 'error':
      toast.error(message);
      break;
    case 'warning':
      toast.warning(message);
      break;
    case 'info':
    default:
      toast.info(message);
  }

  // Redirect si aplica y NO está bloqueado por política
  if (
    action === 'redirect' &&
    typeof target === 'string' &&
    target &&
    !REDIRECT_BLOCKLIST.has(key || '')
  ) {
    window.location.assign(target);
  }

  if (import.meta.env.DEV) {
    console.log(`[Notificación: ${key}]`, message, action ? `action=${action}` : '');
  }
}
export default { handleBackendNotification };

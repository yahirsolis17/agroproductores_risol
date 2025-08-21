import { toast } from 'react-toastify';

const SILENT_NOTIFICATION_KEYS = ['no_notification', 'silent_response', 'data_processed_success'];

// ⛔ Claves que NO deben provocar redirect automático
const REDIRECT_BLOCKLIST = new Set(['login_success', 'password_change_success']);

export function handleBackendNotification(response: any) {
  const notif = response?.notification;
  if (!notif) return;

  const { type = 'info', message = 'Operación completada.', key, action, target } = notif;

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

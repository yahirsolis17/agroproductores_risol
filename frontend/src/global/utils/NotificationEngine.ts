import { toast } from 'react-toastify';

const SILENT_NOTIFICATION_KEYS = ['no_notification', 'silent_response', 'data_processed_success'];

export function handleBackendNotification(response: any) {
  const notif = response?.notification;

  if (!notif) return;

  const { type = 'info', message = 'Operación completada.', key } = notif;

  // ⛔ No mostrar toast si la clave está en la lista de silenciosas
  if (key && SILENT_NOTIFICATION_KEYS.includes(key)) return;

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

  // Log para debugging (solo en desarrollo)
  if (import.meta.env.DEV) {
    console.log(`[Notificación: ${key}]`, message);
  }
}

// src/global/utils/NotificationEngine.ts

import { toast } from 'react-toastify';

export function handleBackendNotification(response: any) {
  const notif = response?.notification;

  if (notif) {
    const { type = 'info', message = 'Operación completada.', key } = notif;

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

    // También podrías loguear el key si estás depurando
    console.log(`[Notificación: ${key}]`, message);
  }
}

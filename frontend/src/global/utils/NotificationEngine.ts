// src/global/utils/NotificationEngine.ts
import { toast } from 'react-toastify';

export const handleBackendNotification = (responseData: any) => {
  if (!responseData || !responseData.notification) return;

  const { success } = responseData;
  const { message, key: message_key } = responseData.notification;

  if (!message) return;

  const msg = `[${message_key}] ${message}`;

  if (success) {
    toast.success(msg);
  } else {
    toast.error(msg);
  }
};

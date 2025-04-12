// src/global/utils/notidicationengine.ts
import { toast } from 'react-toastify';

export const handleBackendNotification = (responseData: any) => {
  if (!responseData) return;

  const { success, message, message_key } = responseData;

  if (!message) return;

  const msg = `[${message_key}] ${message}`;

  if (success) {
    toast.success(msg);
  } else {
    toast.error(msg);
  }
};

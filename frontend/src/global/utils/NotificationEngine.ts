// src/global/utils/NotificationEngine.ts
import { toast } from 'react-toastify';

export const handleBackendNotification = (responseData: any) => {
  if (!responseData || !responseData.notification) return;

  const { success } = responseData;
  const { message } = responseData.notification;

  if (!message) return;

  if (success) {
    toast.success(message, { autoClose: 3000 });
  } else {
    toast.error(message, { autoClose: 4000 });
  }
};

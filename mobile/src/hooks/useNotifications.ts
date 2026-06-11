import { useContext } from 'react';
import { NotificationContext, Notification as ContextNotification } from '../contexts/NotificationContext';

export type Notification = ContextNotification;

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

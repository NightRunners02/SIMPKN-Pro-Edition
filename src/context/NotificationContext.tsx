import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppNotification } from '../types/database';
import { dbService } from '../services/db';
import { useAuth } from './AuthContext';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  toasts: Toast[];
  showToast: (type: Toast['type'], title: string, message?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const fetchNotifs = async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    const data = await dbService.getNotifications(user.id);
    setNotifications(data);
  };

  useEffect(() => {
    fetchNotifs();
    const unsubscribe = dbService.subscribe('notifications', fetchNotifs);
    return () => unsubscribe();
  }, [user]);

  const showToast = (type: Toast['type'], title: string, message?: string, duration = 4000) => {
    const id = 'toast-' + Date.now() + Math.random().toString(36).substring(2, 5);
    const newToast: Toast = { id, type, title, message, duration };
    setToasts(prev => [...prev, newToast]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const markAsRead = async (id: string) => {
    await dbService.markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await dbService.markAllNotificationsRead(user.id);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        toasts,
        showToast,
        removeToast,
        markAsRead,
        markAllAsRead,
        refreshNotifications: fetchNotifs,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

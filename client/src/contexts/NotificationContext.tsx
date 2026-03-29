/**
 * Notification Context — manages in-app notifications (PostgreSQL backend)
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '@/lib/authFetch';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  icon: string;
  timestamp: string;
  read: boolean;
  target: 'client' | 'seller';
  type?: 'general' | 'question' | 'question_answer' | 'review_request';
  metadata?: Record<string, string>;
}

interface NotificationContextType {
  notifications: AppNotification[];
  addNotification: (n: {
    title: string;
    body: string;
    icon: string;
    target: 'client' | 'seller';
    type?: AppNotification['type'];
    metadata?: Record<string, string>;
  }) => void;
  markAllRead: (target: 'client' | 'seller') => void;
  markRead: (id: string) => void;
  clientUnread: number;
  sellerUnread: number;
  sellerNotifRequested: boolean;
  requestSellerNotif: () => void;
  clearSellerNotifRequest: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

async function api(method: string, path: string, body?: unknown) {
  await authApi(method, path, body).catch(console.error);
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [sellerNotifRequested, setSellerNotifRequested] = useState(false);

  useEffect(() => {
    fetch('/api/notifications').then(r => r.json()).then(setNotifications).catch(console.error);
  }, []);

  const addNotification = (n: {
    title: string;
    body: string;
    icon: string;
    target: 'client' | 'seller';
    type?: AppNotification['type'];
    metadata?: Record<string, string>;
  }) => {
    const notif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random()}`,
      ...n,
      type: n.type ?? 'general',
      timestamp: new Date().toISOString(),
      read: false,
    };
    setNotifications(prev => [...prev, notif].slice(-100));
    api('POST', '/api/notifications', notif);
  };

  const markAllRead = (target: 'client' | 'seller') => {
    setNotifications(prev => prev.map(n => n.target === target ? { ...n, read: true } : n));
    api('PUT', '/api/notifications/mark-read', { target });
  };

  const markRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    api('PUT', `/api/notifications/${id}/read`, {});
  };

  const clientUnread = notifications.filter(n => n.target === 'client' && !n.read).length;
  const sellerUnread = notifications.filter(n => n.target === 'seller' && !n.read).length;

  const requestSellerNotif = () => setSellerNotifRequested(true);
  const clearSellerNotifRequest = () => setSellerNotifRequested(false);

  return (
    <NotificationContext.Provider value={{
      notifications, addNotification, markAllRead, markRead,
      clientUnread, sellerUnread,
      sellerNotifRequested, requestSellerNotif, clearSellerNotifRequest,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
}

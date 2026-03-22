/**
 * Notification Context — manages in-app notifications for client and seller
 */
import React, { createContext, useContext, useState, useEffect } from 'react';

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

const STORAGE_KEY = 'marketplace-notifications';

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [sellerNotifRequested, setSellerNotifRequested] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setNotifications(JSON.parse(saved));
  }, []);

  const persist = (next: AppNotification[]) => {
    const capped = next.slice(-100);
    setNotifications(capped);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(capped));
  };

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
    setNotifications(prev => {
      const next = [...prev, notif].slice(-100);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const markAllRead = (target: 'client' | 'seller') => {
    persist(notifications.map(n => n.target === target ? { ...n, read: true } : n));
  };

  const markRead = (id: string) => {
    persist(notifications.map(n => n.id === id ? { ...n, read: true } : n));
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

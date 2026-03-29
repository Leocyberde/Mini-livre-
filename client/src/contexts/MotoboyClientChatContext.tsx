import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, authFetch } from '@/lib/authFetch';

export interface ChatMessage {
  id: string;
  orderId: string;
  sender: 'motoboy' | 'client';
  text: string;
  timestamp: string;
  read: boolean;
}

interface MotoboyClientChatContextType {
  getMessages: (orderId: string) => ChatMessage[];
  sendMessage: (orderId: string, sender: 'motoboy' | 'client', text: string) => void;
  getUnreadCount: (orderId: string, reader: 'motoboy' | 'client') => number;
  markRead: (orderId: string, reader: 'motoboy' | 'client') => void;
  clearChat: (orderId: string) => void;
}

const MotoboyClientChatContext = createContext<MotoboyClientChatContextType | undefined>(undefined);

async function api(method: string, path: string, body?: unknown) {
  await authApi(method, path, body).catch(console.error);
}

export function MotoboyClientChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const loadMessages = useCallback(async (orderId: string) => {
    try {
      const r = await authFetch(`/api/chat/${orderId}`);
      const data: ChatMessage[] = await r.json();
      setMessages(prev => {
        const others = prev.filter(m => m.orderId !== orderId);
        return [...others, ...data];
      });
    } catch (e) {
      console.error(e);
    }
  }, []);

  const getMessages = useCallback((orderId: string) => {
    const existing = messages.filter(m => m.orderId === orderId);
    // Trigger background load if nothing cached yet
    if (existing.length === 0) loadMessages(orderId);
    return existing;
  }, [messages, loadMessages]);

  const sendMessage = useCallback((orderId: string, sender: 'motoboy' | 'client', text: string) => {
    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      orderId,
      sender,
      text,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setMessages(prev => [...prev, msg]);
    api('POST', `/api/chat/${orderId}`, msg);
  }, []);

  const getUnreadCount = useCallback((orderId: string, reader: 'motoboy' | 'client') => {
    const other = reader === 'motoboy' ? 'client' : 'motoboy';
    return messages.filter(m => m.orderId === orderId && m.sender === other && !m.read).length;
  }, [messages]);

  const markRead = useCallback((orderId: string, reader: 'motoboy' | 'client') => {
    const other = reader === 'motoboy' ? 'client' : 'motoboy';
    setMessages(prev =>
      prev.map(m =>
        m.orderId === orderId && m.sender === other && !m.read ? { ...m, read: true } : m
      )
    );
    api('PUT', `/api/chat/${orderId}/read`, { reader });
  }, []);

  const clearChat = useCallback((orderId: string) => {
    setMessages(prev => prev.filter(m => m.orderId !== orderId));
    api('DELETE', `/api/chat/${orderId}`);
  }, []);

  return (
    <MotoboyClientChatContext.Provider value={{ getMessages, sendMessage, getUnreadCount, markRead, clearChat }}>
      {children}
    </MotoboyClientChatContext.Provider>
  );
}

export function useMotoboyClientChat() {
  const ctx = useContext(MotoboyClientChatContext);
  if (!ctx) throw new Error('useMotoboyClientChat must be used within MotoboyClientChatProvider');
  return ctx;
}

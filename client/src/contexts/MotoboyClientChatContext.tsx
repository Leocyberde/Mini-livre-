import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

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

const STORAGE_KEY = 'motoboy-client-chat';

const MotoboyClientChatContext = createContext<MotoboyClientChatContextType | undefined>(undefined);

function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMessages(msgs: ChatMessage[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
}

export function MotoboyClientChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);

  useEffect(() => {
    const interval = setInterval(() => {
      const stored = loadMessages();
      setMessages(prev => {
        const prevStr = JSON.stringify(prev);
        const nextStr = JSON.stringify(stored);
        return prevStr === nextStr ? prev : stored;
      });
    }, 800);
    return () => clearInterval(interval);
  }, []);

  const getMessages = useCallback((orderId: string) => {
    return messages.filter(m => m.orderId === orderId);
  }, [messages]);

  const sendMessage = useCallback((orderId: string, sender: 'motoboy' | 'client', text: string) => {
    const msg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      orderId,
      sender,
      text,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setMessages(prev => {
      const next = [...prev, msg];
      saveMessages(next);
      return next;
    });
  }, []);

  const getUnreadCount = useCallback((orderId: string, reader: 'motoboy' | 'client') => {
    const other = reader === 'motoboy' ? 'client' : 'motoboy';
    return messages.filter(m => m.orderId === orderId && m.sender === other && !m.read).length;
  }, [messages]);

  const markRead = useCallback((orderId: string, reader: 'motoboy' | 'client') => {
    const other = reader === 'motoboy' ? 'client' : 'motoboy';
    setMessages(prev => {
      const next = prev.map(m =>
        m.orderId === orderId && m.sender === other && !m.read ? { ...m, read: true } : m
      );
      saveMessages(next);
      return next;
    });
  }, []);

  const clearChat = useCallback((orderId: string) => {
    setMessages(prev => {
      const next = prev.filter(m => m.orderId !== orderId);
      saveMessages(next);
      return next;
    });
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

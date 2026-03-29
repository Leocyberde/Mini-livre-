/**
 * Support Context — manages support tickets and real-time chat between seller/motoboy and admin
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNotification } from './NotificationContext';
import { useAuth } from './AuthContext';

export type SupportCategory =
  | 'Problemas com pedidos'
  | 'Problemas com pagamento/mensalidade'
  | 'Problemas com entrega (motoboy)'
  | 'Bug ou erro no sistema'
  | 'Dúvidas sobre produtos/cadastro'
  | 'Outros'
  | 'Loja fechada'
  | 'Problemas com endereço da loja'
  | 'Localização do cliente errada'
  | 'Problemas com app'
  | 'Cliente não localizado';

export const SUPPORT_CATEGORIES: { emoji: string; label: SupportCategory }[] = [
  { emoji: '❗', label: 'Problemas com pedidos' },
  { emoji: '💰', label: 'Problemas com pagamento/mensalidade' },
  { emoji: '📦', label: 'Problemas com entrega (motoboy)' },
  { emoji: '🛠', label: 'Bug ou erro no sistema' },
  { emoji: '🖼', label: 'Dúvidas sobre produtos/cadastro' },
  { emoji: '✏', label: 'Outros' },
];

export const MOTOBOY_SUPPORT_OPTIONS: { emoji: string; label: SupportCategory; description: string }[] = [
  { emoji: '🔒', label: 'Loja fechada', description: 'A loja está fechada e não consigo coletar o pedido.' },
  { emoji: '📍', label: 'Problemas com endereço da loja', description: 'Estou com dificuldade para encontrar o endereço da loja.' },
];

export const MOTOBOY_ENTREGA_SUPPORT_OPTIONS: { emoji: string; label: SupportCategory; description: string }[] = [
  { emoji: '📍', label: 'Localização do cliente errada', description: 'O endereço de entrega está incorreto ou não consigo localizar.' },
  { emoji: '📱', label: 'Problemas com app', description: 'Estou com problemas técnicos no aplicativo durante a entrega.' },
  { emoji: '✏️', label: 'Outros', description: 'Outro problema durante o trajeto até o cliente.' },
];

export const MOTOBOY_CHEGADA_SUPPORT_OPTIONS: { emoji: string; label: SupportCategory; description: string }[] = [
  { emoji: '📍', label: 'Localização do cliente errada', description: 'O endereço de entrega está incorreto ou não consigo localizar.' },
  { emoji: '📱', label: 'Problemas com app', description: 'Estou com problemas técnicos no aplicativo na entrega.' },
  { emoji: '🔍', label: 'Cliente não localizado', description: 'Cheguei no local mas não consigo encontrar ou contatar o cliente.' },
  { emoji: '✏️', label: 'Outros', description: 'Outro problema no momento da entrega.' },
];

export interface SupportMessage {
  id: string;
  sender: 'seller' | 'admin' | 'motoboy';
  text: string;
  timestamp: string;
}

export interface SupportTicket {
  id: string;
  storeId: string;
  storeName: string;
  category: SupportCategory;
  message: string;
  createdAt: string;
  status: 'pending' | 'in_chat' | 'resolved';
  chat: SupportMessage[];
  submitterType?: 'seller' | 'motoboy';
  submitterName?: string;
  orderId?: string;
}

interface SupportContextType {
  tickets: SupportTicket[];
  submitTicket: (storeId: string, storeName: string, category: SupportCategory, message: string) => void;
  submitMotoboyTicket: (submitterId: string, submitterName: string, category: SupportCategory, message: string, orderId?: string) => void;
  startChat: (ticketId: string) => void;
  sendMessage: (ticketId: string, sender: 'seller' | 'admin' | 'motoboy', text: string) => void;
  resolveTicket: (ticketId: string) => void;
  getSellerActiveTicket: (storeId: string) => SupportTicket | null;
  getMotoboyActiveTicket: (submitterId: string) => SupportTicket | null;
}

const SupportContext = createContext<SupportContextType | undefined>(undefined);

const BASE_STORAGE_KEY = 'marketplace-support-tickets';

export function SupportProvider({ children }: { children: React.ReactNode }) {
  const { addNotification } = useNotification();
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('admin') ?? false;

  // Scope the storage key to the current user so two users on the same browser
  // never share ticket data. Admins get their own scoped key too.
  const storageKey = user?.id
    ? `${BASE_STORAGE_KEY}-${user.id}`
    : BASE_STORAGE_KEY;

  // allTickets holds every ticket from every user (required so admin sees all)
  const [allTickets, setAllTickets] = useState<SupportTicket[]>([]);

  useEffect(() => {
    if (!user?.id) {
      // Logged out — clear in-memory state so previous user's data isn't visible
      setAllTickets([]);
      return;
    }
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try { setAllTickets(JSON.parse(saved)); } catch { setAllTickets([]); }
    } else {
      setAllTickets([]);
    }
  }, [user?.id]);

  // What context consumers see: admin sees all; others see only their own tickets
  const tickets: SupportTicket[] = isAdmin
    ? allTickets
    : allTickets.filter(t => t.storeId === (user?.id ?? '__none__'));

  // Persist: non-admin operations only touch their own tickets,
  // other users' tickets are preserved in the full list
  const persist = (updatedUserTickets: SupportTicket[]) => {
    const merged = isAdmin
      ? updatedUserTickets
      : [
          ...allTickets.filter(t => t.storeId !== (user?.id ?? '__none__')),
          ...updatedUserTickets,
        ];
    setAllTickets(merged);
    localStorage.setItem(storageKey, JSON.stringify(merged));
  };

  const submitTicket = (storeId: string, storeName: string, category: SupportCategory, message: string) => {
    const ticket: SupportTicket = {
      id: crypto.randomUUID ? crypto.randomUUID() : `ticket-${Date.now()}`,
      storeId,
      storeName,
      category,
      message,
      createdAt: new Date().toISOString(),
      status: 'pending',
      chat: [],
      submitterType: 'seller',
    };
    persist([...tickets, ticket]);
  };

  const submitMotoboyTicket = (submitterId: string, submitterName: string, category: SupportCategory, message: string, orderId?: string) => {
    const ticket: SupportTicket = {
      id: crypto.randomUUID ? crypto.randomUUID() : `ticket-${Date.now()}`,
      storeId: submitterId,
      storeName: submitterName,
      category,
      message,
      createdAt: new Date().toISOString(),
      status: 'pending',
      chat: [],
      submitterType: 'motoboy',
      submitterName,
      orderId,
    };
    persist([...tickets, ticket]);
    addNotification({
      target: 'seller',
      icon: '🏍️',
      title: `Suporte Motoboy: ${category}`,
      body: `${submitterName} relatou um problema: ${message.slice(0, 60)}${message.length > 60 ? '…' : ''}`,
      type: 'general',
      metadata: { ticketId: ticket.id, submitterType: 'motoboy', category },
    });
  };

  const startChat = (ticketId: string) => {
    const ticket = allTickets.find(t => t.id === ticketId);
    const welcomeMsg: SupportMessage = {
      id: `msg-${Date.now()}`,
      sender: 'admin',
      text: 'Um atendente entrou no chat para te ajudar!',
      timestamp: new Date().toISOString(),
    };
    // Admin operates on allTickets directly (they can start chat on any ticket)
    const merged = allTickets.map(t =>
      t.id === ticketId
        ? { ...t, status: 'in_chat' as const, chat: [...t.chat, welcomeMsg] }
        : t
    );
    setAllTickets(merged);
    localStorage.setItem(storageKey, JSON.stringify(merged));
    if (ticket?.submitterType !== 'motoboy') {
      addNotification({
        target: 'seller',
        icon: '💬',
        title: 'Atendimento iniciado!',
        body: 'Um atendente entrou no chat para te ajudar.',
      });
    }
  };

  const sendMessage = (ticketId: string, sender: 'seller' | 'admin' | 'motoboy', text: string) => {
    const ticket = allTickets.find(t => t.id === ticketId);
    const msg: SupportMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      sender,
      text,
      timestamp: new Date().toISOString(),
    };
    const merged = allTickets.map(t =>
      t.id === ticketId ? { ...t, chat: [...t.chat, msg] } : t
    );
    setAllTickets(merged);
    localStorage.setItem(storageKey, JSON.stringify(merged));
    if (sender === 'admin' && ticket?.submitterType !== 'motoboy') {
      addNotification({
        target: 'seller',
        icon: '💬',
        title: 'Nova mensagem de suporte',
        body: text.length > 60 ? text.slice(0, 60) + '…' : text,
      });
    }
  };

  const resolveTicket = (ticketId: string) => {
    const merged = allTickets.map(t =>
      t.id === ticketId ? { ...t, status: 'resolved' as const } : t
    );
    setAllTickets(merged);
    localStorage.setItem(storageKey, JSON.stringify(merged));
  };

  const getSellerActiveTicket = (storeId: string): SupportTicket | null => {
    return allTickets.find(t => t.storeId === storeId && t.submitterType !== 'motoboy' && t.status !== 'resolved') ?? null;
  };

  const getMotoboyActiveTicket = (submitterId: string): SupportTicket | null => {
    return allTickets.find(t => t.storeId === submitterId && t.submitterType === 'motoboy' && t.status !== 'resolved') ?? null;
  };

  return (
    <SupportContext.Provider value={{
      tickets, submitTicket, submitMotoboyTicket, startChat, sendMessage, resolveTicket,
      getSellerActiveTicket, getMotoboyActiveTicket,
    }}>
      {children}
    </SupportContext.Provider>
  );
}

export function useSupport() {
  const ctx = useContext(SupportContext);
  if (!ctx) throw new Error('useSupport must be used within SupportProvider');
  return ctx;
}

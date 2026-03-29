import React, { createContext, useContext, useState, useEffect } from 'react';
import type { MotoboyStatus } from '@/lib/mockData';

export type { MotoboyStatus };

export interface CompletedRoute {
  id: string;
  completedAt: Date;
  value: number;
  from: string;
  to: string;
  storeAddress?: string;
}

export interface MotoboyNotification {
  id: string;
  message: string;
  time: Date;
  read: boolean;
}

interface MotoboyContextType {
  status: MotoboyStatus;
  setStatus: (s: MotoboyStatus) => void;
  resetSession: () => void;
  locationEnabled: boolean;
  requestLocation: () => void;
  balanceVisible: boolean;
  toggleBalanceVisible: () => void;
  todayEarnings: number;
  todayRides: number;
  weekEarnings: number;
  totalEntradas: number;
  totalSaidas: number;
  saldoFechado: number;
  completedRoutes: CompletedRoute[];
  notifications: MotoboyNotification[];
  unreadCount: number;
  markAllRead: () => void;
  currentRoute: CompletedRoute | null;
  finishRoute: () => void;
  cancelRoute: () => void;
  startRoute: (route: { from: string; to: string; value: number; storeAddress?: string }) => void;
  addValueToCurrentRoute: (amount: number) => void;
  totalRejectedRides: number;
  addRejection: () => void;
  screenPhase: 'coleta' | 'pickup' | 'conclude' | 'entrega' | 'chegada_entrega' | null;
  setScreenPhase: (phase: 'coleta' | 'pickup' | 'conclude' | 'entrega' | 'chegada_entrega' | null) => void;
  activeOrderId: string | null;
  setActiveOrderId: (id: string | null) => void;
  completeOrderDelivery: (order: { id: string; total: number; storeName?: string; storeId?: string; deliveryAddress?: { logradouro: string; numero: string; bairro: string; cidade: string } }) => void;
  cancelOrderDelivery: (orderId: string) => void;
  addMotoboyNotification: (message: string) => void;
}

const MotoboyContext = createContext<MotoboyContextType | undefined>(undefined);

export function MotoboyProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatusState] = useState<MotoboyStatus>('unavailable');
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [completedRoutes, setCompletedRoutes] = useState<CompletedRoute[]>([]);
  const [notifications, setNotifications] = useState<MotoboyNotification[]>([]);
  const [currentRoute, setCurrentRoute] = useState<CompletedRoute | null>(null);
  const [totalRejectedRides, setTotalRejectedRides] = useState(0);
  const [screenPhase, setScreenPhase] = useState<'coleta' | 'pickup' | 'conclude' | 'entrega' | 'chegada_entrega' | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.permissions?.query({ name: 'geolocation' }).then(result => {
        if (result.state === 'granted') setLocationEnabled(true);
        result.onchange = () => setLocationEnabled(result.state === 'granted');
      }).catch(() => {});
    }
  }, []);

  const requestLocation = () => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      () => setLocationEnabled(true),
      () => setLocationEnabled(false)
    );
  };

  const setStatus = (s: MotoboyStatus) => {
    if (s === 'available' && !locationEnabled) return;
    setStatusState(s);
  };

  const finishRoute = () => {
    if (!currentRoute) return;
    const finished: CompletedRoute = { ...currentRoute, completedAt: new Date() };
    setCompletedRoutes(prev => [finished, ...prev]);
    setCurrentRoute(null);
    setStatusState('available');
    setScreenPhase(null);
    setActiveOrderId(null);
  };

  const cancelRoute = () => {
    setCurrentRoute(null);
    setStatusState('available');
    setScreenPhase(null);
    setActiveOrderId(null);
  };

  const startRoute = (route: { from: string; to: string; value: number; storeAddress?: string }) => {
    setCurrentRoute({
      id: `route-${Date.now()}`,
      completedAt: new Date(),
      from: route.from,
      to: route.to,
      value: route.value,
      storeAddress: route.storeAddress,
    });
    setStatusState('on_route');
  };

  const addValueToCurrentRoute = (amount: number) => {
    setCurrentRoute(prev => prev ? { ...prev, value: prev.value + amount } : prev);
  };

  const toggleBalanceVisible = () => setBalanceVisible(v => !v);

  const addRejection = () => {
    setTotalRejectedRides(n => n + 1);
  };

  const completeOrderDelivery = (order: { id: string; total: number; storeName?: string; storeId?: string; deliveryAddress?: { logradouro: string; numero: string; bairro: string; cidade: string } }) => {
    const deliveryFee = Math.max(5, parseFloat((order.total * 0.08).toFixed(2)));
    const fromLabel = order.storeName || order.storeId || 'Loja';
    const toLabel = order.deliveryAddress
      ? `${order.deliveryAddress.logradouro}, ${order.deliveryAddress.numero} — ${order.deliveryAddress.bairro}`
      : 'Endereço do cliente';

    if (activeOrderId === order.id && currentRoute) {
      const finished: CompletedRoute = { ...currentRoute, completedAt: new Date(), value: currentRoute.value || deliveryFee };
      setCompletedRoutes(prev => [finished, ...prev]);
      setCurrentRoute(null);
      setStatusState('available');
      setScreenPhase(null);
      setActiveOrderId(null);
    } else {
      const newRoute: CompletedRoute = {
        id: `admin-${order.id}`,
        completedAt: new Date(),
        value: deliveryFee,
        from: fromLabel,
        to: toLabel,
      };
      setCompletedRoutes(prev => {
        const alreadyExists = prev.some(r => r.id === `admin-${order.id}`);
        if (alreadyExists) return prev;
        return [newRoute, ...prev];
      });
    }

    setNotifications(prev => [{
      id: `notif-admin-${order.id}`,
      message: `Pedido #${order.id.slice(-5).toUpperCase()} marcado como entregue pelo admin. Ganho: R$ ${deliveryFee.toFixed(2)}`,
      time: new Date(),
      read: false,
    }, ...prev]);
  };

  const resetSession = () => {
    setStatusState('unavailable');
    setCompletedRoutes([]);
    setNotifications([]);
    setCurrentRoute(null);
    setTotalRejectedRides(0);
    setScreenPhase(null);
    setActiveOrderId(null);
  };

  const cancelOrderDelivery = (orderId: string) => {
    if (activeOrderId === orderId) {
      setCurrentRoute(null);
      setStatusState('available');
      setScreenPhase(null);
      setActiveOrderId(null);
    }
    setNotifications(prev => [{
      id: `notif-cancel-${orderId}`,
      message: `Pedido #${orderId.slice(-5).toUpperCase()} foi cancelado pelo administrador.`,
      time: new Date(),
      read: false,
    }, ...prev]);
  };

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const addMotoboyNotification = (message: string) => {
    setNotifications(prev => [{
      id: `admin-notif-${Date.now()}`,
      message,
      time: new Date(),
      read: false,
    }, ...prev]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const todayRoutes = completedRoutes.filter(r => {
    const today = new Date();
    const d = new Date(r.completedAt);
    return d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
  });

  const todayEarnings = todayRoutes.reduce((sum, r) => sum + r.value, 0);
  const todayRides = todayRoutes.length;

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekRoutes = completedRoutes.filter(r => new Date(r.completedAt) >= weekStart);
  const weekEarnings = weekRoutes.reduce((sum, r) => sum + r.value, 0);

  const totalEntradas = completedRoutes.reduce((sum, r) => sum + r.value, 0);
  const totalSaidas = 0;
  const saldoFechado = totalEntradas;

  return (
    <MotoboyContext.Provider value={{
      status, setStatus, resetSession, locationEnabled, requestLocation,
      balanceVisible, toggleBalanceVisible,
      todayEarnings, todayRides, weekEarnings,
      totalEntradas, totalSaidas, saldoFechado,
      completedRoutes, notifications, unreadCount, markAllRead,
      currentRoute, finishRoute, cancelRoute, startRoute, addValueToCurrentRoute,
      totalRejectedRides, addRejection,
      screenPhase, setScreenPhase,
      activeOrderId, setActiveOrderId,
      completeOrderDelivery, cancelOrderDelivery,
      addMotoboyNotification,
    }}>
      {children}
    </MotoboyContext.Provider>
  );
}

export function useMotoboy() {
  const ctx = useContext(MotoboyContext);
  if (!ctx) throw new Error('useMotoboy must be used within MotoboyProvider');
  return ctx;
}

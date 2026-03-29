import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { MotoboyStatus } from '@/lib/mockData';
import { useAuth } from '@/contexts/AuthContext';

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

interface PersistedState {
  status: MotoboyStatus;
  completedRoutes: CompletedRoute[];
  notifications: MotoboyNotification[];
  totalRejectedRides: number;
  currentRoute: CompletedRoute | null;
  screenPhase: 'coleta' | 'pickup' | 'conclude' | 'entrega' | 'chegada_entrega' | null;
  activeOrderId: string | null;
  balanceVisible: boolean;
}

const DEFAULT_STATE: PersistedState = {
  status: 'unavailable',
  completedRoutes: [],
  notifications: [],
  totalRejectedRides: 0,
  currentRoute: null,
  screenPhase: null,
  activeOrderId: null,
  balanceVisible: true,
};

function storageKey(userId: string) {
  return `motoboy_session_${userId}`;
}

function loadState(userId: string): PersistedState {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STATE,
      ...parsed,
      completedRoutes: (parsed.completedRoutes ?? []).map((r: CompletedRoute) => ({
        ...r,
        completedAt: new Date(r.completedAt),
      })),
      notifications: (parsed.notifications ?? []).map((n: MotoboyNotification) => ({
        ...n,
        time: new Date(n.time),
      })),
      currentRoute: parsed.currentRoute
        ? { ...parsed.currentRoute, completedAt: new Date(parsed.currentRoute.completedAt) }
        : null,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(userId: string, state: PersistedState) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch {}
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
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [persisted, setPersistedRaw] = useState<PersistedState>(() =>
    userId ? loadState(userId) : DEFAULT_STATE
  );

  const [locationEnabled, setLocationEnabled] = useState(false);

  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  useEffect(() => {
    if (!userId) return;
    setPersistedRaw(loadState(userId));
  }, [userId]);

  function setPersisted(updater: (prev: PersistedState) => PersistedState) {
    setPersistedRaw(prev => {
      const next = updater(prev);
      if (userIdRef.current) saveState(userIdRef.current, next);
      return next;
    });
  }

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
    setPersisted(prev => ({ ...prev, status: s }));
  };

  const finishRoute = () => {
    setPersisted(prev => {
      if (!prev.currentRoute) return prev;
      const finished: CompletedRoute = { ...prev.currentRoute, completedAt: new Date() };
      return {
        ...prev,
        completedRoutes: [finished, ...prev.completedRoutes],
        currentRoute: null,
        status: 'available',
        screenPhase: null,
        activeOrderId: null,
      };
    });
  };

  const cancelRoute = () => {
    setPersisted(prev => ({
      ...prev,
      currentRoute: null,
      status: 'available',
      screenPhase: null,
      activeOrderId: null,
    }));
  };

  const startRoute = (route: { from: string; to: string; value: number; storeAddress?: string }) => {
    setPersisted(prev => ({
      ...prev,
      currentRoute: {
        id: `route-${Date.now()}`,
        completedAt: new Date(),
        from: route.from,
        to: route.to,
        value: route.value,
        storeAddress: route.storeAddress,
      },
      status: 'on_route',
    }));
  };

  const addValueToCurrentRoute = (amount: number) => {
    setPersisted(prev => ({
      ...prev,
      currentRoute: prev.currentRoute
        ? { ...prev.currentRoute, value: prev.currentRoute.value + amount }
        : prev.currentRoute,
    }));
  };

  const toggleBalanceVisible = () => {
    setPersisted(prev => ({ ...prev, balanceVisible: !prev.balanceVisible }));
  };

  const addRejection = () => {
    setPersisted(prev => ({ ...prev, totalRejectedRides: prev.totalRejectedRides + 1 }));
  };

  const setScreenPhase = (phase: PersistedState['screenPhase']) => {
    setPersisted(prev => ({ ...prev, screenPhase: phase }));
  };

  const setActiveOrderId = (id: string | null) => {
    setPersisted(prev => ({ ...prev, activeOrderId: id }));
  };

  const completeOrderDelivery = (order: {
    id: string;
    total: number;
    storeName?: string;
    storeId?: string;
    deliveryAddress?: { logradouro: string; numero: string; bairro: string; cidade: string };
  }) => {
    const deliveryFee = Math.max(5, parseFloat((order.total * 0.08).toFixed(2)));
    const fromLabel = order.storeName || order.storeId || 'Loja';
    const toLabel = order.deliveryAddress
      ? `${order.deliveryAddress.logradouro}, ${order.deliveryAddress.numero} — ${order.deliveryAddress.bairro}`
      : 'Endereço do cliente';

    setPersisted(prev => {
      let newRoutes = prev.completedRoutes;
      let newCurrent = prev.currentRoute;
      let newStatus = prev.status;
      let newPhase = prev.screenPhase;
      let newActiveId = prev.activeOrderId;

      if (prev.activeOrderId === order.id && prev.currentRoute) {
        const finished: CompletedRoute = {
          ...prev.currentRoute,
          completedAt: new Date(),
          value: prev.currentRoute.value || deliveryFee,
        };
        newRoutes = [finished, ...prev.completedRoutes];
        newCurrent = null;
        newStatus = 'available';
        newPhase = null;
        newActiveId = null;
      } else {
        const alreadyExists = prev.completedRoutes.some(r => r.id === `admin-${order.id}`);
        if (!alreadyExists) {
          newRoutes = [
            { id: `admin-${order.id}`, completedAt: new Date(), value: deliveryFee, from: fromLabel, to: toLabel },
            ...prev.completedRoutes,
          ];
        }
      }

      const newNotif: MotoboyNotification = {
        id: `notif-admin-${order.id}`,
        message: `Pedido #${order.id.slice(-5).toUpperCase()} marcado como entregue pelo admin. Ganho: R$ ${deliveryFee.toFixed(2)}`,
        time: new Date(),
        read: false,
      };

      return {
        ...prev,
        completedRoutes: newRoutes,
        currentRoute: newCurrent,
        status: newStatus,
        screenPhase: newPhase,
        activeOrderId: newActiveId,
        notifications: [newNotif, ...prev.notifications],
      };
    });
  };

  const resetSession = () => {
    const next = DEFAULT_STATE;
    if (userId) saveState(userId, next);
    setPersistedRaw(next);
  };

  const cancelOrderDelivery = (orderId: string) => {
    setPersisted(prev => {
      const wasActive = prev.activeOrderId === orderId;
      const newNotif: MotoboyNotification = {
        id: `notif-cancel-${orderId}`,
        message: `Pedido #${orderId.slice(-5).toUpperCase()} foi cancelado pelo administrador.`,
        time: new Date(),
        read: false,
      };
      return {
        ...prev,
        currentRoute: wasActive ? null : prev.currentRoute,
        status: wasActive ? 'available' : prev.status,
        screenPhase: wasActive ? null : prev.screenPhase,
        activeOrderId: wasActive ? null : prev.activeOrderId,
        notifications: [newNotif, ...prev.notifications],
      };
    });
  };

  const markAllRead = () => {
    setPersisted(prev => ({
      ...prev,
      notifications: prev.notifications.map(n => ({ ...n, read: true })),
    }));
  };

  const addMotoboyNotification = (message: string) => {
    setPersisted(prev => ({
      ...prev,
      notifications: [
        { id: `admin-notif-${Date.now()}`, message, time: new Date(), read: false },
        ...prev.notifications,
      ],
    }));
  };

  const { completedRoutes, notifications, totalRejectedRides, currentRoute, screenPhase, activeOrderId, balanceVisible, status } = persisted;

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

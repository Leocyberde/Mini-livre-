import React, { createContext, useContext, useState, useEffect } from 'react';

export type MotoboyStatus = 'unavailable' | 'available' | 'on_route';

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
  totalRejectedRides: number;
  addRejection: () => void;
  screenPhase: 'coleta' | 'pickup' | 'conclude' | 'entrega' | 'chegada_entrega' | null;
  setScreenPhase: (phase: 'coleta' | 'pickup' | 'conclude' | 'entrega' | 'chegada_entrega' | null) => void;
  activeOrderId: string | null;
  setActiveOrderId: (id: string | null) => void;
  completeOrderDelivery: (order: { id: string; total: number; storeName?: string; storeId?: string; deliveryAddress?: { logradouro: string; numero: string; bairro: string; cidade: string } }) => void;
  cancelOrderDelivery: (orderId: string) => void;
}

const MotoboyContext = createContext<MotoboyContextType | undefined>(undefined);

const MOCK_ROUTES: CompletedRoute[] = [
  { id: 'r1', completedAt: new Date(Date.now() - 3600000 * 2), value: 18.50, from: 'Rua das Flores, 45', to: 'Av. Brasil, 120' },
  { id: 'r2', completedAt: new Date(Date.now() - 3600000 * 4), value: 12.00, from: 'Loja TechHub', to: 'Rua São Paulo, 88' },
  { id: 'r3', completedAt: new Date(Date.now() - 3600000 * 24), value: 22.75, from: 'Papelaria Premium', to: 'Rua das Acácias, 310' },
  { id: 'r4', completedAt: new Date(Date.now() - 3600000 * 26), value: 15.00, from: 'Mercado Central', to: 'Rua XV de Novembro, 77' },
  { id: 'r5', completedAt: new Date(Date.now() - 3600000 * 48), value: 9.80, from: 'Adega do Seu Zé', to: 'Condomínio Parque Verde' },
];

const MOCK_NOTIFICATIONS: MotoboyNotification[] = [
  { id: 'n1', message: 'Nova entrega disponível perto de você!', time: new Date(Date.now() - 600000), read: false },
  { id: 'n2', message: 'Seu saldo da semana passada foi fechado: R$ 320,00', time: new Date(Date.now() - 3600000), read: false },
  { id: 'n3', message: 'Parabéns! Você completou 5 entregas hoje.', time: new Date(Date.now() - 7200000), read: true },
];

export function MotoboyProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatusState] = useState<MotoboyStatus>('unavailable');
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [balanceVisible, setBalanceVisible] = useState(true);
  const [completedRoutes, setCompletedRoutes] = useState<CompletedRoute[]>(MOCK_ROUTES);
  const [notifications, setNotifications] = useState<MotoboyNotification[]>(MOCK_NOTIFICATIONS);
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
    if (s === 'on_route') {
      setCurrentRoute({
        id: 'current',
        completedAt: new Date(),
        value: 19.90,
        from: 'Loja TechHub',
        to: 'Rua das Magnólias, 234',
      });
    }
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
  const totalSaidas = 45.00;
  const saldoFechado = 320.00;

  return (
    <MotoboyContext.Provider value={{
      status, setStatus, locationEnabled, requestLocation,
      balanceVisible, toggleBalanceVisible,
      todayEarnings, todayRides, weekEarnings,
      totalEntradas, totalSaidas, saldoFechado,
      completedRoutes, notifications, unreadCount, markAllRead,
      currentRoute, finishRoute, cancelRoute, startRoute,
      totalRejectedRides, addRejection,
      screenPhase, setScreenPhase,
      activeOrderId, setActiveOrderId,
      completeOrderDelivery, cancelOrderDelivery,
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

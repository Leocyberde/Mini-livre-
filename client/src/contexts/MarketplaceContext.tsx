/**
 * Marketplace Context - Global state management (PostgreSQL backend)
 * Manages: Current mode (client/seller/admin), cart, orders, and platform data
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { CartItem, Order, mockStoreCoords } from '@/lib/mockData';
import { useNotification } from './NotificationContext';
import { calcMotoRideValue, calcDoubleRouteValues } from '@/lib/deliveryCalc';
import { authFetch, authApi } from '@/lib/authFetch';

export type UserMode = 'client' | 'seller' | 'admin' | 'motoboy';

export interface DeliveryRoute {
  id: string;
  storeId: string;
  orderIds: string[];
  routeType: 'single' | 'double';
}

export interface ActiveDeliveryRoute {
  routeId: string;
  storeId: string;
  orderIds: string[];
  routeType: 'single' | 'double';
}

export interface GroupingSlot {
  orderId: string;
  storeId: string;
  readyPaidAt: number;
}

export interface DispatchEntry {
  routeId: string;
  orderIds: string[];
  rejectionCount: number;
  lastRejectedAt: number | null;
  rejectedByMotoboyIds: string[];
  cooldownByMotoboyId: Record<string, number>;
}

const GROUPING_WINDOW_MS = 10 * 60 * 1000;
const MAX_DELIVERY_DISTANCE_KM = 5;

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const c =
    sinDLat * sinDLat +
    Math.cos((a[0] * Math.PI) / 180) *
      Math.cos((b[0] * Math.PI) / 180) *
      sinDLon *
      sinDLon;
  return R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
}

interface MarketplaceContextType {
  mode: UserMode;
  setMode: (mode: UserMode) => void;
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string, storeId: string) => void;
  updateCartQuantity: (productId: string, storeId: string, quantity: number) => void;
  clearCart: () => void;
  clientOrders: Order[];
  addClientOrder: (order: Order) => void;
  sellerOrders: Order[];
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  unseenSellerOrders: Order[];
  markSellerOrdersAsSeen: () => void;
  updatePaymentStatus: (orderId: string, paymentStatus: 'pending_payment' | 'paid') => void;
  allOrders: Order[];
  totalSales: number;
  pendingRoutes: DeliveryRoute[];
  groupingSlots: GroupingSlot[];
  dispatchQueue: DispatchEntry[];
  activeDeliveryRoutes: ActiveDeliveryRoute[];
  rejectDispatch: (routeId: string, motoboyId?: string) => void;
  acceptDispatch: (routeId: string) => void;
  timeoutDispatch: (routeId: string, motoboyId?: string) => void;
  addOrderToActiveRoute: (routeId: string, orderId: string) => void;
  readyForPickupOrders: Order[];
}

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

async function api(method: string, path: string, body?: unknown) {
  try {
    const response = await authApi(method, path, body);
    if (!response.ok) return undefined;
    return response.json();
  } catch (e) {
    console.error(e);
  }
}

export function MarketplaceProvider({ children }: { children: React.ReactNode }) {
  const { addNotification } = useNotification();
  const [mode, setMode] = useState<UserMode>(() => {
    return (localStorage.getItem('marketplace-mode') as UserMode) || 'client';
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientOrders, setClientOrders] = useState<Order[]>([]);
  const [sellerOrders, setSellerOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [unseenSellerOrders, setUnseenSellerOrders] = useState<Order[]>([]);
  const [pendingRoutes, setPendingRoutes] = useState<DeliveryRoute[]>([]);
  const [groupingSlots, setGroupingSlots] = useState<GroupingSlot[]>([]);
  const [dispatchQueue, setDispatchQueue] = useState<DispatchEntry[]>([]);
  const [activeDeliveryRoutes, setActiveDeliveryRoutes] = useState<ActiveDeliveryRoute[]>([]);
  const prevSellerOrdersRef = useRef<Order[]>([]);
  const initialLoadDone = useRef(false);

  const latestRef = useRef({
    groupingSlots,
    allOrders,
    sellerOrders,
    pendingRoutes,
    dispatchQueue,
  });
  useEffect(() => {
    latestRef.current = { groupingSlots, allOrders, sellerOrders, pendingRoutes, dispatchQueue };
  });

  // Core fetch function for orders and cart
  const fetchOrdersAndCart = (currentMode: string) => {
    const clientId = localStorage.getItem('active-client-id');
    const isClient = currentMode === 'client';

    const ordersUrl = (isClient && clientId && clientId !== 'undefined') ? `/api/orders?clientId=${clientId}` : '/api/orders';
    const cartUrl = (isClient && clientId && clientId !== 'undefined') ? `/api/cart?clientId=${clientId}` : '/api/cart';

    authFetch(cartUrl).then(r => r.ok ? r.json() : []).then((cartData: CartItem[]) => {
      if (Array.isArray(cartData)) setCart(cartData);
    }).catch(console.error);

    authFetch(ordersUrl).then(r => r.ok ? r.json() : []).then((orders: Order[]) => {
      if (!Array.isArray(orders)) return;
      if (isClient) {
        setClientOrders(orders);
      } else {
        setSellerOrders(orders);
        setAllOrders(orders);
        prevSellerOrdersRef.current = orders;
      }
      initialLoadDone.current = true;

      const readyAndPaid = orders.filter(
        (o: Order) => o.status === 'ready' && o.paymentStatus === 'paid' && !o.isPickup,
      );
      if (readyAndPaid.length > 0) {
        setGroupingSlots(
          readyAndPaid.map((o: Order) => ({
            orderId: o.id,
            storeId: o.storeId,
            readyPaidAt: Date.now(),
          })),
        );
      }

      const waiting = orders.filter((o: Order) => o.status === 'waiting_motoboy');
      if (waiting.length > 0) {
        const routes: DeliveryRoute[] = waiting.map((o: Order) => ({
          id: `route-restore-${o.id}`,
          storeId: o.storeId,
          orderIds: [o.id],
          routeType: 'single' as const,
        }));
        setPendingRoutes(routes);
        setDispatchQueue(
          routes.map(r => ({
            routeId: r.id,
            orderIds: r.orderIds,
            rejectionCount: 0,
            lastRejectedAt: null,
            rejectedByMotoboyIds: [],
            cooldownByMotoboyId: {},
          })),
        );
      }
    }).catch(console.error);
  };

  // Load data when mode changes
  useEffect(() => {
    fetchOrdersAndCart(mode);
  }, [mode]);

  // Reload orders/cart when active client switches (without full page reload)
  useEffect(() => {
    const handleClientChanged = () => {
      if (mode === 'client') {
        fetchOrdersAndCart('client');
      }
    };
    window.addEventListener('clientChanged', handleClientChanged);
    return () => window.removeEventListener('clientChanged', handleClientChanged);
  }, [mode]);

  // Detect new seller orders and track as unseen (only after initial load)
  useEffect(() => {
    if (!initialLoadDone.current) return;
    const prev = prevSellerOrdersRef.current;
    const prevIds = new Set(prev.map(o => o.id));
    const newOrders = sellerOrders.filter(o => !prevIds.has(o.id));
    if (newOrders.length > 0) {
      setUnseenSellerOrders(curr => [...curr, ...newOrders]);
    }
    prevSellerOrdersRef.current = sellerOrders;
  }, [sellerOrders]);

  const markSellerOrdersAsSeen = () => setUnseenSellerOrders([]);

  const handleSetMode = (newMode: UserMode) => {
    setMode(newMode);
    localStorage.setItem('marketplace-mode', newMode);
  };

  // ── Cart operations ──────────────────────────────────────────────────────────

  const syncCart = (newCart: CartItem[]) => {
    const clientId = localStorage.getItem('active-client-id');
    const url = clientId ? `/api/cart?clientId=${clientId}` : '/api/cart';
    api('PUT', url, newCart);
  };

  const addToCart = (item: CartItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(
        i => i.productId === item.productId && i.storeId === item.storeId,
      );
      let newCart;
      if (existingItem) {
        newCart = prevCart.map(i =>
          i.productId === item.productId && i.storeId === item.storeId
            ? { ...i, quantity: i.quantity + item.quantity }
            : i,
        );
      } else {
        newCart = [...prevCart, item];
      }
      syncCart(newCart);
      return newCart;
    });
  };

  const removeFromCart = (productId: string, storeId: string) => {
    setCart(prevCart => {
      const newCart = prevCart.filter(
        i => !(i.productId === productId && i.storeId === storeId),
      );
      syncCart(newCart);
      return newCart;
    });
  };

  const updateCartQuantity = (productId: string, storeId: string, quantity: number) => {
    if (quantity <= 0) { removeFromCart(productId, storeId); return; }
    setCart(prevCart => {
      const newCart = prevCart.map(i =>
        i.productId === productId && i.storeId === storeId ? { ...i, quantity } : i,
      );
      syncCart(newCart);
      return newCart;
    });
  };

  const clearCart = () => {
    setCart([]);
    syncCart([]);
  };

  // ── Grouping engine ───────────────────────────────────────────────────────────

  const addToGroupingSlots = (orderId: string, storeId: string) => {
    setGroupingSlots(prev => {
      if (prev.some(s => s.orderId === orderId)) return prev;
      return [...prev, { orderId, storeId, readyPaidAt: Date.now() }];
    });
  };

  const dispatchRouteInternal = (orderIds: string[], storeId: string, betweenKm?: number) => {
    const routeId = `route-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const isDouble = orderIds.length >= 2;
    const routeType: 'single' | 'double' = isDouble ? 'double' : 'single';
    const route: DeliveryRoute = { id: routeId, storeId, orderIds, routeType };
    const now = new Date().toISOString();

    const allOrdersSnap = latestRef.current.allOrders;

    // Build a map of orderId → motoRideValue using the new grouped route rules
    const rideValueMap = new Map<string, number>();

    if (!isDouble) {
      const o = allOrdersSnap.find(x => x.id === orderIds[0]);
      rideValueMap.set(orderIds[0], calcMotoRideValue(o?.distanceKm ?? 3));
    } else {
      // Sort by distanceKm ascending so the nearest delivery to the store goes first
      const [rawA, rawB] = orderIds.map(id => allOrdersSnap.find(x => x.id === id));
      const sorted = [rawA, rawB].sort((a, b) => (a?.distanceKm ?? 3) - (b?.distanceKm ?? 3));
      const nearest = sorted[0];
      const second = sorted[1];

      const nearestDist = nearest?.distanceKm ?? 3;
      // Distance between the two delivery addresses (Haversine estimate)
      const between = betweenKm ?? haversineKm(
        nearest?.deliveryCoords ?? [0, 0],
        second?.deliveryCoords ?? [0, 0],
      );
      // Total route: Store → nearest delivery → second delivery
      const totalRouteKm = nearestDist + between;
      const { order1Value, order2Value } = calcDoubleRouteValues(totalRouteKm);

      rideValueMap.set(nearest?.id ?? orderIds[0], order1Value);
      rideValueMap.set(second?.id ?? orderIds[1], order2Value);
    }

    const applyWaiting = (o: Order): Order => {
      if (!orderIds.includes(o.id)) return o;
      const motoRideValue = rideValueMap.get(o.id) ?? calcMotoRideValue(o.distanceKm ?? 3);
      const prevHistory = o.statusHistory ?? [{ status: o.status, timestamp: o.createdAt }];
      const alreadyRecorded = prevHistory.some(e => e.status === 'waiting_motoboy');
      const newHistory = alreadyRecorded
        ? prevHistory
        : [...prevHistory, { status: 'waiting_motoboy', timestamp: now }];
      return { ...o, status: 'waiting_motoboy', updatedAt: now, statusHistory: newHistory, motoRideValue };
    };

    setSellerOrders(prev => {
      const updated = prev.map(o => applyWaiting(o));
      updated.filter(o => orderIds.includes(o.id)).forEach(o => api('PUT', `/api/orders/${o.id}/status`, { status: o.status, statusHistory: o.statusHistory }));
      return updated;
    });
    setAllOrders(prev => prev.map(o => applyWaiting(o)));
    setClientOrders(prev => prev.map(o => applyWaiting(o)));

    setPendingRoutes(prev => [...prev, route]);
    setDispatchQueue(prev => [
      ...prev,
      {
        routeId,
        orderIds,
        rejectionCount: 0,
        lastRejectedAt: null,
        rejectedByMotoboyIds: [],
        cooldownByMotoboyId: {},
      },
    ]);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const { groupingSlots: slots, allOrders: orders } = latestRef.current;
      if (slots.length === 0) return;

      const now = Date.now();
      const stores = Array.from(new Set(slots.map(s => s.storeId)));

      stores.forEach(storeId => {
        const storeSlots = slots.filter(s => s.storeId === storeId);
        if (storeSlots.length === 0) return;

        const readyOrders = storeSlots
          .map(s => orders.find(o => o.id === s.orderId))
          .filter((o): o is Order => Boolean(o));

        if (readyOrders.length >= 2) {
          const o1 = readyOrders[0];
          const o2 = readyOrders[1];
          const dist = haversineKm(
            [o1.deliveryCoords?.lat ?? 0, o1.deliveryCoords?.lng ?? 0],
            [o2.deliveryCoords?.lat ?? 0, o2.deliveryCoords?.lng ?? 0],
          );

          if (dist <= MAX_DELIVERY_DISTANCE_KM) {
            dispatchRouteInternal([o1.id, o2.id], storeId, dist);
            setGroupingSlots(prev => prev.filter(s => s.orderId !== o1.id && s.orderId !== o2.id));
            return;
          }
        }

        const oldest = storeSlots.reduce((a, b) => (a.readyPaidAt < b.readyPaidAt ? a : b));
        if (now - oldest.readyPaidAt >= GROUPING_WINDOW_MS) {
          dispatchRouteInternal([oldest.orderId], storeId);
          setGroupingSlots(prev => prev.filter(s => s.orderId !== oldest.orderId));
        }
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // ── Order operations ──────────────────────────────────────────────────────────

  const addClientOrder = (order: Order) => {
    const clientId = localStorage.getItem('active-client-id');
    const orderWithClient = { ...order, clientId };
    
    // Atualiza estados locais
    setClientOrders(prev => [orderWithClient, ...prev]);
    setSellerOrders(prev => [orderWithClient, ...prev]);
    setAllOrders(prev => [orderWithClient, ...prev]);
    
    // Persiste no banco
    api('POST', '/api/orders', orderWithClient);
    
    addNotification({
      target: 'seller',
      icon: '🛒',
      title: 'Novo pedido recebido!',
      body: `Pedido #${order.id.slice(-5).toUpperCase()} chegou e aguarda confirmação.`,
    });
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    const now = new Date().toISOString();
    const historyEntry = { status, timestamp: now };
    const extraFields = status === 'delivered' ? { deliveredAt: now } : {};

    const applyUpdate = (o: Order): Order => {
      if (o.id !== orderId) return o;
      const prevHistory = o.statusHistory ?? [{ status: o.status, timestamp: o.createdAt }];
      const alreadyRecorded = prevHistory.some(e => e.status === status);
      const newHistory = alreadyRecorded ? prevHistory : [...prevHistory, historyEntry];
      return { ...o, status, updatedAt: now, statusHistory: newHistory, ...extraFields };
    };

    setSellerOrders(prev => {
      const updated = prev.map(applyUpdate);
      const order = updated.find(o => o.id === orderId);
      if (order) api('PUT', `/api/orders/${orderId}/status`, { status: order.status, statusHistory: order.statusHistory, deliveredAt: order.deliveredAt ?? null });
      return updated;
    });
    setAllOrders(prev => prev.map(applyUpdate));
    setClientOrders(prev => prev.map(applyUpdate));

    if (status === 'ready') {
      const order = latestRef.current.allOrders.find(o => o.id === orderId);
      if (order && order.paymentStatus === 'paid' && !order.isPickup) {
        addToGroupingSlots(orderId, order.storeId);
      }
    }
  };

  const updatePaymentStatus = (orderId: string, paymentStatus: 'pending_payment' | 'paid') => {
    const applyUpdate = (o: Order): Order => (o.id === orderId ? { ...o, paymentStatus } : o);
    setSellerOrders(prev => {
      const updated = prev.map(applyUpdate);
      const order = updated.find(o => o.id === orderId);
      if (order) api('PUT', `/api/orders/${orderId}/payment`, { paymentStatus: order.paymentStatus });
      return updated;
    });
    setAllOrders(prev => prev.map(applyUpdate));
    setClientOrders(prev => prev.map(applyUpdate));

    if (paymentStatus === 'paid') {
      const order = latestRef.current.allOrders.find(o => o.id === orderId);
      if (order && order.status === 'ready' && !order.isPickup) {
        addToGroupingSlots(orderId, order.storeId);
      }
    }
  };

  const rejectDispatch = (routeId: string, motoboyId?: string) => {
    setDispatchQueue(prev => {
      const entry = prev.find(e => e.routeId === routeId);
      if (!entry) return prev;
      const newRejectionCount = entry.rejectionCount + 1;

      if (newRejectionCount >= 3) {
        setTimeout(() => timeoutDispatch(routeId, motoboyId), 0);
        return prev.filter(e => e.routeId !== routeId);
      }

      return prev.map(e => {
        if (e.routeId !== routeId) return e;
        const rejectedIds = motoboyId ? [...e.rejectedByMotoboyIds, motoboyId] : e.rejectedByMotoboyIds;
        const cooldowns = motoboyId ? { ...e.cooldownByMotoboyId, [motoboyId]: Date.now() } : e.cooldownByMotoboyId;
        return {
          ...e,
          rejectionCount: newRejectionCount,
          lastRejectedAt: Date.now(),
          rejectedByMotoboyIds: rejectedIds,
          cooldownByMotoboyId: cooldowns,
        };
      });
    });
  };

  const acceptDispatch = (routeId: string) => {
    const entry = dispatchQueue.find(e => e.routeId === routeId);
    if (!entry) return;
    const orderIds = entry.orderIds;
    const storeId = pendingRoutes.find(r => r.id === routeId)?.storeId ?? '';

    const now = new Date().toISOString();
    const applyPickedUp = (o: Order): Order => {
      if (!orderIds.includes(o.id)) return o;
      const prevHistory = o.statusHistory ?? [{ status: o.status, timestamp: o.createdAt }];
      const alreadyRecorded = prevHistory.some(e => e.status === 'picked_up');
      const newHistory = alreadyRecorded ? prevHistory : [...prevHistory, { status: 'picked_up', timestamp: now }];
      return { ...o, status: 'picked_up', updatedAt: now, statusHistory: newHistory };
    };

    setSellerOrders(prev => {
      const updated = prev.map(pickedUp => {
        const o = applyPickedUp(pickedUp);
        if (orderIds.includes(o.id)) api('PUT', `/api/orders/${o.id}/status`, { status: o.status, statusHistory: o.statusHistory });
        return o;
      });
      return updated;
    });
    setAllOrders(prev => prev.map(applyPickedUp));
    setClientOrders(prev => prev.map(applyPickedUp));

    setActiveDeliveryRoutes(prev => [
      ...prev,
      { routeId, storeId, orderIds, routeType: orderIds.length >= 2 ? 'double' : 'single' },
    ]);
    setPendingRoutes(prev => prev.filter(r => r.id !== routeId));
    setDispatchQueue(prev => prev.filter(e => e.routeId !== routeId));
  };

  const addOrderToActiveRoute = (routeId: string, orderId: string) => {
    setActiveDeliveryRoutes(prev =>
      prev.map(r => {
        if (r.routeId !== routeId) return r;
        if (r.orderIds.includes(orderId)) return r;
        return { ...r, orderIds: [...r.orderIds, orderId], routeType: 'double' };
      })
    );
  };

  const timeoutDispatch = (routeId: string, motoboyId?: string) => {
    const { dispatchQueue: queue, allOrders: orders } = latestRef.current;
    const entry = queue.find(e => e.routeId === routeId);
    const orderIds = entry?.orderIds ?? [];
    const storeId = orders.find(o => orderIds.includes(o.id))?.storeId ?? '';

    setDispatchQueue(prev => prev.filter(e => e.routeId !== routeId));
    setPendingRoutes(prev => prev.filter(r => r.id !== routeId));

    if (orderIds.length > 0 && storeId) {
      orderIds.forEach(id => {
        setGroupingSlots(prev => {
          if (prev.some(s => s.orderId === id)) return prev;
          return [...prev, { orderId: id, storeId, readyPaidAt: Date.now() }];
        });
      });
    }

    if (motoboyId) {
      setDispatchQueue(prev =>
        prev.map(e => {
          if (e.routeId !== routeId) return e;
          return {
            ...e,
            rejectedByMotoboyIds: [...e.rejectedByMotoboyIds, motoboyId],
            cooldownByMotoboyId: { ...e.cooldownByMotoboyId, [motoboyId]: Date.now() },
          };
        })
      );
    }
  };

  const readyForPickupOrders = pendingRoutes.flatMap(r =>
    r.orderIds.map(id => allOrders.find(o => o.id === id)).filter((o): o is Order => Boolean(o)),
  );

  const totalSales = allOrders.reduce((sum, order) => sum + order.total, 0);

  return (
    <MarketplaceContext.Provider
      value={{
        mode,
        setMode: handleSetMode,
        cart,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        clientOrders,
        addClientOrder,
        sellerOrders,
        updateOrderStatus,
        updatePaymentStatus,
        unseenSellerOrders,
        markSellerOrdersAsSeen,
        allOrders,
        totalSales,
        pendingRoutes,
        groupingSlots,
        dispatchQueue,
        activeDeliveryRoutes,
        rejectDispatch,
        acceptDispatch,
        timeoutDispatch,
        addOrderToActiveRoute,
        readyForPickupOrders,
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
}

export function useMarketplace() {
  const context = useContext(MarketplaceContext);
  if (!context) throw new Error('useMarketplace must be used within MarketplaceProvider');
  return context;
}

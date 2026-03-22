/**
 * Marketplace Context - Global state management
 * Manages: Current mode (client/seller/admin), cart, orders, and platform data
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { CartItem, Order } from '@/lib/mockData';
import { useNotification } from './NotificationContext';

export type UserMode = 'client' | 'seller' | 'admin' | 'motoboy';

export interface DispatchEntry {
  orderId: string;
  rejectionCount: number;
  lastRejectedAt: number | null;
}

interface MarketplaceContextType {
  mode: UserMode;
  setMode: (mode: UserMode) => void;
  
  // Client mode
  cart: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string, storeId: string) => void;
  updateCartQuantity: (productId: string, storeId: string, quantity: number) => void;
  clearCart: () => void;
  clientOrders: Order[];
  addClientOrder: (order: Order) => void;
  
  // Seller mode
  sellerOrders: Order[];
  updateOrderStatus: (orderId: string, status: Order['status']) => void;
  unseenSellerOrders: Order[];
  markSellerOrdersAsSeen: () => void;
  
  updatePaymentStatus: (orderId: string, paymentStatus: 'pending_payment' | 'paid') => void;

  // Admin mode
  allOrders: Order[];
  totalSales: number;

  // Motoboy dispatch
  readyForPickupOrders: Order[];
  dispatchQueue: DispatchEntry[];
  rejectDispatch: (orderId: string) => void;
  acceptDispatch: (orderId: string) => void;
  timeoutDispatch: (orderId: string) => void;
}

const MarketplaceContext = createContext<MarketplaceContextType | undefined>(undefined);

export function MarketplaceProvider({ children }: { children: React.ReactNode }) {
  const { addNotification } = useNotification();
  const [mode, setMode] = useState<UserMode>('client');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clientOrders, setClientOrders] = useState<Order[]>([]);
  const [sellerOrders, setSellerOrders] = useState<Order[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [unseenSellerOrders, setUnseenSellerOrders] = useState<Order[]>([]);
  const [readyForPickupOrders, setReadyForPickupOrders] = useState<Order[]>([]);
  const [dispatchQueue, setDispatchQueue] = useState<DispatchEntry[]>([]);
  const prevSellerOrdersRef = useRef<Order[]>([]);

  // Load from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('marketplace-mode') as UserMode | null;
    const savedCart = localStorage.getItem('marketplace-cart');
    const savedClientOrders = localStorage.getItem('marketplace-client-orders');
    const savedSellerOrders = localStorage.getItem('marketplace-seller-orders');

    if (savedMode) setMode(savedMode);
    if (savedCart) setCart(JSON.parse(savedCart));
    if (savedClientOrders) setClientOrders(JSON.parse(savedClientOrders));
    if (savedSellerOrders) {
      const orders = JSON.parse(savedSellerOrders);
      setSellerOrders(orders);
      setAllOrders(orders);
      prevSellerOrdersRef.current = orders;

      // Restore dispatch queue for orders still waiting_motoboy
      const waiting = orders.filter((o: Order) => o.status === 'waiting_motoboy');
      if (waiting.length > 0) {
        setReadyForPickupOrders(waiting);
        setDispatchQueue(waiting.map((o: Order) => ({
          orderId: o.id,
          rejectionCount: 0,
          lastRejectedAt: null,
        })));
      }
    }
  }, []);

  // Detect new seller orders and track them as unseen
  useEffect(() => {
    const prev = prevSellerOrdersRef.current;
    if (prev.length === 0 && sellerOrders.length === 0) return;
    const prevIds = new Set(prev.map(o => o.id));
    const newOrders = sellerOrders.filter(o => !prevIds.has(o.id));
    if (newOrders.length > 0) {
      setUnseenSellerOrders(curr => [...curr, ...newOrders]);
    }
    prevSellerOrdersRef.current = sellerOrders;
  }, [sellerOrders]);

  const markSellerOrdersAsSeen = () => {
    setUnseenSellerOrders([]);
  };

  // Persist mode to localStorage
  const handleSetMode = (newMode: UserMode) => {
    setMode(newMode);
    localStorage.setItem('marketplace-mode', newMode);
  };

  // Cart operations
  const addToCart = (item: CartItem) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(
        i => i.productId === item.productId && i.storeId === item.storeId
      );

      let newCart;
      if (existingItem) {
        newCart = prevCart.map(i =>
          i.productId === item.productId && i.storeId === item.storeId
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      } else {
        newCart = [...prevCart, item];
      }

      localStorage.setItem('marketplace-cart', JSON.stringify(newCart));
      return newCart;
    });
  };

  const removeFromCart = (productId: string, storeId: string) => {
    setCart(prevCart => {
      const newCart = prevCart.filter(
        i => !(i.productId === productId && i.storeId === storeId)
      );
      localStorage.setItem('marketplace-cart', JSON.stringify(newCart));
      return newCart;
    });
  };

  const updateCartQuantity = (productId: string, storeId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId, storeId);
      return;
    }

    setCart(prevCart => {
      const newCart = prevCart.map(i =>
        i.productId === productId && i.storeId === storeId
          ? { ...i, quantity }
          : i
      );
      localStorage.setItem('marketplace-cart', JSON.stringify(newCart));
      return newCart;
    });
  };

  const clearCart = () => {
    setCart([]);
    localStorage.setItem('marketplace-cart', JSON.stringify([]));
  };

  // Order operations
  const addClientOrder = (order: Order) => {
    setClientOrders(prevOrders => {
      const newOrders = [...prevOrders, order];
      localStorage.setItem('marketplace-client-orders', JSON.stringify(newOrders));
      return newOrders;
    });

    // Also add to seller orders and all orders
    setSellerOrders(prevOrders => {
      const newOrders = [...prevOrders, order];
      localStorage.setItem('marketplace-seller-orders', JSON.stringify(newOrders));
      return newOrders;
    });

    setAllOrders(prevOrders => [...prevOrders, order]);

    // Notify seller about new order
    addNotification({
      target: 'seller',
      icon: '🛒',
      title: 'Novo pedido recebido!',
      body: `Pedido #${order.id.slice(-5).toUpperCase()} chegou e aguarda confirmação.`,
    });
  };

  const updateOrderStatus = (orderId: string, status: Order['status']) => {
    // When seller marks order as ready (delivery), convert to waiting_motoboy and add to dispatch queue
    // When seller marks pickup order as ready_for_pickup, keep that status (no motoboy dispatch)
    const effectiveStatus: Order['status'] = status === 'ready' ? 'waiting_motoboy' : status;
    const now = new Date().toISOString();
    const historyEntry = { status: effectiveStatus, timestamp: now };
    const extraFields = effectiveStatus === 'delivered' ? { deliveredAt: now } : {};

    const applyUpdate = (o: Order): Order => {
      if (o.id !== orderId) return o;
      const prevHistory = o.statusHistory ?? [{ status: o.status, timestamp: o.createdAt }];
      const alreadyRecorded = prevHistory.some(e => e.status === effectiveStatus);
      const newHistory = alreadyRecorded ? prevHistory : [...prevHistory, historyEntry];
      return { ...o, status: effectiveStatus, updatedAt: now, statusHistory: newHistory, ...extraFields };
    };

    if (status === 'ready') {
      setSellerOrders(prevOrders => {
        const order = prevOrders.find(o => o.id === orderId);
        if (order) {
          const updatedOrder = applyUpdate(order);
          setReadyForPickupOrders(prev => {
            const alreadyQueued = prev.some(o => o.id === orderId);
            if (alreadyQueued) return prev;
            return [...prev, updatedOrder];
          });
          setDispatchQueue(prev => {
            const alreadyQueued = prev.some(e => e.orderId === orderId);
            if (alreadyQueued) return prev;
            return [...prev, { orderId, rejectionCount: 0, lastRejectedAt: null }];
          });
        }
        const newOrders = prevOrders.map(applyUpdate);
        localStorage.setItem('marketplace-seller-orders', JSON.stringify(newOrders));
        return newOrders;
      });
    } else {
      setSellerOrders(prevOrders => {
        const newOrders = prevOrders.map(applyUpdate);
        localStorage.setItem('marketplace-seller-orders', JSON.stringify(newOrders));
        return newOrders;
      });
    }

    setClientOrders(prevOrders => {
      const newOrders = prevOrders.map(applyUpdate);
      localStorage.setItem('marketplace-client-orders', JSON.stringify(newOrders));
      return newOrders;
    });

    setAllOrders(prevOrders => prevOrders.map(applyUpdate));

    // Notify client about status updates
    const clientStatusNotifs: Partial<Record<Order['status'], { icon: string; title: string; body: string }>> = {
      preparing:       { icon: '🍳', title: 'Pedido em preparo!', body: 'O lojista começou a preparar o seu pedido.' },
      waiting_motoboy: { icon: '🔍', title: 'Buscando motoboy', body: 'Estamos localizando um entregador para o seu pedido.' },
      on_the_way:      { icon: '🚴', title: 'Pedido a caminho!', body: 'Seu pedido saiu para entrega. Logo chegará!' },
      delivered:       { icon: '✅', title: 'Pedido entregue!', body: 'Seu pedido foi entregue com sucesso.' },
      ready_for_pickup:{ icon: '🏪', title: 'Pronto para retirada!', body: 'Seu pedido está pronto. Vá até a loja para retirar.' },
      cancelled:       { icon: '❌', title: 'Pedido cancelado', body: 'Infelizmente seu pedido foi cancelado.' },
    };
    const notifPayload = clientStatusNotifs[effectiveStatus];
    if (notifPayload) {
      addNotification({ target: 'client', ...notifPayload });
    }

    // Send review request notification when order is delivered or collected
    if (effectiveStatus === 'delivered') {
      const orderToReview =
        clientOrders.find(o => o.id === orderId) ||
        sellerOrders.find(o => o.id === orderId);
      if (orderToReview) {
        const firstItem = orderToReview.items[0];
        addNotification({
          target: 'client',
          type: 'review_request',
          icon: '⭐',
          title: 'Avalie sua experiência!',
          body: orderToReview.isPickup
            ? `Você coletou seu pedido em ${orderToReview.storeName ?? 'loja'}. Conta pra gente como foi!`
            : `Seu pedido de ${orderToReview.storeName ?? 'loja'} chegou! Como foi a experiência?`,
          metadata: {
            orderId: orderToReview.id,
            storeId: orderToReview.storeId,
            storeName: orderToReview.storeName ?? '',
            productId: firstItem?.productId ?? '',
          },
        });
      }
    }
  };

  const updatePaymentStatus = (orderId: string, paymentStatus: 'pending_payment' | 'paid') => {
    const update = (orders: Order[]) =>
      orders.map(o => o.id === orderId ? { ...o, paymentStatus, updatedAt: new Date().toISOString() } : o);

    setSellerOrders(prev => {
      const updated = update(prev);
      localStorage.setItem('marketplace-seller-orders', JSON.stringify(updated));
      return updated;
    });
    setClientOrders(prev => {
      const updated = update(prev);
      localStorage.setItem('marketplace-client-orders', JSON.stringify(updated));
      return updated;
    });
    setAllOrders(prev => update(prev));
  };

  // Motoboy rejected this order — increment count and start 60s cooldown
  const rejectDispatch = (orderId: string) => {
    setDispatchQueue(prev =>
      prev.map(e =>
        e.orderId === orderId
          ? { ...e, rejectionCount: e.rejectionCount + 1, lastRejectedAt: Date.now() }
          : e
      )
    );
  };

  // Motoboy accepted — remove from both queues
  const acceptDispatch = (orderId: string) => {
    setDispatchQueue(prev => prev.filter(e => e.orderId !== orderId));
    setReadyForPickupOrders(prev => prev.filter(o => o.id !== orderId));
  };

  // Motoboy timed out on pickup — put order back, permanently block this motoboy from it
  const timeoutDispatch = (orderId: string) => {
    const order = allOrders.find(o => o.id === orderId);
    if (order) {
      setReadyForPickupOrders(prev => {
        if (prev.find(o => o.id === orderId)) return prev;
        return [...prev, { ...order, status: 'waiting_motoboy' }];
      });
    }
    // Re-add to dispatch queue with a far-future rejectedAt so this motoboy never gets it again
    setDispatchQueue(prev => {
      const exists = prev.find(e => e.orderId === orderId);
      if (exists) {
        return prev.map(e =>
          e.orderId === orderId
            ? { ...e, rejectionCount: e.rejectionCount + 1, lastRejectedAt: Date.now() + 1e13 }
            : e
        );
      }
      return [...prev, { orderId, rejectionCount: 1, lastRejectedAt: Date.now() + 1e13 }];
    });
  };

  // Calculate total sales
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
        readyForPickupOrders,
        dispatchQueue,
        rejectDispatch,
        acceptDispatch,
        timeoutDispatch,
      }}
    >
      {children}
    </MarketplaceContext.Provider>
  );
}

export function useMarketplace() {
  const context = useContext(MarketplaceContext);
  if (!context) {
    throw new Error('useMarketplace must be used within MarketplaceProvider');
  }
  return context;
}

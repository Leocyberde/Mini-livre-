import 'leaflet/dist/leaflet.css';
import { useState, useEffect, useRef } from 'react';
import { usePublishLocation } from '@/hooks/usePublishLocation';
import { useMotoboy } from '@/contexts/MotoboyContext';
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { useMotoboyRegistry } from '@/contexts/MotoboyRegistryContext';
import { useAuth } from '@/contexts/AuthContext';
import { Order, mockStores, Store } from '@/lib/mockData';
import { calcDoubleRouteValues, haversineKm } from '@/lib/deliveryCalc';
import {
  Home, TrendingUp, HelpCircle, MoreHorizontal, Loader2,
} from 'lucide-react';
import { authApi } from '@/lib/authFetch';

import { RouteNotificationModal } from './motoboy/components/RouteNotificationModal';
import { StackingModal } from './motoboy/components/StackingModal';
import { ColetaScreen } from './motoboy/screens/ColetaScreen';
import { PickupScreen } from './motoboy/screens/PickupScreen';
import { ConcluirColetaScreen } from './motoboy/screens/ConcluirColetaScreen';
import { EntregaScreen } from './motoboy/screens/EntregaScreen';
import { ChegadaEntregaScreen } from './motoboy/screens/ChegadaEntregaScreen';
import { InicioTab } from './motoboy/tabs/InicioTab';
import { FinanceiroTab } from './motoboy/tabs/FinanceiroTab';
import { AjudaTab } from './motoboy/tabs/AjudaTab';
import { MaisTab } from './motoboy/tabs/MaisTab';

type TabType = 'inicio' | 'financeiro' | 'ajuda' | 'mais';

export default function MotoboyPanel() {
  const [activeTab, setActiveTab] = useState<TabType>('inicio');
  const [isDark, setIsDark] = useState(true);
  const [tick, setTick] = useState(0);
  const [screenVisible, setScreenVisible] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);
  const [deliveryOrderIndex, setDeliveryOrderIndex] = useState(0);
  const [deliveredOrderIds, setDeliveredOrderIds] = useState<Set<string>>(new Set());
  const [activeStore, setActiveStore] = useState<Store | undefined>(undefined);
  const { pendingRoutes, dispatchQueue, rejectDispatch, acceptDispatch, updateOrderStatus, timeoutDispatch, addOrderToActiveRoute, activeDeliveryRoutes, allOrders } = useMarketplace();
  const { status, startRoute, addValueToCurrentRoute, addRejection, currentRoute, finishRoute, cancelRoute, screenPhase, setScreenPhase, activeOrderId, setActiveOrderId, resetSession } = useMotoboy();
  const { motoboys, isLoadingMotoboys, activeMotoboy, activeMotoboyId, setActiveMotoboyId, reloadMotoboys, updateMotoboyStatus, incrementRejected, incrementCompleted } = useMotoboyRegistry();
  const { user } = useAuth();

  // Auto-select the logged-in user's motoboy profile once data is loaded.
  // Always enforce the current user's own profile — never inherit another user's session.
  // If no profile exists, create one automatically via /api/motoboys/ensure.
  const ensuredRef = useRef(false);
  useEffect(() => {
    if (isLoadingMotoboys || !user) return;
    const myMotoboy = motoboys.find(mb => (mb as any).userId === user.id || mb.id === user.id);
    if (myMotoboy) {
      if (myMotoboy.id !== activeMotoboyId) {
        setActiveMotoboyId(myMotoboy.id);
      }
    } else if (!ensuredRef.current) {
      ensuredRef.current = true;
      authApi('POST', '/api/motoboys/ensure', { userId: user.id })
        .then(r => r.json())
        .then(mb => {
          if (mb && mb.id) {
            reloadMotoboys();
          }
        })
        .catch(console.error);
    }
  }, [isLoadingMotoboys, motoboys, user, activeMotoboyId, setActiveMotoboyId, reloadMotoboys]);

  // Restore active order/store when panel remounts (e.g. after switching panels)
  useEffect(() => {
    if (activeOrderId && status === 'on_route') {
      const order = allOrders.find(o => o.id === activeOrderId) ?? null;
      if (order) {
        setActiveOrder(order);
        setActiveOrders(prev => prev.length > 0 ? prev : [order]);
        setActiveStore(mockStores.find(s => s.id === order.storeId));
      }
      if (screenPhase) {
        setScreenVisible(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tick every second to re-evaluate cooldown expiry
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Only dispatch to available motoboys; respect 60s per-motoboy cooldown after rejection
  const activeEntry = (status === 'available' && activeMotoboyId)
    ? dispatchQueue.find(e => {
        const cooldown = e.cooldownByMotoboyId[activeMotoboyId];
        if (cooldown && Date.now() - cooldown < 60000) return false;
        return true;
      })
    : undefined;

  // Resolve the orders for the pending notification
  const pendingNotificationOrders: Order[] = activeEntry
    ? activeEntry.orderIds
        .map(id => allOrders.find(o => o.id === id))
        .filter((o): o is Order => Boolean(o))
    : [];

  // Also derive the pending route object (for routeId)
  const pendingRoute = activeEntry
    ? pendingRoutes.find(r => r.id === activeEntry.routeId) ?? null
    : null;

  // Stacking: offer a 2nd delivery from the same store while in coleta or pickup phase
  const [stackingDismissed, setStackingDismissed] = useState<Set<string>>(new Set());
  const canStack =
    status === 'on_route' &&
    (screenPhase === 'coleta' || screenPhase === 'pickup') &&
    activeMotoboyId &&
    activeOrders.length === 1;

  const stackEntry = canStack
    ? dispatchQueue.find(e => {
        if (stackingDismissed.has(e.routeId)) return false;
        const cooldown = e.cooldownByMotoboyId[activeMotoboyId!];
        if (cooldown && Date.now() - cooldown < 60000) return false;
        const stackOrders = e.orderIds.map(id => allOrders.find(o => o.id === id)).filter(Boolean);
        if (stackOrders.length === 0) return false;
        // Must be same store as current delivery
        return stackOrders[0]?.storeId === activeOrders[0]?.storeId;
      })
    : undefined;

  const stackOrder = stackEntry
    ? (allOrders.find(o => o.id === stackEntry.orderIds[0]) ?? null)
    : null;

  const handleAcceptStack = () => {
    if (!stackEntry || !stackOrder || !activeRouteId) return;
    const firstOrder = activeOrders[0];
    const firstDist = firstOrder?.distanceKm ?? 3;
    const between = haversineKm(
      [firstOrder?.deliveryCoords?.lat ?? 0, firstOrder?.deliveryCoords?.lng ?? 0],
      [stackOrder.deliveryCoords?.lat ?? 0, stackOrder.deliveryCoords?.lng ?? 0],
    );
    const addValue = calcDoubleRouteValues(firstDist + between).order2Value;
    updateOrderStatus(stackOrder.id, 'motoboy_accepted');
    acceptDispatch(stackEntry.routeId);
    addOrderToActiveRoute(activeRouteId, stackOrder.id);
    setActiveOrders(prev => [...prev, stackOrder]);
    addValueToCurrentRoute(addValue);
    setStackingDismissed(prev => new Set([...prev, stackEntry.routeId]));
  };

  const handleRejectStack = () => {
    if (!stackEntry) return;
    setStackingDismissed(prev => new Set([...prev, stackEntry.routeId]));
  };

  const handleAcceptRoute = (orders: Order[], routeId: string) => {
    const firstOrder = orders[0];
    const store = mockStores.find(s => s.id === firstOrder.storeId);
    const totalValue = orders.reduce((sum, o) => sum + (o.motoRideValue ?? 8.5), 0);

    // Mark all orders as motoboy_accepted
    for (const order of orders) {
      updateOrderStatus(order.id, 'motoboy_accepted');
    }
    acceptDispatch(routeId);
    startRoute({
      from: firstOrder.storeName || store?.name || `Loja #${firstOrder.storeId}`,
      to: firstOrder.deliveryAddress
        ? `${firstOrder.deliveryAddress.logradouro}, ${firstOrder.deliveryAddress.numero} - ${firstOrder.deliveryAddress.bairro}`
        : 'Destino',
      value: totalValue,
      storeAddress: firstOrder.storeAddress || store?.address,
    });
    setActiveOrderId(firstOrder.id);
    setActiveOrder(firstOrder);
    setActiveOrders(orders);
    setActiveRouteId(routeId);
    setDeliveryOrderIndex(0);
    setDeliveredOrderIds(new Set());
    setActiveStore(store);
    setScreenPhase('coleta');
    setScreenVisible(true);
  };

  const handleArrivedAtPickup = () => {
    for (const order of activeOrders) {
      updateOrderStatus(order.id, 'motoboy_at_store');
    }
    setScreenPhase('pickup');
    setScreenVisible(true);
  };

  const handleConclude = () => {
    setScreenPhase('conclude');
    setScreenVisible(true);
  };

  const handleCollected = () => {
    // First order in the list is active (on_the_way).
    // Remaining orders wait with a new status that tells the client
    // "motoboy left the store but is doing another delivery first".
    activeOrders.forEach((order, i) => {
      updateOrderStatus(order.id, i === 0 ? 'on_the_way' : 'motoboy_doing_other_delivery');
    });
    setDeliveryOrderIndex(0);
    setScreenPhase('entrega');
    setScreenVisible(true);
  };

  const handleDeliveryArrived = () => {
    const currentDeliveryOrder = activeOrders[deliveryOrderIndex];
    if (currentDeliveryOrder) {
      updateOrderStatus(currentDeliveryOrder.id, 'motoboy_arrived');
    }
    setScreenPhase('chegada_entrega');
    setScreenVisible(true);
  };

  const handleFinalDelivery = () => {
    const currentDeliveryOrder = activeOrders[deliveryOrderIndex];
    if (currentDeliveryOrder) {
      updateOrderStatus(currentDeliveryOrder.id, 'delivered');
    }

    // Track which orders have been delivered by ID (not sequential index)
    const newDeliveredIds = new Set([...deliveredOrderIds, ...(currentDeliveryOrder ? [currentDeliveryOrder.id] : [])]);
    setDeliveredOrderIds(newDeliveredIds);

    // Find the next undelivered order (any that hasn't been delivered yet)
    const nextOrder = activeOrders.find(o => !newDeliveredIds.has(o.id));

    if (nextOrder) {
      // Move to next undelivered delivery — go to entrega screen first so the
      // motoboy navigates there, then confirms arrival separately.
      // Also promote the next order's status so the waiting client sees "a caminho".
      updateOrderStatus(nextOrder.id, 'on_the_way');
      const nextIndex = activeOrders.indexOf(nextOrder);
      setDeliveryOrderIndex(nextIndex);
      setActiveOrderId(nextOrder.id);
      setActiveOrder(nextOrder);
      setScreenPhase('entrega');
      setScreenVisible(true);
    } else {
      // All deliveries done
      if (activeMotoboyId) incrementCompleted(activeMotoboyId);
      finishRoute();
      setScreenPhase(null);
      setScreenVisible(false);
      setActiveOrderId(null);
      setActiveOrder(null);
      setActiveOrders([]);
      setActiveRouteId(null);
      setDeliveryOrderIndex(0);
      setDeliveredOrderIds(new Set());
      setActiveStore(undefined);
      setActiveTab('inicio');
    }
  };

  const handleRejectRoute = (routeId: string) => {
    rejectDispatch(routeId, activeMotoboyId ?? undefined);
    addRejection();
    if (activeMotoboyId) incrementRejected(activeMotoboyId);
  };

  // Called when the 15-minute pickup timer expires
  const handlePickupTimeout = () => {
    // Return all orders in the route to 'ready' so grouping engine re-queues them
    for (const order of activeOrders) {
      updateOrderStatus(order.id, 'ready');
    }
    if (activeRouteId) {
      timeoutDispatch(activeRouteId, activeMotoboyId ?? undefined);
    }
    cancelRoute();
    setActiveOrderId(null);
    setActiveOrder(null);
    setActiveOrders([]);
    setActiveRouteId(null);
    setDeliveryOrderIndex(0);
    setDeliveredOrderIds(new Set());
    setActiveStore(undefined);
    setScreenPhase(null);
    setScreenVisible(false);
    setActiveTab('inicio');
  };

  // Suppress unused tick warning
  void tick;

  // Publish motoboy GPS position via WebSocket while actively delivering
  const isDelivering = status === 'on_route' && (screenPhase === 'entrega' || screenPhase === 'chegada_entrega');
  usePublishLocation(activeOrder?.id ?? null, isDelivering);

  const navBg = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100';
  const navText = isDark ? 'text-gray-500' : 'text-gray-400';
  const navActive = 'text-primary';

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'inicio', label: 'Início', icon: <Home className="w-5 h-5" /> },
    { id: 'financeiro', label: 'Financeiro', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'ajuda', label: 'Ajuda', icon: <HelpCircle className="w-5 h-5" /> },
    { id: 'mais', label: 'Mais', icon: <MoreHorizontal className="w-5 h-5" /> },
  ];

  // Show loading or "not registered" while motoboy profile is being resolved
  if (!activeMotoboy) {
    const hasProfile = !isLoadingMotoboys && user && motoboys.some(mb => (mb as any).userId === user.id || mb.id === user.id);
    return (
      <div className="flex flex-col h-[calc(100vh-65px)] bg-gray-950 items-center justify-center p-6">
        <div className="text-center">
          <div className="text-5xl mb-4">🏍️</div>
          {isLoadingMotoboys ? (
            <>
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Carregando perfil...</p>
            </>
          ) : hasProfile ? (
            <>
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-3" />
              <p className="text-gray-400 text-sm">Iniciando sessão...</p>
            </>
          ) : (
            <>
              <h2 className="text-white text-xl font-bold mb-2">Perfil não encontrado</h2>
              <p className="text-gray-400 text-sm">Você não possui um perfil de motoboy cadastrado.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-[calc(100vh-65px)] ${isDark ? 'bg-gray-950' : 'bg-gray-50'}`}>
      {/* Coleta screen */}
      {screenPhase === 'coleta' && screenVisible && status === 'on_route' && currentRoute && activeOrderId && (
        <ColetaScreen
          orderId={activeOrderId}
          onGoHome={() => { setScreenVisible(false); setActiveTab('inicio'); }}
          onTimeout={handlePickupTimeout}
          onArrivedAtPickup={handleArrivedAtPickup}
        />
      )}

      {/* Pickup screen - shown after confirming arrival at store */}
      {screenPhase === 'pickup' && screenVisible && status === 'on_route' && activeOrder && (
        <PickupScreen
          order={activeOrder}
          orders={activeOrders}
          store={activeStore}
          onGoHome={() => { setScreenVisible(false); setActiveTab('inicio'); }}
          onConclude={handleConclude}
        />
      )}

      {/* Conclude coleta screen - shown after clicking "Coletar os pedidos" */}
      {screenPhase === 'conclude' && screenVisible && status === 'on_route' && activeOrders.length > 0 && (
        <ConcluirColetaScreen
          order={activeOrders[0]}
          orders={activeOrders}
          onGoHome={() => { setScreenVisible(false); setActiveTab('inicio'); }}
          onCollected={handleCollected}
        />
      )}

      {/* Entrega screen - shown after "Concluir a coleta" */}
      {screenPhase === 'entrega' && screenVisible && status === 'on_route' && activeOrders[deliveryOrderIndex] && (
        <EntregaScreen
          key={`entrega-${deliveryOrderIndex}-${activeOrders[deliveryOrderIndex]?.id}`}
          order={activeOrders[deliveryOrderIndex]}
          onGoHome={() => { setScreenVisible(false); setActiveTab('inicio'); }}
          onArrived={handleDeliveryArrived}
          deliveryIndex={deliveryOrderIndex}
          totalDeliveries={activeOrders.length}
          allOrders={activeOrders}
          onSelectDelivery={activeOrders.length > 1 ? (index) => {
            // Update statuses: chosen delivery → on_the_way, others → motoboy_doing_other_delivery
            activeOrders.forEach((o, i) => {
              if (!deliveredOrderIds.has(o.id)) {
                updateOrderStatus(o.id, i === index ? 'on_the_way' : 'motoboy_doing_other_delivery');
              }
            });
            setDeliveryOrderIndex(index);
            setActiveOrderId(activeOrders[index].id);
            setActiveOrder(activeOrders[index]);
          } : undefined}
        />
      )}

      {/* Chegada entrega screen - shown after "Cheguei na entrega" */}
      {screenPhase === 'chegada_entrega' && screenVisible && status === 'on_route' && activeOrders[deliveryOrderIndex] && (
        <ChegadaEntregaScreen
          key={`chegada-${deliveryOrderIndex}-${activeOrders[deliveryOrderIndex]?.id}`}
          order={activeOrders[deliveryOrderIndex]}
          onGoHome={() => { setScreenVisible(false); setActiveTab('inicio'); }}
          onLeave={handleFinalDelivery}
        />
      )}

      {/* Route notification modal - blocks all interaction */}
      {pendingNotificationOrders.length > 0 && activeEntry && (
        <RouteNotificationModal
          orders={pendingNotificationOrders}
          onAccept={() => handleAcceptRoute(pendingNotificationOrders, activeEntry.routeId)}
          onReject={() => handleRejectRoute(activeEntry.routeId)}
          rejectionCount={activeEntry.rejectionCount}
        />
      )}

      {/* Stacking modal — offered when motoboy is at pickup or en-route to store */}
      {stackOrder && stackEntry && !pendingNotificationOrders.length && (() => {
        const firstOrder = activeOrders[0];
        const stackBetweenKm = haversineKm(
          [firstOrder?.deliveryCoords?.lat ?? 0, firstOrder?.deliveryCoords?.lng ?? 0],
          [stackOrder.deliveryCoords?.lat ?? 0, stackOrder.deliveryCoords?.lng ?? 0],
        );
        return (
          <StackingModal
            stackOrder={stackOrder}
            currentRouteValue={activeOrders.reduce((s, o) => s + (o.motoRideValue ?? 8.5), 0)}
            currentRouteKm={firstOrder?.distanceKm ?? 3}
            betweenKm={stackBetweenKm}
            onAccept={handleAcceptStack}
            onReject={handleRejectStack}
          />
        );
      })()}

      {/* Content area */}
      <div className={`flex-1 overflow-y-auto ${activeTab === 'inicio' ? 'overflow-hidden' : ''}`}>
        {activeTab === 'inicio' && (
          <div className="h-full">
            <InicioTab
              isDark={isDark}
              onToggleDark={() => setIsDark(d => !d)}
              onOpenColeta={() => setScreenVisible(true)}
            />
          </div>
        )}
        {activeTab === 'financeiro' && <FinanceiroTab isDark={isDark} />}
        {activeTab === 'ajuda' && <AjudaTab isDark={isDark} />}
        {activeTab === 'mais' && <MaisTab isDark={isDark} />}
      </div>

      {/* Bottom navigation bar */}
      <nav className={`flex-shrink-0 ${navBg} border-t shadow-[0_-2px_12px_rgba(0,0,0,0.08)]`}>
        <div className="flex">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                data-testid={`tab-btn-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 transition-colors ${
                  isActive ? navActive : navText
                }`}
              >
                {tab.icon}
                <span className="text-[10px] font-medium leading-none">{tab.label}</span>
                {isActive && (
                  <span className="w-5 h-0.5 bg-primary rounded-full mt-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

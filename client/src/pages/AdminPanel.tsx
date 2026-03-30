/**
 * Admin Panel - Platform administration
 * Features: Platform overview, store management, client list, motoboy stats, categories, sales reports
 * All data is derived from real system state (orders, motoboy context, stores).
 */

import { useMarketplace } from '@/contexts/MarketplaceContext';
import { useMotoboy } from '@/contexts/MotoboyContext';
import { useMotoboyRegistry } from '@/contexts/MotoboyRegistryContext';
import { useProducts } from '@/contexts/ProductContext';
import { Button } from '@/components/ui/button';
import {
  Users, TrendingUp, ShoppingCart, DollarSign, Bike, Package, Headphones, History,
} from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { useSupport } from '@/contexts/SupportContext';
import { useNotification } from '@/contexts/NotificationContext';
import { Order, Store as StoreData } from '@/lib/mockData';

import { AdminMotoboy } from './AdminPanel/types';
import {
  statusLabel, statusIcon, fmtDateTime, formatDate,
  getTimestampForStatus, getDoubleRouteLabel, isDoubleRoute,
} from './AdminPanel/helpers';
import OverviewTab from './AdminPanel/OverviewTab';
import StoresTab from './AdminPanel/StoresTab';
import ClientsTab from './AdminPanel/ClientsTab';
import MotoboyTab from './AdminPanel/MotoboyTab';
import CategoriesTab from './AdminPanel/CategoriesTab';
import ReportsTab from './AdminPanel/ReportsTab';
import SupportTab from './AdminPanel/SupportTab';
import SupportHistoryTab from './AdminPanel/SupportHistoryTab';

export default function AdminPanel() {
  const { allOrders, totalSales, dispatchQueue, readyForPickupOrders, updateOrderStatus, activeDeliveryRoutes } = useMarketplace();
  const { addNotification } = useNotification();
  const motoboy = useMotoboy();
  const registry = useMotoboyRegistry();
  const { products } = useProducts();

  // ── Real store data fetched from seller profile ───────────────────────────
  const [realStores, setRealStores] = useState<StoreData[]>([]);
  useEffect(() => {
    fetch('/api/profiles/seller')
      .then(r => r.json())
      .then(profile => {
        if (profile?.storeName) {
          const bairro = profile.address?.bairro || '';
          const cidade = profile.address?.cidade || '';
          const location = [bairro, cidade].filter(Boolean).join(', ');
          setRealStores([{
            id: profile.storeId || 'store-1',
            name: profile.storeName,
            category: profile.storeCategory || '',
            rating: 0,
            reviews: 0,
            location,
            address: profile.address
              ? [profile.address.logradouro, profile.address.numero].filter(Boolean).join(', ')
              : undefined,
            description: profile.storeDescription || '',
            logo: profile.storeLogo || '🏪',
          }]);
        }
      })
      .catch(() => {});
  }, []);

  // ── Real categories derived from actual products ──────────────────────────
  const realCategories = useMemo(() => {
    const seen = new Set<string>();
    const cats: { id: string; name: string; icon: string; description: string; count: number }[] = [];
    for (const p of products) {
      if (!p.category) continue;
      if (seen.has(p.category)) {
        const existing = cats.find(c => c.name === p.category);
        if (existing) existing.count++;
      } else {
        seen.add(p.category);
        cats.push({ id: `cat-${p.category}`, name: p.category, icon: '📦', description: p.category, count: 1 });
      }
    }
    return cats;
  }, [products]);

  const [activeTab, setActiveTab] = useState<'overview' | 'stores' | 'clients' | 'motoboy' | 'categories' | 'reports' | 'support' | 'support_history'>('overview');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  // ── Motoboy management state ─────────────────────────────────────────────────
  const [balanceBonusMap, setBalanceBonusMap] = useState<Record<string, number>>({});
  const mbData: AdminMotoboy[] = registry.motoboys.map(mb => ({
    id: mb.id,
    name: mb.name,
    avatar: mb.avatar,
    phone: mb.phone,
    vehicle: mb.vehicle,
    licensePlate: mb.licensePlate,
    status: mb.status as AdminMotoboy['status'],
    blockInfo: mb.blockInfo
      ? { ...mb.blockInfo, until: mb.blockInfo.until ? new Date(mb.blockInfo.until) : undefined }
      : undefined,
    balanceBonus: balanceBonusMap[mb.id] ?? 0,
    completedToday: mb.id === registry.activeMotoboyId ? motoboy.todayRides : 0,
    completedTotal: mb.id === registry.activeMotoboyId ? motoboy.completedRoutes.length : mb.completedTotal,
    rejectedTotal: mb.id === registry.activeMotoboyId ? motoboy.totalRejectedRides : mb.rejectedTotal,
    joinedAt: mb.joinedAt,
    rating: mb.rating,
    isContextMotoboy: mb.id === registry.activeMotoboyId,
    currentRoute: mb.id === registry.activeMotoboyId && motoboy.currentRoute
      ? { from: motoboy.currentRoute.from, to: motoboy.currentRoute.to, orderId: motoboy.activeOrderId ?? undefined }
      : undefined,
  }));
  const [selectedMbId, setSelectedMbId] = useState<string | null>(null);
  const [mbDetailTab, setMbDetailTab] = useState<'profile' | 'orders'>('profile');
  const [balanceDialog, setBalanceDialog] = useState<{ mbId: string; mbName: string } | null>(null);
  const [balanceAmount, setBalanceAmount] = useState('');
  const [balanceType, setBalanceType] = useState<'add' | 'deduct'>('add');
  const [blockDialog, setBlockDialog] = useState<{ mbId: string; mbName: string } | null>(null);
  const [blockType, setBlockType] = useState<'permanent' | 'hours' | 'days'>('permanent');
  const [blockDuration, setBlockDuration] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [notifMbDialog, setNotifMbDialog] = useState<{ mbId: string; mbName: string } | null>(null);
  const [notifMbTitle, setNotifMbTitle] = useState('');
  const [notifMbBody, setNotifMbBody] = useState('');
  const [removeRouteConfirm, setRemoveRouteConfirm] = useState<string | null>(null);

  // ── Store management state ──────────────────────────────────────────────────
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [blockedStores, setBlockedStores] = useState<Set<string>>(new Set());
  const [deletedStores, setDeletedStores] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ storeId: string; storeName: string } | null>(null);
  const [notifDialog, setNotifDialog] = useState<{ storeId: string; storeName: string } | null>(null);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [storeOrderFilter, setStoreOrderFilter] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');

  const visibleStores = useMemo(() => realStores.filter(s => !deletedStores.has(s.id)), [realStores, deletedStores]);
  const selectedStore = selectedStoreId ? visibleStores.find(s => s.id === selectedStoreId) ?? null : null;

  const activeStatuses: Order['status'][] = ['pending', 'preparing', 'ready', 'ready_for_pickup', 'waiting_motoboy', 'motoboy_accepted', 'motoboy_at_store', 'on_the_way', 'motoboy_arrived'];

  const getStoreFilteredOrders = (storeId: string) => {
    const storeOrders = allOrders.filter(o => o.storeId === storeId);
    if (storeOrderFilter === 'active') return storeOrders.filter(o => activeStatuses.includes(o.status));
    if (storeOrderFilter === 'delivered') return storeOrders.filter(o => o.status === 'delivered');
    if (storeOrderFilter === 'cancelled') return storeOrders.filter(o => o.status === 'cancelled');
    return storeOrders;
  };

  const handleDeleteStore = () => {
    if (!deleteConfirm) return;
    setDeletedStores(prev => { const next = new Set(prev); next.add(deleteConfirm.storeId); return next; });
    if (selectedStoreId === deleteConfirm.storeId) setSelectedStoreId(null);
    toast.success(`Loja "${deleteConfirm.storeName}" excluída da plataforma.`);
    setDeleteConfirm(null);
  };

  const handleToggleBlock = (storeId: string, storeName: string) => {
    setBlockedStores(prev => {
      const next = new Set(prev);
      if (next.has(storeId)) {
        next.delete(storeId);
        toast.success(`Loja "${storeName}" reativada.`);
      } else {
        next.add(storeId);
        toast.warning(`Loja "${storeName}" bloqueada.`);
      }
      return next;
    });
  };

  const handleSendNotification = () => {
    if (!notifDialog || !notifTitle.trim() || !notifBody.trim()) return;
    addNotification({
      target: 'seller',
      icon: '📢',
      title: notifTitle.trim(),
      body: notifBody.trim(),
    });
    toast.success(`Notificação enviada para "${notifDialog.storeName}"`);
    setNotifDialog(null);
    setNotifTitle('');
    setNotifBody('');
  };

  const handleAdminOrderStatus = (orderId: string, status: Order['status']) => {
    updateOrderStatus(orderId, status);

    const order = allOrders.find(o => o.id === orderId);

    if (status === 'delivered' && order && !order.isPickup) {
      motoboy.completeOrderDelivery({
        id: order.id,
        total: order.total,
        storeName: order.storeName,
        storeId: order.storeId,
        deliveryAddress: order.deliveryAddress,
      });
    }

    if (status === 'cancelled') {
      motoboy.cancelOrderDelivery(orderId);
    }

    toast.success(`Status do pedido #${orderId.slice(-5).toUpperCase()} atualizado para "${statusLabel(status)}".`);
  };

  // ── Motoboy management computed state ──────────────────────────────────────
  const selectedMb = selectedMbId ? mbData.find(m => m.id === selectedMbId) ?? null : null;
  const mbListWithContext = mbData;

  const handleMbBalance = () => {
    if (!balanceDialog) return;
    const amount = parseFloat(balanceAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Insira um valor válido.'); return; }
    setBalanceBonusMap(prev => {
      const current = prev[balanceDialog.mbId] ?? 0;
      return { ...prev, [balanceDialog.mbId]: balanceType === 'add' ? current + amount : Math.max(0, current - amount) };
    });
    if (balanceDialog.mbId === registry.activeMotoboyId) {
      motoboy.addMotoboyNotification(
        balanceType === 'add'
          ? `Bônus de R$ ${amount.toFixed(2)} creditado pelo administrador.`
          : `Valor de R$ ${amount.toFixed(2)} debitado do seu saldo pelo administrador.`
      );
    }
    toast.success(`Saldo de ${balanceDialog.mbName} ${balanceType === 'add' ? 'creditado' : 'debitado'}: R$ ${amount.toFixed(2)}`);
    setBalanceDialog(null);
    setBalanceAmount('');
    setBalanceType('add');
  };

  const handleMbBlock = () => {
    if (!blockDialog) return;
    if (!blockReason.trim()) { toast.error('Informe o motivo do bloqueio.'); return; }
    if (blockType !== 'permanent' && (!blockDuration || isNaN(parseInt(blockDuration)) || parseInt(blockDuration) <= 0)) {
      toast.error('Informe a duração válida.'); return;
    }
    let until: string | undefined;
    if (blockType === 'hours') { until = new Date(Date.now() + parseInt(blockDuration) * 3600000).toISOString(); }
    if (blockType === 'days') { until = new Date(Date.now() + parseInt(blockDuration) * 86400000).toISOString(); }
    registry.updateMotoboyBlockInfo(blockDialog.mbId, { type: blockType, until, reason: blockReason.trim() });
    if (blockDialog.mbId === registry.activeMotoboyId) {
      motoboy.addMotoboyNotification(
        `Sua conta foi bloqueada pelo administrador. Motivo: ${blockReason.trim()}`
      );
    }
    toast.warning(`${blockDialog.mbName} bloqueado(a).`);
    setBlockDialog(null);
    setBlockReason('');
    setBlockDuration('');
    setBlockType('permanent');
  };

  const handleMbUnblock = (mbId: string, mbName: string) => {
    registry.updateMotoboyBlockInfo(mbId, undefined);
    if (mbId === registry.activeMotoboyId) {
      motoboy.addMotoboyNotification('Sua conta foi desbloqueada pelo administrador.');
    }
    toast.success(`${mbName} desbloqueado(a).`);
  };

  const handleMbRemoveRoute = (mbId: string) => {
    if (mbId === registry.activeMotoboyId) {
      motoboy.cancelRoute();
      motoboy.addMotoboyNotification('Sua rota atual foi removida pelo administrador.');
    } else {
      registry.updateMotoboyStatus(mbId, 'available');
    }
    setRemoveRouteConfirm(null);
    toast.success('Rota do motoboy removida.');
  };

  const handleMbSendNotif = () => {
    if (!notifMbDialog || !notifMbTitle.trim() || !notifMbBody.trim()) return;
    if (notifMbDialog.mbId === registry.activeMotoboyId) {
      motoboy.addMotoboyNotification(`${notifMbTitle.trim()}: ${notifMbBody.trim()}`);
    }
    addNotification({ target: 'seller', icon: '📢', title: notifMbTitle.trim(), body: notifMbBody.trim() });
    toast.success(`Notificação enviada para ${notifMbDialog.mbName}.`);
    setNotifMbDialog(null);
    setNotifMbTitle('');
    setNotifMbBody('');
  };

  const handleMbMarkDelivered = (orderId: string) => {
    handleAdminOrderStatus(orderId, 'delivered');
    toast.success(`Pedido #${orderId.slice(-5).toUpperCase()} marcado como entregue.`);
  };

  // Support
  const { tickets, startChat, sendMessage, resolveTicket } = useSupport();
  const pendingTickets = tickets.filter(t => t.status === 'pending' || t.status === 'in_chat');
  const resolvedTickets = tickets.filter(t => t.status === 'resolved');
  const [adminChatInput, setAdminChatInput] = useState<Record<string, string>>({});
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  const toggleOrderExpand = (id: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ─── KPI Metrics ────────────────────────────────────────────────────────────
  const totalStores = realStores.length;
  const totalOrdersCount = allOrders.length;
  const deliveredOrders = allOrders.filter(o => o.status === 'delivered').length;

  // ─── Tendência de Vendas — last 7 days from real orders ─────────────────────
  const salesData = useMemo(() => {
    const days: { label: string; date: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        label: d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
        date: d.toISOString().slice(0, 10),
      });
    }
    return days.map(({ label, date }) => {
      const dayOrders = allOrders.filter(o => (o.createdAt || '').slice(0, 10) === date);
      return {
        name: label,
        vendas: parseFloat(dayOrders.reduce((s, o) => s + o.total, 0).toFixed(2)),
        pedidos: dayOrders.length,
      };
    });
  }, [allOrders]);

  // ─── Store Performance — real order data ────────────────────────────────────
  const storePerformance = useMemo(() =>
    realStores.map(store => {
      const storeOrders = allOrders.filter(o => o.storeId === store.id);
      return {
        name: store.name,
        vendas: parseFloat(storeOrders.reduce((s, o) => s + o.total, 0).toFixed(2)),
        pedidos: storeOrders.length,
      };
    }),
    [realStores, allOrders]
  );

  // ─── Unique clients derived from orders ─────────────────────────────────────
  const clients = useMemo(() => {
    const map = new Map<string, {
      name: string; email: string; phone?: string;
      orders: number; total: number; lastOrder: string;
    }>();
    for (const o of allOrders) {
      const key = o.customerEmail || o.customerName;
      if (!map.has(key)) {
        map.set(key, { name: o.customerName, email: o.customerEmail, phone: o.customerPhone, orders: 0, total: 0, lastOrder: o.createdAt || '' });
      }
      const c = map.get(key)!;
      c.orders++;
      c.total += o.total;
      if ((o.createdAt || '') > c.lastOrder) c.lastOrder = o.createdAt || '';
    }
    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [allOrders]);

  // ── Bound helper wrappers for tabs that need closure-based versions ──────────
  const boundGetDoubleRouteLabel = (order: Order) => getDoubleRouteLabel(order, activeDeliveryRoutes, allOrders);
  const boundIsDoubleRoute = (order: Order) => isDoubleRoute(order, activeDeliveryRoutes);
  const boundGetTimestampForStatus = (order: Order, status: string) => getTimestampForStatus(order, status);

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-display font-bold text-foreground mb-2">Painel Administrativo</h2>
          <p className="text-muted-foreground">Gerenciar a plataforma de marketplace</p>

          {/* Tab Navigation */}
          <div className="flex flex-wrap gap-2 bg-secondary rounded-lg p-1 w-fit mt-6">
            {([
              { key: 'overview', label: 'Visão Geral', icon: <TrendingUp className="w-4 h-4" /> },
              { key: 'stores',   label: 'Lojas',       icon: <ShoppingCart className="w-4 h-4" /> },
              { key: 'clients',  label: 'Clientes',    icon: <Users className="w-4 h-4" /> },
              { key: 'motoboy',  label: 'Motoboy',     icon: <Bike className="w-4 h-4" /> },
              { key: 'categories', label: 'Categorias', icon: <Package className="w-4 h-4" /> },
              { key: 'reports',  label: 'Relatórios',  icon: <DollarSign className="w-4 h-4" /> },
              { key: 'support',  label: 'Suporte', icon: <Headphones className="w-4 h-4" /> },
              { key: 'support_history', label: 'Histórico de Suporte', icon: <History className="w-4 h-4" /> },
            ] as const).map(tab => (
              <Button
                key={tab.key}
                variant={activeTab === tab.key ? 'default' : 'ghost'}
                onClick={() => setActiveTab(tab.key)}
                className="gap-2 relative"
              >
                {tab.icon}
                {tab.label}
                {tab.key === 'support' && pendingTickets.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {pendingTickets.length}
                  </span>
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* ── Overview Tab ──────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <OverviewTab
            totalSales={totalSales}
            totalStores={totalStores}
            totalOrdersCount={totalOrdersCount}
            deliveredOrders={deliveredOrders}
            clientsCount={clients.length}
            dispatchQueue={dispatchQueue}
            readyForPickupOrders={readyForPickupOrders}
            allOrders={allOrders}
            salesData={salesData}
            storePerformance={storePerformance}
          />
        )}

        {/* ── Stores Tab ────────────────────────────────────────────────────── */}
        {activeTab === 'stores' && (
          <StoresTab
            allOrders={allOrders}
            activeStatuses={activeStatuses}
            visibleStores={visibleStores}
            selectedStore={selectedStore}
            selectedStoreId={selectedStoreId}
            setSelectedStoreId={setSelectedStoreId}
            blockedStores={blockedStores}
            deleteConfirm={deleteConfirm}
            setDeleteConfirm={setDeleteConfirm}
            notifDialog={notifDialog}
            setNotifDialog={setNotifDialog}
            notifTitle={notifTitle}
            setNotifTitle={setNotifTitle}
            notifBody={notifBody}
            setNotifBody={setNotifBody}
            storeOrderFilter={storeOrderFilter}
            setStoreOrderFilter={setStoreOrderFilter}
            expandedOrders={expandedOrders}
            setExpandedOrders={setExpandedOrders}
            getStoreFilteredOrders={getStoreFilteredOrders}
            handleDeleteStore={handleDeleteStore}
            handleToggleBlock={handleToggleBlock}
            handleSendNotification={handleSendNotification}
            handleAdminOrderStatus={handleAdminOrderStatus}
            statusLabel={statusLabel}
            statusIcon={statusIcon}
            getDoubleRouteLabel={boundGetDoubleRouteLabel}
            isDoubleRoute={boundIsDoubleRoute}
            formatDate={formatDate}
          />
        )}

        {/* ── Clients Tab ───────────────────────────────────────────────────── */}
        {activeTab === 'clients' && (
          <ClientsTab
            clients={clients}
            allOrders={allOrders}
            formatDate={formatDate}
          />
        )}

        {/* ── Motoboy Tab ───────────────────────────────────────────────────── */}
        {activeTab === 'motoboy' && (
          <MotoboyTab
            mbListWithContext={mbListWithContext}
            selectedMbId={selectedMbId}
            setSelectedMbId={setSelectedMbId}
            selectedMb={selectedMb}
            mbDetailTab={mbDetailTab}
            setMbDetailTab={setMbDetailTab}
            balanceDialog={balanceDialog}
            setBalanceDialog={setBalanceDialog}
            balanceAmount={balanceAmount}
            setBalanceAmount={setBalanceAmount}
            balanceType={balanceType}
            setBalanceType={setBalanceType}
            blockDialog={blockDialog}
            setBlockDialog={setBlockDialog}
            blockType={blockType}
            setBlockType={setBlockType}
            blockDuration={blockDuration}
            setBlockDuration={setBlockDuration}
            blockReason={blockReason}
            setBlockReason={setBlockReason}
            notifMbDialog={notifMbDialog}
            setNotifMbDialog={setNotifMbDialog}
            notifMbTitle={notifMbTitle}
            setNotifMbTitle={setNotifMbTitle}
            notifMbBody={notifMbBody}
            setNotifMbBody={setNotifMbBody}
            removeRouteConfirm={removeRouteConfirm}
            setRemoveRouteConfirm={setRemoveRouteConfirm}
            handleMbBalance={handleMbBalance}
            handleMbBlock={handleMbBlock}
            handleMbUnblock={handleMbUnblock}
            handleMbRemoveRoute={handleMbRemoveRoute}
            handleMbSendNotif={handleMbSendNotif}
            handleMbMarkDelivered={handleMbMarkDelivered}
            expandedOrders={expandedOrders}
            toggleOrderExpand={toggleOrderExpand}
            motoboyCompletedRoutes={motoboy.completedRoutes}
            allOrders={allOrders}
            statusLabel={statusLabel}
            statusIcon={statusIcon}
            fmtDateTime={fmtDateTime}
            formatDate={formatDate}
          />
        )}

        {/* ── Categories Tab ────────────────────────────────────────────────── */}
        {activeTab === 'categories' && (
          <CategoriesTab
            realCategories={realCategories}
            products={products}
            allOrders={allOrders}
          />
        )}

        {/* ── Reports Tab ───────────────────────────────────────────────────── */}
        {activeTab === 'reports' && (
          <ReportsTab
            realStores={realStores}
            allOrders={allOrders}
            totalSales={totalSales}
            expandedOrders={expandedOrders}
            toggleOrderExpand={toggleOrderExpand}
            statusLabel={statusLabel}
            statusIcon={statusIcon}
            getDoubleRouteLabel={boundGetDoubleRouteLabel}
            isDoubleRoute={boundIsDoubleRoute}
            formatDate={formatDate}
            fmtDateTime={fmtDateTime}
            getTimestampForStatus={boundGetTimestampForStatus}
          />
        )}

        {/* ── Support Tab ──────────────────────────────────────────────────── */}
        {activeTab === 'support' && (
          <SupportTab
            pendingTickets={pendingTickets}
            startChat={startChat}
            sendMessage={sendMessage}
            resolveTicket={resolveTicket}
            activeChatId={activeChatId}
            setActiveChatId={setActiveChatId}
            adminChatInput={adminChatInput}
            setAdminChatInput={setAdminChatInput}
          />
        )}

        {/* ── Support History Tab ───────────────────────────────────────────── */}
        {activeTab === 'support_history' && (
          <SupportHistoryTab
            resolvedTickets={resolvedTickets}
          />
        )}
      </div>
    </div>
  );
}

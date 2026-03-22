/**
 * Admin Panel - Platform administration
 * Features: Platform overview, store management, client list, motoboy stats, categories, sales reports
 * All data is derived from real system state (orders, motoboy context, stores).
 */

import { useMarketplace } from '@/contexts/MarketplaceContext';
import { useMotoboy } from '@/contexts/MotoboyContext';
import { mockStores, mockCategories } from '@/lib/mockData';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import {
  Users, TrendingUp, ShoppingCart, DollarSign,
  AlertCircle, Bike, Clock, User, Package, MapPin, Phone, Mail,
  CheckCircle, CalendarClock, Store, CreditCard, Navigation, ChefHat, KeyRound,
  Headphones, MessageCircle, Send, History, Trash2, Bell, ArrowLeft,
  ShieldOff, ShieldCheck, Eye, Filter,
  Plus, Minus, Ban, Star, Wallet, UserX, UserCheck, XCircle, ChevronRight,
} from 'lucide-react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useSupport } from '@/contexts/SupportContext';
import { useNotification } from '@/contexts/NotificationContext';
import { Order } from '@/lib/mockData';

interface AdminMotoboy {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  vehicle: string;
  licensePlate: string;
  status: 'available' | 'on_route' | 'unavailable' | 'blocked';
  blockInfo?: { type: 'permanent' | 'hours' | 'days'; until?: Date; reason: string };
  balanceBonus: number;
  completedToday: number;
  completedTotal: number;
  rejectedTotal: number;
  currentRoute?: { from: string; to: string; orderId?: string };
  joinedAt: string;
  rating: number;
  isContextMotoboy?: boolean;
}

const INITIAL_MB_DATA: AdminMotoboy[] = [
  { id: 'mb-ctx', name: 'João Motoboy', avatar: '🏍️', phone: '(11) 91234-5678', vehicle: 'Honda CG 160', licensePlate: 'ABC-1D34', status: 'unavailable', balanceBonus: 0, completedToday: 0, completedTotal: 0, rejectedTotal: 0, joinedAt: '2024-01-15', rating: 4.8, isContextMotoboy: true },
  { id: 'mb-1', name: 'Carlos Souza', avatar: '🏍️', phone: '(11) 99876-5432', vehicle: 'Yamaha Factor 125', licensePlate: 'DEF-5E78', status: 'on_route', balanceBonus: 0, completedToday: 3, completedTotal: 142, rejectedTotal: 5, joinedAt: '2023-08-20', rating: 4.6, currentRoute: { from: 'Papelaria Premium', to: 'Rua das Magnólias, 234' } },
  { id: 'mb-2', name: 'Ana Lima', avatar: '🛵', phone: '(11) 98765-4321', vehicle: 'Honda Biz 125', licensePlate: 'GHI-9F12', status: 'available', balanceBonus: 0, completedToday: 5, completedTotal: 89, rejectedTotal: 2, joinedAt: '2023-11-10', rating: 4.9 },
  { id: 'mb-3', name: 'Pedro Costa', avatar: '🏍️', phone: '(11) 97654-3210', vehicle: 'Suzuki Yes 125', licensePlate: 'JKL-3G56', status: 'blocked', balanceBonus: 0, completedToday: 0, completedTotal: 67, rejectedTotal: 12, joinedAt: '2023-05-01', rating: 3.8, blockInfo: { type: 'permanent', reason: 'Comportamento inadequado com cliente' } },
  { id: 'mb-4', name: 'Mariana Oliveira', avatar: '🛵', phone: '(11) 96543-2109', vehicle: 'Honda Pop 110i', licensePlate: 'MNO-7H90', status: 'unavailable', balanceBonus: 0, completedToday: 1, completedTotal: 231, rejectedTotal: 8, joinedAt: '2022-12-01', rating: 4.7 },
];

export default function AdminPanel() {
  const { allOrders, totalSales, dispatchQueue, readyForPickupOrders, updateOrderStatus } = useMarketplace();
  const { addNotification } = useNotification();
  const motoboy = useMotoboy();
  const [activeTab, setActiveTab] = useState<'overview' | 'stores' | 'clients' | 'motoboy' | 'categories' | 'reports' | 'support' | 'support_history'>('overview');
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  // ── Store management state ──────────────────────────────────────────────────
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [blockedStores, setBlockedStores] = useState<Set<string>>(new Set());
  const [deletedStores, setDeletedStores] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ storeId: string; storeName: string } | null>(null);
  const [notifDialog, setNotifDialog] = useState<{ storeId: string; storeName: string } | null>(null);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [storeOrderFilter, setStoreOrderFilter] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');

  const visibleStores = useMemo(() => mockStores.filter(s => !deletedStores.has(s.id)), [deletedStores]);
  const selectedStore = selectedStoreId ? visibleStores.find(s => s.id === selectedStoreId) ?? null : null;

  const activeStatuses: Order['status'][] = ['pending', 'preparing', 'ready', 'ready_for_pickup', 'waiting_motoboy', 'motoboy_accepted', 'motoboy_at_store', 'on_the_way'];

  const getStoreFilteredOrders = (storeId: string) => {
    const storeOrders = allOrders.filter(o => o.storeId === storeId);
    if (storeOrderFilter === 'active') return storeOrders.filter(o => activeStatuses.includes(o.status));
    if (storeOrderFilter === 'delivered') return storeOrders.filter(o => o.status === 'delivered');
    if (storeOrderFilter === 'cancelled') return storeOrders.filter(o => o.status === 'cancelled');
    return storeOrders;
  };

  const handleDeleteStore = () => {
    if (!deleteConfirm) return;
    setDeletedStores(prev => new Set([...prev, deleteConfirm.storeId]));
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

  // Support
  const { tickets, startChat, sendMessage, resolveTicket } = useSupport();
  const pendingTickets = tickets.filter(t => t.status === 'pending' || t.status === 'in_chat');
  const resolvedTickets = tickets.filter(t => t.status === 'resolved');
  const [adminChatInput, setAdminChatInput] = useState<Record<string, string>>({});
  const adminChatEndRef = useRef<HTMLDivElement>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);

  useEffect(() => {
    adminChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChatId, tickets]);

  const toggleOrderExpand = (id: string) => {
    setExpandedOrders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const getTimestampForStatus = (order: { statusHistory?: { status: string; timestamp: string }[] }, status: string): string | null => {
    if (!order.statusHistory) return null;
    return order.statusHistory.find(e => e.status === status)?.timestamp ?? null;
  };

  const fmtDateTime = (ts: string | null | undefined): string => {
    if (!ts) return '—';
    const d = new Date(ts);
    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const statusLabel = (s: string) => ({
    pending: 'Pendente', preparing: 'Preparando', ready: 'Pronto',
    ready_for_pickup: 'Pronto para retirada', waiting_motoboy: 'Aguardando motoboy',
    motoboy_accepted: 'Motoboy a caminho', motoboy_at_store: 'Motoboy na loja',
    on_the_way: 'Motoboy saiu para entrega', delivered: 'Entregue', cancelled: 'Cancelado',
  }[s] ?? s);

  const statusIcon = (s: string) => {
    switch (s) {
      case 'pending': return <Clock className="w-3.5 h-3.5 text-yellow-600" />;
      case 'preparing': return <ChefHat className="w-3.5 h-3.5 text-orange-500" />;
      case 'ready': return <Package className="w-3.5 h-3.5 text-green-600" />;
      case 'ready_for_pickup': return <Store className="w-3.5 h-3.5 text-teal-600" />;
      case 'waiting_motoboy': return <Bike className="w-3.5 h-3.5 text-purple-600" />;
      case 'motoboy_accepted': return <Navigation className="w-3.5 h-3.5 text-indigo-600" />;
      case 'motoboy_at_store': return <Navigation className="w-3.5 h-3.5 text-teal-600" />;
      case 'on_the_way': return <Navigation className="w-3.5 h-3.5 text-green-600" />;
      case 'delivered': return <CheckCircle className="w-3.5 h-3.5 text-blue-600" />;
      case 'cancelled': return <AlertCircle className="w-3.5 h-3.5 text-red-600" />;
      default: return <Package className="w-3.5 h-3.5 text-gray-600" />;
    }
  };

  // ─── KPI Metrics ────────────────────────────────────────────────────────────
  const totalStores = mockStores.length;
  const totalCategories = mockCategories.length;
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
    mockStores.map(store => {
      const storeOrders = allOrders.filter(o => o.storeId === store.id);
      return {
        name: store.name,
        vendas: parseFloat(storeOrders.reduce((s, o) => s + o.total, 0).toFixed(2)),
        pedidos: storeOrders.length,
      };
    }),
    [allOrders]
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


  const formatDate = (iso: string) => {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }); }
    catch { return iso; }
  };

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
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Vendas Totais</p>
                    <p className="text-3xl font-bold text-primary">R$ {totalSales.toFixed(2)}</p>
                  </div>
                  <DollarSign className="w-12 h-12 text-accent opacity-20" />
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Lojas Ativas</p>
                    <p className="text-3xl font-bold text-primary">{totalStores}</p>
                  </div>
                  <ShoppingCart className="w-12 h-12 text-accent opacity-20" />
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total de Pedidos</p>
                    <p className="text-3xl font-bold text-primary">{totalOrdersCount}</p>
                    <p className="text-xs text-muted-foreground mt-1">{deliveredOrders} entregues</p>
                  </div>
                  <Package className="w-12 h-12 text-accent opacity-20" />
                </div>
              </Card>

              <Card className="p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Clientes</p>
                    <p className="text-3xl font-bold text-primary">{clients.length}</p>
                    <p className="text-xs text-muted-foreground mt-1">compradores únicos</p>
                  </div>
                  <Users className="w-12 h-12 text-accent opacity-20" />
                </div>
              </Card>
            </div>

            {/* Motoboy dispatch queue */}
            {dispatchQueue.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Bike className="w-5 h-5 text-purple-600" />
                  Fila de Despacho — Motoboy
                </h3>
                <div className="space-y-3">
                  {dispatchQueue.map(entry => {
                    const order = readyForPickupOrders.find(o => o.id === entry.orderId);
                    const cooldownRemaining = entry.lastRejectedAt
                      ? Math.max(0, 60 - Math.floor((Date.now() - entry.lastRejectedAt) / 1000))
                      : 0;
                    return (
                      <Card key={entry.orderId} className="p-4 border-l-4 border-purple-500">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div>
                            <p className="font-mono text-sm font-bold text-foreground">Pedido #{entry.orderId}</p>
                            {order && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Cliente: {order.customerName} · Loja: {order.storeName || order.storeId}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {entry.rejectionCount > 0 && (
                              <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                {entry.rejectionCount} recusa{entry.rejectionCount > 1 ? 's' : ''}
                              </Badge>
                            )}
                            {cooldownRemaining > 0 ? (
                              <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Tentando em {cooldownRemaining}s
                              </Badge>
                            ) : (
                              <Badge className="bg-purple-100 text-purple-800 flex items-center gap-1">
                                <Bike className="w-3 h-3" />
                                Procurando motoboy
                              </Badge>
                            )}
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Vendas — Últimos 7 dias</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" stroke="#6B7280" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#6B7280" />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }} />
                    <Legend />
                    <Line type="monotone" dataKey="vendas" name="Vendas (R$)" stroke="#1E40AF" strokeWidth={2} dot={{ fill: '#1E40AF' }} />
                    <Line type="monotone" dataKey="pedidos" name="Pedidos" stroke="#FBBF24" strokeWidth={2} dot={{ fill: '#FBBF24' }} />
                  </LineChart>
                </ResponsiveContainer>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Performance das Lojas</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={storePerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" stroke="#6B7280" angle={-20} textAnchor="end" height={60} tick={{ fontSize: 11 }} />
                    <YAxis stroke="#6B7280" />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }} />
                    <Legend />
                    <Bar dataKey="vendas" name="Vendas (R$)" fill="#1E40AF" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="pedidos" name="Pedidos" fill="#FBBF24" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </div>
        )}

        {/* ── Stores Tab ────────────────────────────────────────────────────── */}
        {activeTab === 'stores' && (
          <div className="space-y-6">

            {/* ── Store Detail View ── */}
            {selectedStore ? (
              <div className="space-y-6">
                {/* Back + Header */}
                <div className="flex flex-wrap items-center gap-4">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => { setSelectedStoreId(null); setStoreOrderFilter('all'); }}>
                    <ArrowLeft className="w-4 h-4" /> Voltar às Lojas
                  </Button>
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-3xl">{selectedStore.logo}</span>
                    <div>
                      <h3 className="text-xl font-bold text-foreground">{selectedStore.name}</h3>
                      <p className="text-sm text-muted-foreground">{selectedStore.category} · {selectedStore.location}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" className="gap-2"
                      onClick={() => setNotifDialog({ storeId: selectedStore.id, storeName: selectedStore.name })}>
                      <Bell className="w-4 h-4" /> Notificação
                    </Button>
                    <Button size="sm" variant="outline"
                      className={`gap-2 ${blockedStores.has(selectedStore.id) ? 'text-green-700 border-green-400' : 'text-orange-700 border-orange-400'}`}
                      onClick={() => handleToggleBlock(selectedStore.id, selectedStore.name)}>
                      {blockedStores.has(selectedStore.id) ? <><ShieldCheck className="w-4 h-4" /> Reativar</> : <><ShieldOff className="w-4 h-4" /> Bloquear</>}
                    </Button>
                    <Button size="sm" variant="outline" className="gap-2 text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => setDeleteConfirm({ storeId: selectedStore.id, storeName: selectedStore.name })}>
                      <Trash2 className="w-4 h-4" /> Excluir Loja
                    </Button>
                  </div>
                </div>

                {/* Store Stats Summary */}
                {(() => {
                  const storeOrders = allOrders.filter(o => o.storeId === selectedStore.id);
                  const storeSales = storeOrders.reduce((s, o) => s + o.total, 0);
                  const deliveredCount = storeOrders.filter(o => o.status === 'delivered').length;
                  const activeCount = storeOrders.filter(o => activeStatuses.includes(o.status)).length;
                  return (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <Card className="p-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Total de Pedidos</p>
                        <p className="text-2xl font-bold text-foreground">{storeOrders.length}</p>
                      </Card>
                      <Card className="p-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Em Andamento</p>
                        <p className="text-2xl font-bold text-orange-600">{activeCount}</p>
                      </Card>
                      <Card className="p-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Entregues</p>
                        <p className="text-2xl font-bold text-green-700">{deliveredCount}</p>
                      </Card>
                      <Card className="p-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Faturamento Total</p>
                        <p className="text-xl font-bold text-primary">R$ {storeSales.toFixed(2)}</p>
                      </Card>
                    </div>
                  );
                })()}

                {/* Store Info */}
                <Card className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Descrição</p>
                      <p className="text-foreground">{selectedStore.description}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Avaliação</p>
                      <p className="text-foreground font-semibold">{selectedStore.rating} ⭐ ({selectedStore.reviews} avaliações)</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      {blockedStores.has(selectedStore.id)
                        ? <Badge className="bg-red-100 text-red-800">Bloqueada</Badge>
                        : <Badge className="bg-green-100 text-green-800">Ativa</Badge>}
                    </div>
                  </div>
                </Card>

                {/* Order Filter + List */}
                <div>
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">Filtrar pedidos:</p>
                    {(['all', 'active', 'delivered', 'cancelled'] as const).map(f => (
                      <Button key={f} size="sm" variant={storeOrderFilter === f ? 'default' : 'outline'}
                        onClick={() => setStoreOrderFilter(f)}>
                        {f === 'all' ? 'Todos' : f === 'active' ? 'Em andamento' : f === 'delivered' ? 'Entregues' : 'Cancelados'}
                      </Button>
                    ))}
                  </div>

                  {(() => {
                    const filteredOrders = getStoreFilteredOrders(selectedStore.id);
                    if (filteredOrders.length === 0) {
                      return (
                        <Card className="p-10 text-center">
                          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                          <p className="text-muted-foreground">Nenhum pedido encontrado para este filtro.</p>
                        </Card>
                      );
                    }
                    return (
                      <div className="space-y-3">
                        {[...filteredOrders].reverse().map(order => {
                          const isExpanded = expandedOrders.has(`store-${order.id}`);
                          const isActive = activeStatuses.includes(order.status);
                          return (
                            <Card key={order.id} className={`overflow-hidden border-l-4 ${
                              order.status === 'delivered' ? 'border-green-500' :
                              order.status === 'cancelled' ? 'border-red-400' :
                              order.status === 'pending' ? 'border-yellow-400' :
                              'border-primary'
                            }`}>
                              {/* Order Header */}
                              <div className="px-4 py-3 flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2 min-w-[110px]">
                                  {statusIcon(order.status)}
                                  <span className="font-mono text-xs text-muted-foreground">#{order.id.slice(-6).toUpperCase()}</span>
                                </div>
                                <div className="flex-1 min-w-[120px]">
                                  <p className="font-semibold text-foreground text-sm">{order.customerName}</p>
                                  <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge className={`text-xs ${
                                    order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                    order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-blue-100 text-blue-800'
                                  }`}>
                                    {statusLabel(order.status)}
                                  </Badge>
                                  <span className="text-sm font-bold text-foreground">R$ {order.total.toFixed(2)}</span>
                                  <span className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</span>
                                </div>

                                {/* Status change (only for non-final statuses) */}
                                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                                  <Select
                                    value={order.status}
                                    onValueChange={(val) => handleAdminOrderStatus(order.id, val as Order['status'])}
                                  >
                                    <SelectTrigger className="w-[180px] h-8 text-xs" data-testid={`status-select-${order.id}`}>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">Pendente</SelectItem>
                                      <SelectItem value="preparing">Preparando</SelectItem>
                                      <SelectItem value="ready">Pronto (Entrega)</SelectItem>
                                      <SelectItem value="ready_for_pickup">Pronto (Retirada)</SelectItem>
                                      <SelectItem value="waiting_motoboy">Aguardando Motoboy</SelectItem>
                                      <SelectItem value="motoboy_accepted">Motoboy a caminho</SelectItem>
                                      <SelectItem value="motoboy_at_store">Motoboy na loja</SelectItem>
                                      <SelectItem value="on_the_way">Saiu para entrega</SelectItem>
                                      <SelectItem value="delivered">Entregue</SelectItem>
                                      <SelectItem value="cancelled">Cancelado</SelectItem>
                                    </SelectContent>
                                  </Select>
                                )}

                                <button
                                  className="text-xs text-primary hover:underline flex-shrink-0"
                                  onClick={() => {
                                    const key = `store-${order.id}`;
                                    setExpandedOrders(prev => {
                                      const next = new Set(prev);
                                      if (next.has(key)) next.delete(key); else next.add(key);
                                      return next;
                                    });
                                  }}
                                  data-testid={`expand-order-${order.id}`}
                                >
                                  {isExpanded ? '▲ Fechar' : '▼ Detalhes'}
                                </button>
                              </div>

                              {/* Expanded order detail */}
                              {isExpanded && (
                                <div className="border-t border-border bg-secondary/30 px-4 py-4 space-y-5">

                                  {/* Cliente */}
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Dados do Cliente</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                      <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                        <span className="text-foreground font-medium">{order.customerName}</span>
                                      </div>
                                      {order.customerEmail && (
                                        <div className="flex items-center gap-2">
                                          <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                          <span className="text-foreground">{order.customerEmail}</span>
                                        </div>
                                      )}
                                      {order.customerPhone && (
                                        <div className="flex items-center gap-2">
                                          <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                          <span className="text-foreground">{order.customerPhone}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Entrega */}
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Entrega</p>
                                    {order.isPickup ? (
                                      <div className="flex items-center gap-2 text-sm text-teal-700">
                                        <Store className="w-4 h-4" /> Retirada na loja
                                      </div>
                                    ) : (
                                      <div className="space-y-1 text-sm">
                                        <div className="flex items-center gap-2 text-orange-700">
                                          <Bike className="w-4 h-4" /> Entrega por motoboy
                                        </div>
                                        {order.deliveryAddress && (
                                          <div className="flex items-start gap-2 text-muted-foreground">
                                            <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                            <span>
                                              {order.deliveryAddress.logradouro}, {order.deliveryAddress.numero} —{' '}
                                              {order.deliveryAddress.bairro}, {order.deliveryAddress.cidade}/{order.deliveryAddress.uf}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Pagamento */}
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pagamento</p>
                                    <div className="flex items-center gap-2 text-sm">
                                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                                      {order.paymentStatus === 'paid'
                                        ? <Badge className="bg-green-100 text-green-800">Pago</Badge>
                                        : <Badge className="bg-amber-100 text-amber-800">Aguardando pagamento</Badge>}
                                    </div>
                                  </div>

                                  {/* Itens */}
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Itens do Pedido</p>
                                    <div className="space-y-1 text-sm">
                                      {order.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-foreground">
                                          <span>× {item.quantity} — prod. {item.productId.slice(-6)}</span>
                                          <span className="font-medium">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                      ))}
                                      <div className="flex justify-between font-bold text-foreground border-t border-border pt-1 mt-1">
                                        <span>Total</span>
                                        <span>R$ {order.total.toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Histórico de status */}
                                  {order.statusHistory && order.statusHistory.length > 0 && (
                                    <div>
                                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1">
                                        <CalendarClock className="w-3.5 h-3.5" /> Histórico de Status
                                      </p>
                                      <div className="space-y-2">
                                        {order.statusHistory.map((entry, idx) => (
                                          <div key={idx} className="flex items-start gap-3 text-sm">
                                            <div className="flex flex-col items-center">
                                              <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${idx === order.statusHistory!.length - 1 ? 'bg-primary' : 'bg-border'}`} />
                                              {idx < order.statusHistory!.length - 1 && <div className="w-0.5 h-5 bg-border mt-0.5" />}
                                            </div>
                                            <div className="flex-1 pb-1 flex items-center gap-2">
                                              {statusIcon(entry.status)}
                                              <span className="font-medium text-foreground">{statusLabel(entry.status)}</span>
                                              <span className="text-muted-foreground text-xs ml-auto">
                                                {new Date(entry.timestamp).toLocaleDateString('pt-BR')} às{' '}
                                                {new Date(entry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Código de entrega */}
                                  {order.deliveryCode && (
                                    <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
                                      <KeyRound className="w-4 h-4 text-primary flex-shrink-0" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Código de Entrega</p>
                                        <p className="font-mono font-bold text-lg tracking-widest text-primary">{order.deliveryCode}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </Card>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>

            ) : (
              /* ── Store Grid ── */
              <>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <p className="text-sm text-muted-foreground">
                    {visibleStores.length} loja{visibleStores.length !== 1 ? 's' : ''} cadastrada{visibleStores.length !== 1 ? 's' : ''} ·{' '}
                    {visibleStores.filter(s => blockedStores.has(s.id)).length} bloqueada{visibleStores.filter(s => blockedStores.has(s.id)).length !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {visibleStores.map(store => {
                    const storeOrders = allOrders.filter(o => o.storeId === store.id);
                    const storeSales = storeOrders.reduce((s, o) => s + o.total, 0);
                    const deliveredCount = storeOrders.filter(o => o.status === 'delivered').length;
                    const activeCount = storeOrders.filter(o => activeStatuses.includes(o.status)).length;
                    const isBlocked = blockedStores.has(store.id);

                    return (
                      <Card key={store.id} className={`p-6 hover:shadow-lg transition-all ${isBlocked ? 'opacity-60 border-red-200' : ''}`}>
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-4">
                            <div className="text-4xl">{store.logo}</div>
                            <div>
                              <h4 className="text-lg font-semibold text-foreground">{store.name}</h4>
                              <p className="text-sm text-muted-foreground">{store.category}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <MapPin className="w-3 h-3" /> {store.location}
                              </p>
                            </div>
                          </div>
                          {isBlocked
                            ? <Badge className="bg-red-100 text-red-800">Bloqueada</Badge>
                            : <Badge className="bg-green-100 text-green-800">Ativa</Badge>}
                        </div>

                        <p className="text-sm text-muted-foreground mb-4">{store.description}</p>

                        <div className="grid grid-cols-2 gap-3 mb-2 pb-3 border-b border-border text-center">
                          <div className="bg-secondary rounded-lg p-2">
                            <p className="text-xs text-muted-foreground">Rating</p>
                            <p className="font-semibold text-foreground">{store.rating} ⭐</p>
                          </div>
                          <div className="bg-secondary rounded-lg p-2">
                            <p className="text-xs text-muted-foreground">Avaliações</p>
                            <p className="font-semibold text-foreground">{store.reviews}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2 mb-4 text-center">
                          <div className="bg-secondary rounded-lg p-2">
                            <p className="text-xs text-muted-foreground">Pedidos</p>
                            <p className="font-bold text-foreground">{storeOrders.length}</p>
                          </div>
                          <div className="bg-secondary rounded-lg p-2">
                            <p className="text-xs text-muted-foreground">Ativos</p>
                            <p className="font-bold text-orange-600">{activeCount}</p>
                          </div>
                          <div className="bg-secondary rounded-lg p-2">
                            <p className="text-xs text-muted-foreground">Entregues</p>
                            <p className="font-bold text-green-700">{deliveredCount}</p>
                          </div>
                          <div className="bg-secondary rounded-lg p-2">
                            <p className="text-[10px] text-muted-foreground">Vendas</p>
                            <p className="font-bold text-primary text-xs">R$ {storeSales.toFixed(2)}</p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" className="gap-1.5 flex-1"
                            onClick={() => { setSelectedStoreId(store.id); setStoreOrderFilter('all'); }}
                            data-testid={`view-store-${store.id}`}>
                            <Eye className="w-3.5 h-3.5" /> Ver Pedidos
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1.5"
                            onClick={() => setNotifDialog({ storeId: store.id, storeName: store.name })}
                            data-testid={`notify-store-${store.id}`}>
                            <Bell className="w-3.5 h-3.5" /> Notificar
                          </Button>
                          <Button size="sm" variant="outline"
                            className={`gap-1.5 ${isBlocked ? 'text-green-700 border-green-300' : 'text-orange-700 border-orange-300'}`}
                            onClick={() => handleToggleBlock(store.id, store.name)}
                            data-testid={`block-store-${store.id}`}>
                            {isBlocked ? <><ShieldCheck className="w-3.5 h-3.5" /> Reativar</> : <><ShieldOff className="w-3.5 h-3.5" /> Bloquear</>}
                          </Button>
                          <Button size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() => setDeleteConfirm({ storeId: store.id, storeName: store.name })}
                            data-testid={`delete-store-${store.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}

            {/* ── Delete Confirmation Dialog ── */}
            <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-red-600">
                    <Trash2 className="w-5 h-5" /> Excluir Loja
                  </DialogTitle>
                </DialogHeader>
                <p className="text-foreground">
                  Tem certeza que deseja excluir a loja <span className="font-bold">"{deleteConfirm?.storeName}"</span> da plataforma?
                  Esta ação não pode ser desfeita.
                </p>
                <DialogFooter className="gap-2 mt-4">
                  <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
                  <Button className="bg-red-600 hover:bg-red-700 text-white gap-2" onClick={handleDeleteStore}>
                    <Trash2 className="w-4 h-4" /> Confirmar Exclusão
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* ── Send Notification Dialog ── */}
            <Dialog open={!!notifDialog} onOpenChange={() => { setNotifDialog(null); setNotifTitle(''); setNotifBody(''); }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    Enviar Notificação — {notifDialog?.storeName}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-2">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Título</label>
                    <input
                      type="text"
                      value={notifTitle}
                      onChange={e => setNotifTitle(e.target.value)}
                      placeholder="Ex: Atenção — Atualização importante"
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                      data-testid="input-notif-title"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1 block">Mensagem</label>
                    <textarea
                      value={notifBody}
                      onChange={e => setNotifBody(e.target.value)}
                      placeholder="Digite a mensagem para a loja..."
                      rows={4}
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      data-testid="input-notif-body"
                    />
                  </div>
                </div>
                <DialogFooter className="gap-2 mt-4">
                  <Button variant="outline" onClick={() => { setNotifDialog(null); setNotifTitle(''); setNotifBody(''); }}>Cancelar</Button>
                  <Button
                    className="gap-2"
                    disabled={!notifTitle.trim() || !notifBody.trim()}
                    onClick={handleSendNotification}
                    data-testid="button-send-notif"
                  >
                    <Send className="w-4 h-4" /> Enviar Notificação
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          </div>
        )}

        {/* ── Clients Tab ───────────────────────────────────────────────────── */}
        {activeTab === 'clients' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                Clientes ({clients.length})
              </h3>
              <p className="text-sm text-muted-foreground">Dados derivados dos pedidos realizados</p>
            </div>

            {clients.length === 0 ? (
              <Card className="p-12 text-center">
                <User className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-muted-foreground">Nenhum cliente encontrado. Os clientes aparecem assim que realizarem pedidos.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {clients.map((client, i) => {
                  const clientOrders = allOrders.filter(o => o.customerEmail === client.email || o.customerName === client.name);
                  const delivered = clientOrders.filter(o => o.status === 'delivered').length;
                  return (
                    <Card key={i} className="p-5 hover:shadow-md transition-all">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground">{client.name}</h4>
                          <div className="space-y-1 mt-1">
                            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Mail className="w-3 h-3" />
                              {client.email}
                            </p>
                            {client.phone && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Phone className="w-3 h-3" />
                                {client.phone}
                              </p>
                            )}
                            {client.lastOrder && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                                <Clock className="w-3 h-3" />
                                Último pedido: {formatDate(client.lastOrder)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mt-4">
                        <div className="bg-secondary rounded-lg p-2 text-center">
                          <p className="text-xs text-muted-foreground">Pedidos</p>
                          <p className="font-bold text-foreground">{client.orders}</p>
                        </div>
                        <div className="bg-secondary rounded-lg p-2 text-center">
                          <p className="text-xs text-muted-foreground">Entregues</p>
                          <p className="font-bold text-green-700">{delivered}</p>
                        </div>
                        <div className="bg-secondary rounded-lg p-2 text-center">
                          <p className="text-xs text-muted-foreground">Total gasto</p>
                          <p className="font-bold text-primary text-xs">R$ {client.total.toFixed(2)}</p>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Motoboy Tab ───────────────────────────────────────────────────── */}
        {activeTab === 'motoboy' && (
          <div className="space-y-6">
            {/* Motoboy KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-5">
                <p className="text-sm text-muted-foreground mb-1">Status atual</p>
                <Badge className={
                  motoboy.status === 'available' ? 'bg-green-100 text-green-800' :
                  motoboy.status === 'on_route'  ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-600'
                }>
                  {motoboy.status === 'available'   ? 'Disponível' :
                   motoboy.status === 'on_route'    ? 'Em rota' :
                   'Indisponível'}
                </Badge>
              </Card>

              <Card className="p-5">
                <p className="text-sm text-muted-foreground mb-1">Ganhos hoje</p>
                <p className="text-2xl font-bold text-primary">R$ {motoboy.todayEarnings.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{motoboy.todayRides} entrega{motoboy.todayRides !== 1 ? 's' : ''}</p>
              </Card>

              <Card className="p-5">
                <p className="text-sm text-muted-foreground mb-1">Ganhos na semana</p>
                <p className="text-2xl font-bold text-primary">R$ {motoboy.weekEarnings.toFixed(2)}</p>
              </Card>

              <Card className="p-5">
                <p className="text-sm text-muted-foreground mb-1">Total de entregas</p>
                <p className="text-2xl font-bold text-primary">{motoboy.completedRoutes.length}</p>
                {motoboy.totalRejectedRides > 0 && (
                  <p className="text-xs text-red-500">{motoboy.totalRejectedRides} recusa{motoboy.totalRejectedRides !== 1 ? 's' : ''}</p>
                )}
              </Card>
            </div>

            {/* Current Route */}
            {motoboy.currentRoute && (
              <Card className="p-5 border-l-4 border-blue-500">
                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Bike className="w-4 h-4 text-blue-600" />
                  Rota Atual
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span><span className="font-medium">De:</span> {motoboy.currentRoute.from}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span><span className="font-medium">Para:</span> {motoboy.currentRoute.to}</span>
                  </div>
                </div>
                <p className="text-sm text-primary font-semibold mt-2">Valor: R$ {motoboy.currentRoute.value.toFixed(2)}</p>
              </Card>
            )}

            {/* Completed Routes */}
            <div>
              {(() => {
                const deliveredOrders = [...allOrders].filter(o => o.status === 'delivered').reverse();
                return (
                  <>
                    <h3 className="text-lg font-semibold text-foreground mb-3">
                      Histórico de Entregas ({deliveredOrders.length})
                    </h3>
                    {deliveredOrders.length === 0 ? (
                      <Card className="p-8 text-center">
                        <Bike className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                        <p className="text-muted-foreground">Nenhuma entrega concluída ainda.</p>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {deliveredOrders.map(order => {
                          const isExpanded = expandedOrders.has(order.id);
                          return (
                            <div key={order.id} className="border border-border rounded-xl overflow-hidden">
                              {/* Collapsed header */}
                              <button
                                className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-3 hover:bg-secondary transition-colors"
                                onClick={() => toggleOrderExpand(order.id)}
                                data-testid={`delivery-history-row-${order.id}`}
                              >
                                <span className="font-mono text-xs text-muted-foreground w-20 flex-shrink-0">#{order.id.slice(-6)}</span>
                                <span className="font-medium text-foreground flex-1 min-w-[120px]">{order.customerName}</span>
                                <span className="text-muted-foreground text-sm flex-1 min-w-[120px]">{order.storeName || order.storeId}</span>
                                <span className="font-semibold text-foreground">R$ {order.total.toFixed(2)}</span>
                                <Badge className="bg-green-100 text-green-800 flex items-center gap-1 flex-shrink-0">
                                  <CheckCircle className="w-3.5 h-3.5" /> Entregue
                                </Badge>
                                <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(order.createdAt)}</span>
                                <span className="text-xs text-primary font-medium flex-shrink-0">{isExpanded ? '▲ Fechar' : '▼ Detalhes'}</span>
                              </button>

                              {/* Expanded detail */}
                              {isExpanded && (
                                <div className="border-t border-border bg-secondary/30 px-4 py-4 space-y-5">

                                  {/* Dados do cliente */}
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Dados do Cliente</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                      <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                        <span className="text-foreground font-medium">{order.customerName}</span>
                                      </div>
                                      {order.customerEmail && (
                                        <div className="flex items-center gap-2">
                                          <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                          <span className="text-foreground">{order.customerEmail}</span>
                                        </div>
                                      )}
                                      {order.customerPhone && (
                                        <div className="flex items-center gap-2">
                                          <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                          <span className="text-foreground">{order.customerPhone}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Loja */}
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Loja</p>
                                    <div className="flex items-center gap-2 text-sm">
                                      <Store className="w-4 h-4 text-muted-foreground" />
                                      <span className="text-foreground font-medium">{order.storeName || order.storeId}</span>
                                    </div>
                                  </div>

                                  {/* Entrega */}
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Entrega</p>
                                    {order.isPickup ? (
                                      <div className="flex items-center gap-2 text-sm text-teal-700">
                                        <Store className="w-4 h-4" /> Retirada na loja
                                      </div>
                                    ) : (
                                      <div className="space-y-1 text-sm">
                                        <div className="flex items-center gap-2 text-orange-700">
                                          <Bike className="w-4 h-4" /> Entrega por motoboy
                                        </div>
                                        {order.deliveryAddress && (
                                          <div className="flex items-start gap-2 text-muted-foreground">
                                            <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                            <span>
                                              {order.deliveryAddress.logradouro}, {order.deliveryAddress.numero} —{' '}
                                              {order.deliveryAddress.bairro}, {order.deliveryAddress.cidade}/{order.deliveryAddress.uf}
                                            </span>
                                          </div>
                                        )}
                                        {order.distanceKm != null && (
                                          <p className="text-xs text-muted-foreground pl-6">Distância: {order.distanceKm.toFixed(1)} km</p>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Pagamento */}
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pagamento</p>
                                    <div className="flex items-center gap-2 text-sm">
                                      <CreditCard className="w-4 h-4 text-muted-foreground" />
                                      {order.paymentStatus === 'paid' ? (
                                        <Badge className="bg-green-100 text-green-800">Pago</Badge>
                                      ) : (
                                        <Badge className="bg-amber-100 text-amber-800">Aguardando pagamento</Badge>
                                      )}
                                    </div>
                                  </div>

                                  {/* Itens do pedido */}
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Itens do Pedido</p>
                                    <div className="space-y-1 text-sm">
                                      {order.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-foreground">
                                          <span>× {item.quantity} — prod. {item.productId.slice(-6)}</span>
                                          <span className="font-medium">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                        </div>
                                      ))}
                                      <div className="flex justify-between font-bold text-foreground border-t border-border pt-1 mt-1">
                                        <span>Total</span>
                                        <span>R$ {order.total.toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Linha do tempo */}
                                  <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1">
                                      <CalendarClock className="w-3.5 h-3.5" /> Linha do Tempo
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                      <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center flex-shrink-0">
                                          <Clock className="w-4 h-4 text-yellow-600" />
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground">Pedido realizado</p>
                                          <p className="text-sm font-semibold text-foreground">{fmtDateTime(order.createdAt)}</p>
                                        </div>
                                      </div>
                                      {!order.isPickup && (
                                        <div className="flex items-start gap-3">
                                          <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0">
                                            <Bike className="w-4 h-4 text-orange-600" />
                                          </div>
                                          <div>
                                            <p className="text-xs text-muted-foreground">Motoboy coletou</p>
                                            <p className="text-sm font-semibold text-foreground">
                                              {fmtDateTime(getTimestampForStatus(order, 'on_the_way') ?? getTimestampForStatus(order, 'motoboy_at_store'))}
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                      <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                                          <CheckCircle className="w-4 h-4 text-green-600" />
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground">Entregue ao cliente</p>
                                          <p className="text-sm font-semibold text-foreground">
                                            {fmtDateTime(order.deliveredAt ?? getTimestampForStatus(order, 'delivered'))}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Histórico de status */}
                                  {order.statusHistory && order.statusHistory.length > 0 && (
                                    <div>
                                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Histórico Completo de Status</p>
                                      <div className="space-y-2">
                                        {order.statusHistory.map((entry, idx) => (
                                          <div key={idx} className="flex items-start gap-3 text-sm">
                                            <div className="flex flex-col items-center">
                                              <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${idx === order.statusHistory!.length - 1 ? 'bg-primary' : 'bg-border'}`} />
                                              {idx < order.statusHistory!.length - 1 && <div className="w-0.5 h-5 bg-border mt-0.5" />}
                                            </div>
                                            <div className="flex-1 pb-1 flex items-center gap-2">
                                              {statusIcon(entry.status)}
                                              <span className="font-medium text-foreground">{statusLabel(entry.status)}</span>
                                              <span className="text-muted-foreground text-xs ml-auto">
                                                {new Date(entry.timestamp).toLocaleDateString('pt-BR')} às{' '}
                                                {new Date(entry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Código de entrega */}
                                  {order.deliveryCode && (
                                    <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
                                      <KeyRound className="w-4 h-4 text-primary flex-shrink-0" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Código de Entrega</p>
                                        <p className="font-mono font-bold text-lg tracking-widest text-primary">{order.deliveryCode}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* ── Categories Tab ────────────────────────────────────────────────── */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
              + Nova Categoria
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockCategories.map(category => {
                const catProducts = allOrders.flatMap(o => o.items).filter(i => i.category === category.name);
                return (
                  <Card key={category.id} className="p-6 hover:shadow-lg transition-all">
                    <div className="text-4xl mb-4">{category.icon}</div>
                    <h4 className="text-lg font-semibold text-foreground mb-1">{category.name}</h4>
                    <p className="text-sm text-muted-foreground mb-2">{category.description}</p>
                    {catProducts.length > 0 && (
                      <p className="text-xs text-primary mb-3">{catProducts.length} produto{catProducts.length !== 1 ? 's' : ''} vendido{catProducts.length !== 1 ? 's' : ''}</p>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90 text-white">
                        Editar
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1">
                        Excluir
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Reports Tab ───────────────────────────────────────────────────── */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Relatório de Vendas por Loja</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Loja</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Pedidos</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Entregues</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Vendas Totais</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Ticket Médio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockStores.map(store => {
                      const storeOrders = allOrders.filter(o => o.storeId === store.id);
                      const storeSales = storeOrders.reduce((sum, o) => sum + o.total, 0);
                      const deliveredCount = storeOrders.filter(o => o.status === 'delivered').length;
                      const avgTicket = storeOrders.length > 0 ? storeSales / storeOrders.length : 0;

                      return (
                        <tr key={store.id} className="border-b border-border hover:bg-secondary transition-colors">
                          <td className="py-3 px-4 text-foreground font-medium">{store.name}</td>
                          <td className="py-3 px-4 text-foreground">{storeOrders.length}</td>
                          <td className="py-3 px-4 text-green-700 font-medium">{deliveredCount}</td>
                          <td className="py-3 px-4 text-foreground font-semibold">R$ {storeSales.toFixed(2)}</td>
                          <td className="py-3 px-4 text-foreground">R$ {avgTicket.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-secondary border-t-2 border-border">
                      <td className="py-3 px-4 font-bold text-foreground" colSpan={3}>Total do Período</td>
                      <td className="py-3 px-4 font-bold text-primary text-base">R$ {totalSales.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>

            {/* All Orders List — detailed cards */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Todos os Pedidos ({allOrders.length})
              </h3>
              {allOrders.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum pedido no sistema ainda.</p>
              ) : (
                <div className="space-y-4">
                  {[...allOrders].reverse().map(order => {
                    const isExpanded = expandedOrders.has(order.id);
                    const statusBadgeCls =
                      order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                      order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      order.status === 'pending'   ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800';
                    return (
                      <div key={order.id} className="border border-border rounded-xl overflow-hidden">
                        {/* Collapsed header — always visible */}
                        <button
                          className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-3 hover:bg-secondary transition-colors"
                          onClick={() => toggleOrderExpand(order.id)}
                        >
                          <span className="font-mono text-xs text-muted-foreground w-20 flex-shrink-0">#{order.id.slice(-6)}</span>
                          <span className="font-medium text-foreground flex-1 min-w-[120px]">{order.customerName}</span>
                          <span className="text-muted-foreground text-sm flex-1 min-w-[120px]">{order.storeName || order.storeId}</span>
                          <span className="font-semibold text-foreground">R$ {order.total.toFixed(2)}</span>
                          <Badge className={`${statusBadgeCls} flex items-center gap-1 flex-shrink-0`}>
                            {statusIcon(order.status)} {statusLabel(order.status)}
                          </Badge>
                          <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(order.createdAt)}</span>
                          <span className="text-xs text-primary font-medium flex-shrink-0">{isExpanded ? '▲ Fechar' : '▼ Detalhes'}</span>
                        </button>

                        {/* Expanded detail */}
                        {isExpanded && (
                          <div className="border-t border-border bg-secondary/30 px-4 py-4 space-y-5">

                            {/* ── Dados do cliente ── */}
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Dados do Cliente</p>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                <div className="flex items-center gap-2">
                                  <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                  <span className="text-foreground font-medium">{order.customerName}</span>
                                </div>
                                {order.customerEmail && (
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    <span className="text-foreground">{order.customerEmail}</span>
                                  </div>
                                )}
                                {order.customerPhone && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                    <span className="text-foreground">{order.customerPhone}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* ── Tipo de entrega + endereço ── */}
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Entrega</p>
                              {order.isPickup ? (
                                <div className="flex items-center gap-2 text-sm text-teal-700">
                                  <Store className="w-4 h-4" /> Retirada na loja
                                </div>
                              ) : (
                                <div className="space-y-1 text-sm">
                                  <div className="flex items-center gap-2 text-orange-700">
                                    <Bike className="w-4 h-4" /> Entrega por motoboy
                                  </div>
                                  {order.deliveryAddress && (
                                    <div className="flex items-start gap-2 text-muted-foreground">
                                      <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                      <span>
                                        {order.deliveryAddress.logradouro}, {order.deliveryAddress.numero} —{' '}
                                        {order.deliveryAddress.bairro}, {order.deliveryAddress.cidade}/{order.deliveryAddress.uf}
                                      </span>
                                    </div>
                                  )}
                                  {order.distanceKm != null && (
                                    <p className="text-xs text-muted-foreground pl-6">Distância: {order.distanceKm.toFixed(1)} km</p>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* ── Pagamento ── */}
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pagamento</p>
                              <div className="flex items-center gap-2 text-sm">
                                <CreditCard className="w-4 h-4 text-muted-foreground" />
                                {order.paymentStatus === 'paid' ? (
                                  <Badge className="bg-green-100 text-green-800">Pago</Badge>
                                ) : (
                                  <Badge className="bg-amber-100 text-amber-800">Aguardando pagamento</Badge>
                                )}
                              </div>
                            </div>

                            {/* ── Linha do tempo de datas ── */}
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1">
                                <CalendarClock className="w-3.5 h-3.5" /> Linha do Tempo
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="flex items-start gap-3">
                                  <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center flex-shrink-0">
                                    <Clock className="w-4 h-4 text-yellow-600" />
                                  </div>
                                  <div>
                                    <p className="text-xs text-muted-foreground">Pedido realizado</p>
                                    <p className="text-sm font-semibold text-foreground">{fmtDateTime(order.createdAt)}</p>
                                  </div>
                                </div>
                                {!order.isPickup ? (
                                  <>
                                    <div className="flex items-start gap-3">
                                      <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0">
                                        <Bike className="w-4 h-4 text-orange-600" />
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Motoboy coletou</p>
                                        <p className="text-sm font-semibold text-foreground">
                                          {fmtDateTime(getTimestampForStatus(order, 'on_the_way') ?? getTimestampForStatus(order, 'motoboy_at_store'))}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                      <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                      </div>
                                      <div>
                                        <p className="text-xs text-muted-foreground">Entregue ao cliente</p>
                                        <p className="text-sm font-semibold text-foreground">
                                          {fmtDateTime(order.deliveredAt ?? getTimestampForStatus(order, 'delivered'))}
                                        </p>
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0">
                                      <Store className="w-4 h-4 text-teal-600" />
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Retirado pelo cliente</p>
                                      <p className="text-sm font-semibold text-foreground">
                                        {fmtDateTime(order.deliveredAt ?? getTimestampForStatus(order, 'delivered'))}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* ── Histórico completo de status ── */}
                            {order.statusHistory && order.statusHistory.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Histórico Completo de Status</p>
                                <div className="space-y-2">
                                  {order.statusHistory.map((entry, idx) => (
                                    <div key={idx} className="flex items-start gap-3 text-sm">
                                      <div className="flex flex-col items-center">
                                        <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${idx === order.statusHistory!.length - 1 ? 'bg-primary' : 'bg-border'}`} />
                                        {idx < order.statusHistory!.length - 1 && <div className="w-0.5 h-5 bg-border mt-0.5" />}
                                      </div>
                                      <div className="flex-1 pb-1 flex items-center gap-2">
                                        {statusIcon(entry.status)}
                                        <span className="font-medium text-foreground">{statusLabel(entry.status)}</span>
                                        <span className="text-muted-foreground text-xs ml-auto">
                                          {new Date(entry.timestamp).toLocaleDateString('pt-BR')} às{' '}
                                          {new Date(entry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* ── Itens do pedido ── */}
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Itens do Pedido</p>
                              <div className="space-y-1 text-sm">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between text-foreground">
                                    <span>× {item.quantity} — prod. {item.productId.slice(-6)}</span>
                                    <span className="font-medium">R$ {(item.price * item.quantity).toFixed(2)}</span>
                                  </div>
                                ))}
                                <div className="flex justify-between font-bold text-foreground border-t border-border pt-1 mt-1">
                                  <span>Total</span>
                                  <span>R$ {order.total.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>

                            {/* ── Código de entrega ── */}
                            {order.deliveryCode && (
                              <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
                                <KeyRound className="w-4 h-4 text-primary flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Código de Entrega</p>
                                  <p className="font-mono font-bold text-lg tracking-widest text-primary">{order.deliveryCode}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ── Support Tab ──────────────────────────────────────────────────── */}
        {activeTab === 'support' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Headphones className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-semibold text-foreground">Solicitações de Suporte</h3>
              {pendingTickets.length > 0 && (
                <Badge className="bg-red-100 text-red-800">{pendingTickets.length} ativa(s)</Badge>
              )}
            </div>

            {pendingTickets.length === 0 ? (
              <Card className="p-12 text-center">
                <Headphones className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground text-lg">Nenhuma solicitação de suporte no momento</p>
              </Card>
            ) : (
              <div className="space-y-6">
                {pendingTickets.map(ticket => {
                  const isOpen = activeChatId === ticket.id;
                  return (
                    <Card key={ticket.id} className={`border-l-4 ${ticket.status === 'in_chat' ? 'border-green-500' : 'border-orange-400'}`}>
                      {/* Ticket header */}
                      <div className="p-5">
                        <div className="flex flex-wrap items-start gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                            <MessageCircle className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <p className="font-semibold text-foreground">📩 Nova Solicitação de Suporte</p>
                              {ticket.submitterType === 'motoboy' && (
                                <Badge className="bg-blue-100 text-blue-800 text-xs">🏍️ Motoboy</Badge>
                              )}
                              {ticket.status === 'in_chat' ? (
                                <Badge className="bg-green-100 text-green-800 text-xs">🟢 Em atendimento</Badge>
                              ) : (
                                <Badge className="bg-orange-100 text-orange-800 text-xs">⏳ Aguardando</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">{ticket.submitterType === 'motoboy' ? 'Motoboy:' : 'Loja:'}</span> {ticket.storeName}
                            </p>
                            <p className="text-sm text-muted-foreground mt-0.5"><span className="font-medium text-foreground">Categoria:</span> {ticket.category}</p>
                            <p className="text-sm text-muted-foreground mt-0.5"><span className="font-medium text-foreground">Mensagem:</span> {ticket.message}</p>
                            {ticket.orderId && (
                              <p className="text-sm text-muted-foreground mt-0.5"><span className="font-medium text-foreground">Pedido:</span> #{ticket.orderId.slice(-5).toUpperCase()}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Horário: {new Date(ticket.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} —{' '}
                              {new Date(ticket.createdAt).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-3">
                          {ticket.status === 'pending' && (
                            <Button
                              className="gap-2"
                              onClick={() => {
                                startChat(ticket.id);
                                setActiveChatId(ticket.id);
                              }}
                            >
                              <MessageCircle className="w-4 h-4" /> Iniciar Atendimento
                            </Button>
                          )}
                          {ticket.status === 'in_chat' && (
                            <Button
                              variant="outline"
                              className="gap-2"
                              onClick={() => setActiveChatId(isOpen ? null : ticket.id)}
                            >
                              <MessageCircle className="w-4 h-4" />
                              {isOpen ? 'Fechar Chat' : 'Abrir Chat'}
                            </Button>
                          )}
                          {ticket.status === 'in_chat' && (
                            <Button
                              variant="outline"
                              className="gap-2 text-green-700 border-green-300 hover:bg-green-50"
                              onClick={() => {
                                resolveTicket(ticket.id);
                                if (activeChatId === ticket.id) setActiveChatId(null);
                                toast.success('Atendimento encerrado e movido para o histórico.');
                              }}
                            >
                              <CheckCircle className="w-4 h-4" /> Marcar como Resolvido
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Chat panel */}
                      {isOpen && ticket.status === 'in_chat' && (
                        <div className="border-t border-border">
                          <div className="flex flex-col" style={{ height: '340px' }}>
                            {/* Messages */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/20">
                              {ticket.chat.map(msg => (
                                <div
                                  key={msg.id}
                                  className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}
                                >
                                  <div
                                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                                      msg.sender === 'admin'
                                        ? 'bg-primary text-white rounded-br-sm'
                                        : 'bg-card border border-border text-foreground rounded-bl-sm'
                                    }`}
                                  >
                                    {(msg.sender === 'seller' || msg.sender === 'motoboy') && (
                                      <p className="text-[10px] font-semibold text-muted-foreground mb-1">
                                        {msg.sender === 'motoboy' ? `🏍️ ${ticket.storeName}` : ticket.storeName}
                                      </p>
                                    )}
                                    <p>{msg.text}</p>
                                    <p className={`text-[10px] mt-1 ${msg.sender === 'admin' ? 'text-white/70' : 'text-muted-foreground'}`}>
                                      {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                  </div>
                                </div>
                              ))}
                              <div ref={adminChatEndRef} />
                            </div>

                            {/* Input */}
                            <div className="flex items-center gap-2 p-3 border-t border-border bg-card">
                              <input
                                type="text"
                                value={adminChatInput[ticket.id] ?? ''}
                                onChange={e => setAdminChatInput(prev => ({ ...prev, [ticket.id]: e.target.value }))}
                                onKeyDown={e => {
                                  const text = adminChatInput[ticket.id]?.trim();
                                  if (e.key === 'Enter' && text) {
                                    sendMessage(ticket.id, 'admin', text);
                                    setAdminChatInput(prev => ({ ...prev, [ticket.id]: '' }));
                                  }
                                }}
                                placeholder="Digite sua resposta..."
                                className="flex-1 border border-border rounded-xl px-4 py-2 text-sm bg-secondary focus:outline-none focus:ring-2 focus:ring-primary/50"
                              />
                              <Button
                                size="sm"
                                className="rounded-xl"
                                disabled={!adminChatInput[ticket.id]?.trim()}
                                onClick={() => {
                                  const text = adminChatInput[ticket.id]?.trim();
                                  if (text) {
                                    sendMessage(ticket.id, 'admin', text);
                                    setAdminChatInput(prev => ({ ...prev, [ticket.id]: '' }));
                                  }
                                }}
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Support History Tab ───────────────────────────────────────────── */}
        {activeTab === 'support_history' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <History className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-semibold text-foreground">Histórico de Suporte</h3>
              <Badge className="bg-blue-100 text-blue-800">{resolvedTickets.length} resolvido(s)</Badge>
            </div>

            {resolvedTickets.length === 0 ? (
              <Card className="p-12 text-center">
                <History className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground text-lg">Nenhum atendimento encerrado ainda</p>
              </Card>
            ) : (
              <div className="space-y-4">
                {[...resolvedTickets].reverse().map(ticket => (
                  <Card key={ticket.id} className="border-l-4 border-blue-400 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <p className="font-semibold text-foreground">{ticket.storeName}</p>
                          <Badge className="bg-blue-100 text-blue-800 text-xs">Resolvido</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{ticket.category}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">Mensagem inicial: {ticket.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(ticket.createdAt).toLocaleDateString('pt-BR')} às{' '}
                          {new Date(ticket.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <Badge className="bg-secondary text-muted-foreground">{ticket.chat.length} mensagem(s)</Badge>
                    </div>

                    {/* Chat transcript */}
                    {ticket.chat.length > 0 && (
                      <details className="mt-2">
                        <summary className="text-sm text-primary cursor-pointer font-medium hover:underline">Ver conversa completa</summary>
                        <div className="mt-3 space-y-2 bg-secondary/30 rounded-xl p-3">
                          {ticket.chat.map(msg => (
                            <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${msg.sender === 'admin' ? 'bg-primary text-white' : 'bg-card border border-border text-foreground'}`}>
                                <p className={`text-[10px] font-semibold mb-0.5 ${msg.sender === 'admin' ? 'text-white/70' : 'text-muted-foreground'}`}>
                                  {msg.sender === 'admin' ? 'Suporte' : ticket.storeName}
                                </p>
                                <p>{msg.text}</p>
                                <p className={`text-[10px] mt-1 ${msg.sender === 'admin' ? 'text-white/60' : 'text-muted-foreground'}`}>
                                  {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

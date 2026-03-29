/**
 * Admin Panel - Platform administration
 * Features: Platform overview, store management, client list, motoboy stats, categories, sales reports
 * All data is derived from real system state (orders, motoboy context, stores).
 */

import { useMarketplace } from '@/contexts/MarketplaceContext';
import { useMotoboy } from '@/contexts/MotoboyContext';
import { useMotoboyRegistry } from '@/contexts/MotoboyRegistryContext';
import { useProducts } from '@/contexts/ProductContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Order, Store as StoreData } from '@/lib/mockData';

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
  // mbData is derived from registry; local bonusMap tracks balance adjustments (admin-only)
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
    on_the_way: 'Motoboy saiu para entrega', motoboy_arrived: 'Motoboy chegou na entrega',
    delivered: 'Entregue', cancelled: 'Cancelado',
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
      case 'motoboy_arrived': return <Navigation className="w-3.5 h-3.5 text-orange-600" />;
      case 'delivered': return <CheckCircle className="w-3.5 h-3.5 text-blue-600" />;
      case 'cancelled': return <AlertCircle className="w-3.5 h-3.5 text-red-600" />;
      default: return <Package className="w-3.5 h-3.5 text-gray-600" />;
    }
  };

  // Helper: get progressive double-route label for an order
  const getDoubleRouteLabel = (order: Order): string | null => {
    if (order.status !== 'on_the_way') return null;
    const route = activeDeliveryRoutes.find(r => r.routeType === 'double' && r.orderIds.includes(order.id));
    if (!route) return null;
    const idx = route.orderIds.indexOf(order.id);
    const otherOrderId = route.orderIds.find(id => id !== order.id);
    const otherOrder = otherOrderId ? allOrders.find(o => o.id === otherOrderId) : undefined;
    if (idx === 0) return 'Indo para 1ª entrega de 2';
    return otherOrder?.status === 'delivered'
      ? 'Indo para 2ª entrega (1ª finalizada)'
      : 'Indo para 2ª entrega';
  };

  // Helper: is order part of a double route
  const isDoubleRoute = (order: Order): boolean =>
    activeDeliveryRoutes.some(r => r.routeType === 'double' && r.orderIds.includes(order.id));

  // ─── KPI Metrics ────────────────────────────────────────────────────────────
  const totalStores = realStores.length;
  const totalCategories = realCategories.length;
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
                    const routeOrders = entry.orderIds
                      .map(id => readyForPickupOrders.find(o => o.id === id) ?? allOrders.find(o => o.id === id))
                      .filter(Boolean);
                    const firstOrder = routeOrders[0];
                    const cooldownRemaining = entry.lastRejectedAt
                      ? Math.max(0, 60 - Math.floor((Date.now() - entry.lastRejectedAt) / 1000))
                      : 0;
                    return (
                      <Card key={entry.routeId} className="p-4 border-l-4 border-purple-500">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div>
                            <p className="font-mono text-sm font-bold text-foreground">
                              Rota {entry.orderIds.length > 1 ? `Dupla` : `Simples`} — {entry.orderIds.map(id => `#${id.slice(-5).toUpperCase()}`).join(' + ')}
                            </p>
                            {firstOrder && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {routeOrders.map(o => o?.customerName).filter(Boolean).join(', ')} · Loja: {firstOrder.storeName || firstOrder.storeId}
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
                    {selectedStore.logo && selectedStore.logo.startsWith('data:') ? (
                      <img src={selectedStore.logo} alt={selectedStore.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <span className="text-3xl">{selectedStore.logo}</span>
                    )}
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
                                    {getDoubleRouteLabel(order) ?? statusLabel(order.status)}
                                  </Badge>
                                  {isDoubleRoute(order) && (
                                    <Badge className="text-xs bg-purple-100 text-purple-800">🔄 Rota dupla</Badge>
                                  )}
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
                                      <SelectItem value="motoboy_arrived">Motoboy chegou na entrega</SelectItem>
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
                            {store.logo && store.logo.startsWith('data:') ? (
                              <img src={store.logo} alt={store.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                            ) : (
                              <div className="text-4xl">{store.logo}</div>
                            )}
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
            {/* ── Platform KPIs row ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Motoboys ativos</p>
                <p className="text-2xl font-bold text-green-700">{mbListWithContext.filter(m => m.status === 'available' || m.status === 'on_route').length}</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Em rota agora</p>
                <p className="text-2xl font-bold text-blue-700">{mbListWithContext.filter(m => m.status === 'on_route').length}</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Bloqueados</p>
                <p className="text-2xl font-bold text-red-600">{mbListWithContext.filter(m => m.status === 'blocked').length}</p>
              </Card>
              <Card className="p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Entregas hoje</p>
                <p className="text-2xl font-bold text-primary">{mbListWithContext.reduce((s, m) => s + m.completedToday, 0)}</p>
              </Card>
            </div>

            {selectedMbId && selectedMb ? (
              /* ── DETAIL VIEW ─────────────────────────────────────────────── */
              <div className="space-y-5">
                {/* Back + header */}
                <div className="flex flex-wrap items-center gap-4">
                  <Button variant="outline" size="sm" className="gap-2" onClick={() => { setSelectedMbId(null); setMbDetailTab('profile'); }} data-testid="btn-back-motoboy-list">
                    <ArrowLeft className="w-4 h-4" /> Voltar à lista
                  </Button>
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-3xl">{selectedMb.avatar}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-bold text-foreground">{selectedMb.name}</h3>
                        {selectedMb.isContextMotoboy && <Badge className="bg-blue-100 text-blue-800 text-[10px]">Context</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground">{selectedMb.vehicle} · {selectedMb.licensePlate}</p>
                    </div>
                  </div>
                  <Badge className={
                    selectedMb.status === 'available' ? 'bg-green-100 text-green-800' :
                    selectedMb.status === 'on_route'  ? 'bg-blue-100 text-blue-800' :
                    selectedMb.status === 'blocked'   ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-600'
                  }>
                    {selectedMb.status === 'available' ? '● Disponível' :
                     selectedMb.status === 'on_route'  ? '🛵 Em rota' :
                     selectedMb.status === 'blocked'   ? '🚫 Bloqueado' : '○ Indisponível'}
                  </Badge>
                </div>

                {/* Sub-tabs */}
                <div className="flex gap-2 border-b border-border pb-1">
                  {(['profile', 'orders'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setMbDetailTab(t)}
                      className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${mbDetailTab === t ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}
                      data-testid={`tab-mb-${t}`}
                    >
                      {t === 'profile' ? 'Perfil & Ações' : 'Pedidos Vinculados'}
                    </button>
                  ))}
                </div>

                {mbDetailTab === 'profile' && (
                  <div className="space-y-5">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <Card className="p-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Entregas hoje</p>
                        <p className="text-2xl font-bold text-primary">{selectedMb.completedToday}</p>
                      </Card>
                      <Card className="p-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Total de entregas</p>
                        <p className="text-2xl font-bold text-foreground">{selectedMb.completedTotal}</p>
                      </Card>
                      <Card className="p-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Recusas</p>
                        <p className="text-2xl font-bold text-red-600">{selectedMb.rejectedTotal}</p>
                      </Card>
                      <Card className="p-4 text-center">
                        <p className="text-xs text-muted-foreground mb-1">Avaliação</p>
                        <p className="text-2xl font-bold text-yellow-600 flex items-center justify-center gap-1">
                          <Star className="w-5 h-5 fill-yellow-400 text-yellow-500" /> {selectedMb.rating.toFixed(1)}
                        </p>
                      </Card>
                    </div>

                    {/* Saldo */}
                    <Card className="p-5 border-l-4 border-primary">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> Saldo / Bônus do Admin</p>
                          <p className="text-2xl font-bold text-primary">R$ {selectedMb.balanceBonus.toFixed(2)}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" className="gap-2 bg-green-700 hover:bg-green-800 text-white"
                            onClick={() => { setBalanceDialog({ mbId: selectedMb.id, mbName: selectedMb.name }); setBalanceType('add'); }}
                            data-testid="btn-mb-credit-balance">
                            <Plus className="w-4 h-4" /> Creditar
                          </Button>
                          <Button size="sm" variant="outline" className="gap-2 text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() => { setBalanceDialog({ mbId: selectedMb.id, mbName: selectedMb.name }); setBalanceType('deduct'); }}
                            data-testid="btn-mb-deduct-balance">
                            <Minus className="w-4 h-4" /> Debitar
                          </Button>
                        </div>
                      </div>
                    </Card>

                    {/* Rota atual */}
                    {selectedMb.currentRoute ? (
                      <Card className="p-5 border-l-4 border-blue-500">
                        <div className="flex items-start justify-between flex-wrap gap-3">
                          <div>
                            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                              <Navigation className="w-4 h-4 text-blue-600" /> Rota Atual
                            </h4>
                            <div className="space-y-1 text-sm">
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                <span><span className="font-medium">De:</span> {selectedMb.currentRoute.from}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                                <span><span className="font-medium">Para:</span> {selectedMb.currentRoute.to}</span>
                              </div>
                              {selectedMb.currentRoute.orderId && (
                                <p className="text-xs text-muted-foreground pl-6">Pedido #{selectedMb.currentRoute.orderId.slice(-6).toUpperCase()}</p>
                              )}
                            </div>
                          </div>
                          <Button size="sm" variant="outline" className="gap-2 text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() => setRemoveRouteConfirm(selectedMb.id)}
                            data-testid="btn-mb-remove-route">
                            <XCircle className="w-4 h-4" /> Retirar Rota
                          </Button>
                        </div>
                      </Card>
                    ) : (
                      <Card className="p-4 border border-dashed border-border">
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Navigation className="w-4 h-4" /> Nenhuma rota ativa no momento.
                        </p>
                      </Card>
                    )}

                    {/* Bloqueio */}
                    {selectedMb.status === 'blocked' && selectedMb.blockInfo ? (
                      <Card className="p-5 border-l-4 border-red-500 bg-red-50 dark:bg-red-900/10">
                        <div className="flex items-start justify-between flex-wrap gap-3">
                          <div>
                            <h4 className="font-semibold text-red-800 dark:text-red-400 flex items-center gap-2 mb-1">
                              <Ban className="w-4 h-4" /> Motoboy Bloqueado
                            </h4>
                            <p className="text-sm text-red-700 dark:text-red-300">
                              Tipo: {selectedMb.blockInfo.type === 'permanent' ? 'Permanente' : selectedMb.blockInfo.type === 'hours' ? 'Por horas' : 'Por dias'}
                            </p>
                            {selectedMb.blockInfo.until && (
                              <p className="text-sm text-red-700 dark:text-red-300">
                                Até: {selectedMb.blockInfo.until.toLocaleString('pt-BR')}
                              </p>
                            )}
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                              Motivo: {selectedMb.blockInfo.reason}
                            </p>
                          </div>
                          <Button size="sm" className="gap-2 bg-green-700 hover:bg-green-800 text-white"
                            onClick={() => handleMbUnblock(selectedMb.id, selectedMb.name)}
                            data-testid="btn-mb-unblock">
                            <UserCheck className="w-4 h-4" /> Desbloquear
                          </Button>
                        </div>
                      </Card>
                    ) : (
                      <Card className="p-5">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div>
                            <h4 className="font-semibold text-foreground flex items-center gap-2 mb-1">
                              <ShieldOff className="w-4 h-4" /> Bloqueio de Acesso
                            </h4>
                            <p className="text-sm text-muted-foreground">Bloquear motoboy por tempo determinado ou permanentemente.</p>
                          </div>
                          <Button size="sm" variant="outline" className="gap-2 text-orange-700 border-orange-400 hover:bg-orange-50"
                            onClick={() => setBlockDialog({ mbId: selectedMb.id, mbName: selectedMb.name })}
                            data-testid="btn-mb-block">
                            <Ban className="w-4 h-4" /> Bloquear
                          </Button>
                        </div>
                      </Card>
                    )}

                    {/* Info & Ações rápidas */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Card className="p-4 space-y-3">
                        <h4 className="text-sm font-semibold text-foreground">Informações</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="w-4 h-4 flex-shrink-0" />
                            <span>{selectedMb.phone}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Bike className="w-4 h-4 flex-shrink-0" />
                            <span>{selectedMb.vehicle} — {selectedMb.licensePlate}</span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <CalendarClock className="w-4 h-4 flex-shrink-0" />
                            <span>Cadastrado em {new Date(selectedMb.joinedAt).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                      </Card>
                      <Card className="p-4 space-y-3">
                        <h4 className="text-sm font-semibold text-foreground">Ações Rápidas</h4>
                        <div className="flex flex-col gap-2">
                          <Button size="sm" variant="outline" className="justify-start gap-2"
                            onClick={() => setNotifMbDialog({ mbId: selectedMb.id, mbName: selectedMb.name })}
                            data-testid="btn-mb-send-notif">
                            <Bell className="w-4 h-4" /> Enviar Notificação
                          </Button>
                          {selectedMb.currentRoute && (
                            <Button size="sm" variant="outline" className="justify-start gap-2 text-orange-700 border-orange-300"
                              onClick={() => setRemoveRouteConfirm(selectedMb.id)}
                              data-testid="btn-mb-remove-route-quick">
                              <XCircle className="w-4 h-4" /> Retirar Rota Atual
                            </Button>
                          )}
                        </div>
                      </Card>
                    </div>
                  </div>
                )}

                {mbDetailTab === 'orders' && (
                  <div className="space-y-4">
                    {/* Active orders */}
                    {(() => {
                      const mbActiveStatuses: Order['status'][] = ['motoboy_accepted', 'motoboy_at_store', 'on_the_way', 'motoboy_arrived'];
                      const activeOrders = selectedMb.isContextMotoboy
                        ? allOrders.filter(o => mbActiveStatuses.includes(o.status))
                        : [];
                      const finishedOrders = selectedMb.isContextMotoboy
                        ? [...allOrders].filter(o => o.status === 'delivered').reverse()
                        : [];
                      const simRoutes = selectedMb.isContextMotoboy ? [] : motoboy.completedRoutes.slice(0, selectedMb.completedTotal);

                      return (
                        <>
                          {activeOrders.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                                <Navigation className="w-4 h-4 text-blue-600" /> Pedidos em Andamento ({activeOrders.length})
                              </h4>
                              <div className="space-y-2">
                                {activeOrders.map(order => (
                                  <Card key={order.id} className="p-4 border-l-4 border-blue-400">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                      <div>
                                        <p className="font-mono text-xs text-muted-foreground">#{order.id.slice(-6).toUpperCase()}</p>
                                        <p className="font-semibold text-foreground">{order.customerName}</p>
                                        <p className="text-sm text-muted-foreground">{order.storeName || order.storeId}</p>
                                        {order.deliveryAddress && (
                                          <p className="text-xs text-muted-foreground mt-0.5">
                                            {order.deliveryAddress.logradouro}, {order.deliveryAddress.numero} — {order.deliveryAddress.bairro}
                                          </p>
                                        )}
                                      </div>
                                      <div className="flex flex-col gap-2 items-end">
                                        <Badge className="bg-blue-100 text-blue-800">{statusLabel(order.status)}</Badge>
                                        <p className="font-semibold text-foreground text-sm">R$ {order.total.toFixed(2)}</p>
                                        <Button size="sm" className="gap-1 bg-green-700 hover:bg-green-800 text-white"
                                          onClick={() => handleMbMarkDelivered(order.id)}
                                          data-testid={`btn-mark-delivered-${order.id}`}>
                                          <CheckCircle className="w-3.5 h-3.5" /> Marcar Entregue
                                        </Button>
                                      </div>
                                    </div>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Delivered orders history */}
                          <div>
                            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              {selectedMb.isContextMotoboy
                                ? `Histórico de Entregas (${finishedOrders.length})`
                                : `Rotas Concluídas (${selectedMb.completedTotal})`}
                            </h4>
                            {selectedMb.isContextMotoboy ? (
                              finishedOrders.length === 0 ? (
                                <Card className="p-6 text-center text-muted-foreground">Nenhuma entrega concluída.</Card>
                              ) : (
                                <div className="space-y-2">
                                  {finishedOrders.map(order => {
                                    const isExpanded = expandedOrders.has(order.id);
                                    return (
                                      <div key={order.id} className="border border-border rounded-xl overflow-hidden">
                                        <button
                                          className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-3 hover:bg-secondary transition-colors"
                                          onClick={() => toggleOrderExpand(order.id)}
                                          data-testid={`delivery-row-${order.id}`}
                                        >
                                          <span className="font-mono text-xs text-muted-foreground w-20">#{order.id.slice(-6)}</span>
                                          <span className="font-medium text-foreground flex-1 min-w-[100px]">{order.customerName}</span>
                                          <span className="text-muted-foreground text-sm flex-1 min-w-[100px]">{order.storeName || order.storeId}</span>
                                          <span className="font-semibold text-foreground">R$ {order.total.toFixed(2)}</span>
                                          <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" /> Entregue
                                          </Badge>
                                          <span className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</span>
                                          <span className="text-xs text-primary">{isExpanded ? '▲' : '▼'}</span>
                                        </button>
                                        {isExpanded && (
                                          <div className="border-t border-border bg-secondary/30 px-4 py-4 space-y-4">
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                              <div className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" />{order.customerName}</div>
                                              {order.customerEmail && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" />{order.customerEmail}</div>}
                                              {order.customerPhone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" />{order.customerPhone}</div>}
                                            </div>
                                            {order.deliveryAddress && (
                                              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                                <span>{order.deliveryAddress.logradouro}, {order.deliveryAddress.numero} — {order.deliveryAddress.bairro}, {order.deliveryAddress.cidade}/{order.deliveryAddress.uf}
                                                  {order.distanceKm != null && ` (${order.distanceKm.toFixed(1)} km)`}</span>
                                              </div>
                                            )}
                                            <div className="flex items-center gap-2 text-sm">
                                              <CreditCard className="w-4 h-4 text-muted-foreground" />
                                              {order.paymentStatus === 'paid'
                                                ? <Badge className="bg-green-100 text-green-800">Pago</Badge>
                                                : <Badge className="bg-amber-100 text-amber-800">Aguardando pagamento</Badge>}
                                            </div>
                                            {order.deliveryCode && (
                                              <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
                                                <KeyRound className="w-4 h-4 text-primary flex-shrink-0" />
                                                <div>
                                                  <p className="text-xs text-muted-foreground">Código de Entrega</p>
                                                  <p className="font-mono font-bold text-lg tracking-widest text-primary">{order.deliveryCode}</p>
                                                </div>
                                              </div>
                                            )}
                                            {order.statusHistory && order.statusHistory.length > 0 && (
                                              <div>
                                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Histórico de Status</p>
                                                <div className="space-y-1">
                                                  {order.statusHistory.map((entry, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                                                      {statusIcon(entry.status)}
                                                      <span className="text-foreground font-medium">{statusLabel(entry.status)}</span>
                                                      <span className="ml-auto">{fmtDateTime(entry.timestamp)}</span>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )
                            ) : (
                              simRoutes.length === 0 ? (
                                <Card className="p-6 text-center text-muted-foreground">Nenhuma rota registrada.</Card>
                              ) : (
                                <div className="space-y-2">
                                  {simRoutes.map(route => (
                                    <Card key={route.id} className="p-4 flex flex-wrap items-center gap-3 justify-between">
                                      <div>
                                        <div className="flex items-center gap-2 text-sm">
                                          <MapPin className="w-4 h-4 text-muted-foreground" />
                                          <span className="font-medium">{route.from}</span>
                                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                          <span>{route.to}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">{new Date(route.completedAt).toLocaleString('pt-BR')}</p>
                                      </div>
                                      <span className="font-semibold text-foreground">R$ {route.value.toFixed(2)}</span>
                                    </Card>
                                  ))}
                                </div>
                              )
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            ) : (
              /* ── MOTOBOY LIST ─────────────────────────────────────────────── */
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Bike className="w-5 h-5" /> Todos os Motoboys ({mbListWithContext.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {mbListWithContext.map(mb => (
                    <Card key={mb.id} className="p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="text-3xl">{mb.avatar}</div>
                          <div>
                            <p className="font-semibold text-foreground">{mb.name}</p>
                            <p className="text-xs text-muted-foreground">{mb.vehicle}</p>
                          </div>
                        </div>
                        <Badge className={
                          mb.status === 'available' ? 'bg-green-100 text-green-800' :
                          mb.status === 'on_route'  ? 'bg-blue-100 text-blue-800' :
                          mb.status === 'blocked'   ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-600'
                        }>
                          {mb.status === 'available' ? 'Disponível' :
                           mb.status === 'on_route'  ? 'Em rota' :
                           mb.status === 'blocked'   ? 'Bloqueado' : 'Indisponível'}
                        </Badge>
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="bg-secondary rounded-lg py-2">
                          <p className="text-muted-foreground">Hoje</p>
                          <p className="font-bold text-foreground">{mb.completedToday}</p>
                        </div>
                        <div className="bg-secondary rounded-lg py-2">
                          <p className="text-muted-foreground">Total</p>
                          <p className="font-bold text-foreground">{mb.completedTotal}</p>
                        </div>
                        <div className="bg-secondary rounded-lg py-2">
                          <p className="text-muted-foreground">⭐ Rating</p>
                          <p className="font-bold text-yellow-600">{mb.rating.toFixed(1)}</p>
                        </div>
                      </div>

                      {/* Phone */}
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{mb.phone}</span>
                      </div>

                      {/* Current route */}
                      {mb.currentRoute && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2 text-xs">
                          <p className="text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1">
                            <Navigation className="w-3.5 h-3.5" /> Em rota
                          </p>
                          <p className="text-muted-foreground mt-0.5 truncate">{mb.currentRoute.from} → {mb.currentRoute.to}</p>
                        </div>
                      )}

                      {/* Block info */}
                      {mb.blockInfo && (
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 text-xs text-red-700 dark:text-red-300">
                          <p className="font-medium">🚫 {mb.blockInfo.type === 'permanent' ? 'Bloqueado permanentemente' : `Bloqueado até ${mb.blockInfo.until?.toLocaleString('pt-BR') ?? '?'}`}</p>
                          <p className="text-muted-foreground mt-0.5">Motivo: {mb.blockInfo.reason}</p>
                        </div>
                      )}

                      {/* Saldo bonus */}
                      {mb.balanceBonus > 0 && (
                        <div className="flex items-center gap-1 text-xs text-green-700">
                          <Wallet className="w-3.5 h-3.5" /> Bônus acumulado: R$ {mb.balanceBonus.toFixed(2)}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex gap-2 pt-1 mt-auto">
                        <Button size="sm" className="flex-1 gap-1"
                          onClick={() => { setSelectedMbId(mb.id); setMbDetailTab('profile'); }}
                          data-testid={`btn-manage-mb-${mb.id}`}>
                          <Eye className="w-3.5 h-3.5" /> Gerenciar
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1"
                          onClick={() => setNotifMbDialog({ mbId: mb.id, mbName: mb.name })}
                          data-testid={`btn-notif-mb-${mb.id}`}>
                          <Bell className="w-3.5 h-3.5" />
                        </Button>
                        {mb.status === 'blocked' ? (
                          <Button size="sm" variant="outline" className="gap-1 text-green-700 border-green-400"
                            onClick={() => handleMbUnblock(mb.id, mb.name)}
                            data-testid={`btn-unblock-mb-${mb.id}`}>
                            <UserCheck className="w-3.5 h-3.5" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" className="gap-1 text-orange-600 border-orange-400"
                            onClick={() => setBlockDialog({ mbId: mb.id, mbName: mb.name })}
                            data-testid={`btn-block-mb-${mb.id}`}>
                            <Ban className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Motoboy Dialogs ───────────────────────────────────────────────── */}

        {/* Balance Dialog */}
        <Dialog open={!!balanceDialog} onOpenChange={open => { if (!open) { setBalanceDialog(null); setBalanceAmount(''); setBalanceType('add'); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-primary" />
                {balanceType === 'add' ? 'Creditar' : 'Debitar'} Saldo — {balanceDialog?.mbName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="flex gap-2">
                <Button size="sm" className={balanceType === 'add' ? 'bg-green-700 text-white' : 'bg-secondary text-foreground'}
                  onClick={() => setBalanceType('add')}>
                  <Plus className="w-4 h-4 mr-1" /> Creditar
                </Button>
                <Button size="sm" className={balanceType === 'deduct' ? 'bg-red-600 text-white' : 'bg-secondary text-foreground'}
                  onClick={() => setBalanceType('deduct')}>
                  <Minus className="w-4 h-4 mr-1" /> Debitar
                </Button>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Valor (R$)</label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0,00"
                  value={balanceAmount}
                  onChange={e => setBalanceAmount(e.target.value)}
                  data-testid="input-balance-amount"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBalanceDialog(null)}>Cancelar</Button>
              <Button
                className={balanceType === 'add' ? 'bg-green-700 hover:bg-green-800 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
                onClick={handleMbBalance}
                data-testid="btn-confirm-balance">
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Block Dialog */}
        <Dialog open={!!blockDialog} onOpenChange={open => { if (!open) { setBlockDialog(null); setBlockReason(''); setBlockDuration(''); setBlockType('permanent'); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-red-600" />
                Bloquear Motoboy — {blockDialog?.mbName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Tipo de Bloqueio</label>
                <Select value={blockType} onValueChange={(v: 'permanent' | 'hours' | 'days') => setBlockType(v)}>
                  <SelectTrigger data-testid="select-block-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="permanent">Permanente</SelectItem>
                    <SelectItem value="hours">Por horas</SelectItem>
                    <SelectItem value="days">Por dias</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {blockType !== 'permanent' && (
                <div>
                  <label className="text-sm font-medium text-foreground block mb-1">
                    Duração ({blockType === 'hours' ? 'horas' : 'dias'})
                  </label>
                  <Input
                    type="number"
                    min="1"
                    placeholder={blockType === 'hours' ? 'Ex: 24' : 'Ex: 7'}
                    value={blockDuration}
                    onChange={e => setBlockDuration(e.target.value)}
                    data-testid="input-block-duration"
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Motivo do bloqueio</label>
                <Textarea
                  placeholder="Descreva o motivo do bloqueio..."
                  value={blockReason}
                  onChange={e => setBlockReason(e.target.value)}
                  rows={3}
                  data-testid="input-block-reason"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBlockDialog(null)}>Cancelar</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white gap-2" onClick={handleMbBlock} data-testid="btn-confirm-block">
                <Ban className="w-4 h-4" /> Bloquear
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Remove Route Confirm Dialog */}
        <Dialog open={!!removeRouteConfirm} onOpenChange={open => { if (!open) setRemoveRouteConfirm(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" /> Retirar Rota do Motoboy
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-2">
              Tem certeza que deseja retirar a rota atual deste motoboy? A entrega em andamento pode ser afetada.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRemoveRouteConfirm(null)}>Cancelar</Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => removeRouteConfirm && handleMbRemoveRoute(removeRouteConfirm)} data-testid="btn-confirm-remove-route">
                Confirmar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Notification to Motoboy Dialog */}
        <Dialog open={!!notifMbDialog} onOpenChange={open => { if (!open) { setNotifMbDialog(null); setNotifMbTitle(''); setNotifMbBody(''); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" /> Enviar Notificação — {notifMbDialog?.mbName}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Título</label>
                <Input
                  placeholder="Ex: Atenção necessária"
                  value={notifMbTitle}
                  onChange={e => setNotifMbTitle(e.target.value)}
                  data-testid="input-notif-mb-title"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">Mensagem</label>
                <Textarea
                  placeholder="Escreva a mensagem..."
                  value={notifMbBody}
                  onChange={e => setNotifMbBody(e.target.value)}
                  rows={4}
                  data-testid="input-notif-mb-body"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setNotifMbDialog(null)}>Cancelar</Button>
              <Button className="gap-2" onClick={handleMbSendNotif} data-testid="btn-confirm-send-notif">
                <Send className="w-4 h-4" /> Enviar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Categories Tab ────────────────────────────────────────────────── */}
        {activeTab === 'categories' && (
          <div className="space-y-6">
            <p className="text-sm text-muted-foreground">
              Categorias derivadas dos produtos cadastrados na plataforma.
            </p>

            {realCategories.length === 0 ? (
              <Card className="p-10 text-center">
                <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-muted-foreground">Nenhuma categoria encontrada.</p>
                <p className="text-xs text-muted-foreground mt-1">Cadastre produtos com categorias para vê-las aqui.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {realCategories.map(category => {
                  const catProducts = products.filter(p => p.category === category.name);
                  const catSales = allOrders.flatMap(o => o.items).filter(i => {
                    const prod = products.find(p => p.id === i.productId);
                    return prod?.category === category.name;
                  }).reduce((sum, i) => sum + i.price * i.quantity, 0);
                  return (
                    <Card key={category.id} className="p-6 hover:shadow-lg transition-all">
                      <div className="text-4xl mb-4">{category.icon}</div>
                      <h4 className="text-lg font-semibold text-foreground mb-1">{category.name}</h4>
                      <div className="space-y-1 mb-4">
                        <p className="text-xs text-muted-foreground">
                          {catProducts.length} produto{catProducts.length !== 1 ? 's' : ''} cadastrado{catProducts.length !== 1 ? 's' : ''}
                        </p>
                        {catSales > 0 && (
                          <p className="text-xs text-primary font-medium">
                            R$ {catSales.toFixed(2)} em vendas
                          </p>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
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
                    {realStores.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground text-sm">
                          Nenhuma loja cadastrada.
                        </td>
                      </tr>
                    ) : realStores.map(store => {
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
                            {statusIcon(order.status)} {getDoubleRouteLabel(order) ?? statusLabel(order.status)}
                          </Badge>
                          {isDoubleRoute(order) && (
                            <Badge className="text-xs bg-purple-100 text-purple-800 flex-shrink-0">🔄 Rota dupla</Badge>
                          )}
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

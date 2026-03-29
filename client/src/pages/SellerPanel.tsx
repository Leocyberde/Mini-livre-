/**
 * Seller Panel - Dashboard for store owners
 * Features: Sales dashboard, product management, order management, store profile
 */
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { useProducts } from '@/contexts/ProductContext';
import { useProfile } from '@/contexts/ProfileContext';
import { calcMotoRideValue as calcDeliveryFee } from '@/lib/deliveryCalc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  TrendingUp, Package, ShoppingBag, DollarSign, CheckCircle,
  Clock, Edit, Trash2, Lock, Unlock, UserCog, MapPin, Bell, X, ChefHat, ThumbsUp, Plus, Bike, Navigation, Store, CreditCard, AlertCircle, KeyRound, CalendarClock,
  Home, MoreHorizontal, ChevronRight, Headphones, Wallet, Send, MessageCircle, ArrowLeft,
} from 'lucide-react';
import { useState, useMemo, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import ProductEditDialog from '@/components/ProductEditDialog';
import ProductAddDialog from '@/components/ProductAddDialog';
import SellerProfilePage from '@/pages/SellerProfilePage';
import { Order } from '@/lib/mockData';
import { useSupport, SUPPORT_CATEGORIES, SupportCategory } from '@/contexts/SupportContext';
import { useNotification } from '@/contexts/NotificationContext';
import { useProductQA } from '@/contexts/ProductQAContext';
import PromotionsScreen from '@/pages/PromotionsScreen';
import FinanceiroScreen from '@/pages/FinanceiroScreen';

export default function SellerPanel() {
  const { sellerOrders, updateOrderStatus, updatePaymentStatus, unseenSellerOrders, markSellerOrdersAsSeen, activeDeliveryRoutes, allOrders } = useMarketplace();
  const { products, deleteProduct, toggleFrozen } = useProducts();
  const { sellerProfile } = useProfile();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'pickup_waiting' | 'history' | 'products' | 'profile' | 'mais' | 'financeiro' | 'suporte' | 'notificacoes' | 'promocoes'>('dashboard');
  const [editingProduct, setEditingProduct] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newOrderPopup, setNewOrderPopup] = useState<Order | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending_payment' | 'paid'>('all');
  const [orderView, setOrderView] = useState<'active' | 'history'>('active');
  const [deliveryConfirmOrder, setDeliveryConfirmOrder] = useState<Order | null>(null);
  const [deliveryCodeInput, setDeliveryCodeInput] = useState('');
  const [deliveryCodeError, setDeliveryCodeError] = useState('');

  const { notifications, sellerUnread, markAllRead, markRead, addNotification, sellerNotifRequested, clearSellerNotifRequest } = useNotification();
  const sellerNotifications = notifications.filter(n => n.target === 'seller');

  const { answerQuestion, closeThread } = useProductQA();
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [repliedIds, setRepliedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (sellerNotifRequested) {
      setActiveTab('notificacoes');
      clearSellerNotifRequest();
    }
  }, [sellerNotifRequested, clearSellerNotifRequest]);

  const { submitTicket, sendMessage, getSellerActiveTicket } = useSupport();
  const [supportStep, setSupportStep] = useState<'select' | 'write' | 'sent'>('select');
  const [supportCategory, setSupportCategory] = useState<SupportCategory | null>(null);
  const [supportMessage, setSupportMessage] = useState('');
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const storeId = sellerProfile.storeId || 'store-1';
  const storeName = sellerProfile.storeName || 'Minha Loja';
  const activeTicket = getSellerActiveTicket(storeId);

  const storeOrders = sellerOrders.filter(o => o.storeId === storeId);
  const pickupWaitingOrders = storeOrders.filter(o => o.isPickup && o.status === 'ready_for_pickup');
  const deliveredHistoryOrders = storeOrders.filter(o => o.status === 'delivered');
  const activeStoreOrders = storeOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
  const historyStoreOrders = storeOrders.filter(o => o.status === 'delivered' || o.status === 'cancelled');
  const viewOrders = orderView === 'active' ? activeStoreOrders : historyStoreOrders;
  const filteredOrders = viewOrders.filter(o => {
    if (paymentFilter === 'pending_payment') return !o.paymentStatus || o.paymentStatus === 'pending_payment';
    if (paymentFilter === 'paid') return o.paymentStatus === 'paid';
    return true;
  });
  const storeProducts = products.filter(p => p.storeId === storeId);
  const storeUnseenOrders = unseenSellerOrders.filter(o => o.storeId === storeId);

  useEffect(() => {
    if (storeUnseenOrders.length > 0 && activeTab !== 'orders') {
      setNewOrderPopup(storeUnseenOrders[storeUnseenOrders.length - 1]);
    }
  }, [storeUnseenOrders, activeTab]);

  useEffect(() => {
    if (activeTab === 'orders') {
      markSellerOrdersAsSeen();
      setNewOrderPopup(null);
    }
  }, [activeTab]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTicket?.chat.length]);

  const getTimestampForStatus = (order: { statusHistory?: { status: string; timestamp: string }[] }, status: string): string | null => {
    if (!order.statusHistory) return null;
    return order.statusHistory.find(e => e.status === status)?.timestamp ?? null;
  };

  const fmtDateTime = (ts: string | null | undefined): string => {
    if (!ts) return '—';
    const d = new Date(ts);
    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const totalSales = storeOrders.reduce((sum, order) => sum + order.total, 0);
  const totalOrders = storeOrders.length;
  const pendingOrders = storeOrders.filter(o => o.status === 'pending').length;
  const readyOrders = storeOrders.filter(o => o.status === 'ready' || o.status === 'waiting_motoboy' || o.status === 'motoboy_accepted' || o.status === 'motoboy_at_store' || o.status === 'on_the_way' || o.status === 'motoboy_arrived').length;
  const deliveredOrders = storeOrders.filter(o => o.status === 'delivered').length;

  const salesData = useMemo(() => {
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
    const now = new Date();
    const dayTotals: Record<string, number> = {};
    // Initialize last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      dayTotals[dayNames[d.getDay()]] = 0;
    }
    // Fill with real order data
    storeOrders.forEach(order => {
      if (!order.createdAt) return;
      const d = new Date(order.createdAt);
      const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diff < 7) {
        const key = dayNames[d.getDay()];
        dayTotals[key] = (dayTotals[key] || 0) + order.total;
      }
    });
    return Object.entries(dayTotals).map(([name, vendas]) => ({ name, vendas: Math.round(vendas * 100) / 100 }));
  }, [storeOrders]);

  const orderStatusData = [
    { name: 'Pendente', value: pendingOrders, fill: '#FBBF24' },
    { name: 'Pronto', value: readyOrders, fill: '#10B981' },
    { name: 'Entregue', value: deliveredOrders, fill: '#3B82F6' },
  ];

  const handleUpdateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    updateOrderStatus(orderId, newStatus);
    toast.success('Status do pedido atualizado!');
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setIsEditDialogOpen(true);
  };

  const handleDeleteProduct = (productId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      deleteProduct(productId);
      toast.success('Produto excluído com sucesso!');
    }
  };

  const handleToggleFrozen = (productId: string, isFrozen: boolean) => {
    toggleFrozen(productId);
    toast.success(isFrozen ? 'Produto decongelado!' : 'Produto congelado!');
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { bg: string; text: string; label: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Pendente' },
      preparing: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Preparando' },
      ready: { bg: 'bg-green-100', text: 'text-green-800', label: 'Pronto' },
      ready_for_pickup: { bg: 'bg-teal-100', text: 'text-teal-800', label: 'Pronto para retirada' },
      waiting_motoboy: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Agrupando / Aguardando motoboy' },
      motoboy_accepted: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Motoboy a caminho' },
      motoboy_at_store: { bg: 'bg-teal-100', text: 'text-teal-800', label: 'Motoboy na loja' },
      on_the_way: { bg: 'bg-green-100', text: 'text-green-800', label: 'Motoboy indo para entrega' },
      motoboy_arrived: { bg: 'bg-orange-100', text: 'text-orange-800', label: 'Motoboy chegou na entrega' },
      delivered: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Entregue' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelado' },
    };
    const variant = variants[status] || variants.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${variant.bg} ${variant.text}`}>
        {variant.label}
      </span>
    );
  };

  const getDoubleRouteInfo = (order: Order) => {
    const route = activeDeliveryRoutes.find(r => r.orderIds.includes(order.id));
    if (!route || route.routeType !== 'double') return null;
    const idx = route.orderIds.indexOf(order.id);
    const otherOrderId = route.orderIds.find(id => id !== order.id);
    const otherOrder = otherOrderId ? allOrders.find(o => o.id === otherOrderId) : undefined;
    return { route, idx, otherOrder };
  };

  const getSellerStatusInfo = (order: Order) => {
    const { status } = order;
    if (status === 'ready' && !order.isPickup) {
      const isPaid = order.paymentStatus === 'paid';
      if (!isPaid) {
        return (
          <div className="mt-3 flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm text-amber-800 font-medium">Pedido pronto — aguardando confirmação de pagamento para despachar</p>
          </div>
        );
      }
      return (
        <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <Bike className="w-4 h-4 text-green-600 animate-pulse flex-shrink-0" />
          <p className="text-sm text-green-800 font-medium">Pedido pronto — sistema agrupando rota automaticamente (até 10 min)</p>
        </div>
      );
    }
    if (status === 'waiting_motoboy') {
      return (
        <div className="mt-3 flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
          <Bike className="w-4 h-4 text-purple-600 animate-pulse flex-shrink-0" />
          <p className="text-sm text-purple-800 font-medium">Rota despachada — aguardando motoboy aceitar a corrida...</p>
        </div>
      );
    }
    if (status === 'motoboy_accepted') {
      const dr = getDoubleRouteInfo(order);
      return (
        <div className="mt-3 flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
          <Navigation className="w-4 h-4 text-indigo-600 animate-pulse flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-indigo-800 font-medium">Corrida aceita — motoboy está indo até a loja</p>
            {!!dr && (
              <span className="inline-flex items-center gap-1 mt-1 bg-indigo-100 text-indigo-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                🔄 Rota dupla
              </span>
            )}
          </div>
        </div>
      );
    }
    if (status === 'motoboy_at_store') {
      const dr = getDoubleRouteInfo(order);
      return (
        <div className="mt-3 flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3">
          <Navigation className="w-4 h-4 text-teal-600 animate-pulse flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-teal-800 font-medium">Motoboy chegou à loja — pedido sendo coletado</p>
            {!!dr && (
              <span className="inline-flex items-center gap-1 mt-1 bg-teal-100 text-teal-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                🔄 Rota dupla (2 entregas)
              </span>
            )}
          </div>
        </div>
      );
    }
    if (status === 'on_the_way') {
      const dr = getDoubleRouteInfo(order);
      if (dr) {
        const { idx, otherOrder } = dr;
        const label = idx === 0 ? 'Indo para 1ª entrega de 2' : (otherOrder?.status === 'delivered' ? 'Indo para 2ª entrega (1ª entrega finalizada)' : 'Indo para 2ª entrega');
        return (
          <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <Navigation className="w-4 h-4 text-green-600 animate-pulse flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-green-800 font-medium">{label}</p>
              <span className="inline-flex items-center gap-1 mt-1 bg-green-100 text-green-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                🔄 Rota dupla
              </span>
            </div>
          </div>
        );
      }
      return (
        <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <Navigation className="w-4 h-4 text-green-600 animate-pulse flex-shrink-0" />
          <p className="text-sm text-green-800 font-medium">Motoboy está indo para entrega</p>
        </div>
      );
    }
    if (status === 'motoboy_arrived') {
      return (
        <div className="mt-3 flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <Navigation className="w-4 h-4 text-orange-600 animate-pulse flex-shrink-0" />
          <p className="text-sm text-orange-800 font-medium">Motoboy chegou na entrega — aguardando confirmação do cliente</p>
        </div>
      );
    }
    return null;
  };

  const displayName = sellerProfile.storeName || 'Minha Loja';
  const displayLogo = sellerProfile.storeLogo || '🏪';
  const displayAddress = sellerProfile.address
    ? `${sellerProfile.address.logradouro}, ${sellerProfile.address.numero} - ${sellerProfile.address.cidade}/${sellerProfile.address.uf}`
    : '';
  const isPhotoUrl = displayLogo && (displayLogo.startsWith('data:') || displayLogo.startsWith('http'));

  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-24">

      {/* ── DASHBOARD TAB ── */}
      {activeTab === 'dashboard' && (
        <>
          {/* Gradient header */}
          <div className="bg-gradient-to-br from-[#1E40AF] to-[#3B82F6] px-4 pt-6 pb-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center bg-white/20 flex-shrink-0">
                {isPhotoUrl ? (
                  <img src={displayLogo} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl">{displayLogo}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-blue-200 text-sm font-medium">Painel do Lojista</p>
                <h2 className="text-white text-2xl font-bold leading-tight truncate">{displayName}</h2>
                {displayAddress && (
                  <p className="text-blue-200 text-xs flex items-center gap-1 mt-0.5 truncate">
                    <MapPin className="w-3 h-3 flex-shrink-0" /> {displayAddress}
                  </p>
                )}
              </div>
            </div>
            {/* Quick KPI strip */}
            <div className="grid grid-cols-3 gap-3 mt-2">
              <div className="bg-white/15 rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold text-white">{totalOrders}</p>
                <p className="text-blue-200 text-xs mt-0.5">Pedidos</p>
              </div>
              <div className="bg-white/15 rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold text-white">{pendingOrders}</p>
                <p className="text-blue-200 text-xs mt-0.5">Pendentes</p>
              </div>
              <div className="bg-white/15 rounded-2xl p-3 text-center">
                <p className="text-2xl font-bold text-white">{deliveredOrders}</p>
                <p className="text-blue-200 text-xs mt-0.5">Entregues</p>
              </div>
            </div>
          </div>

          <div className="px-4 pt-5 space-y-4">
            {/* Revenue card */}
            <div className="bg-white rounded-2xl shadow-sm p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Minhas Vendas</p>
                <p className="text-2xl font-bold text-primary">R$ {totalSales.toFixed(2)}</p>
              </div>
            </div>

            {/* Charts */}
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="text-base font-bold text-foreground mb-4">Vendas da Semana</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                  <XAxis dataKey="name" stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #E5E7EB', borderRadius: 12 }} />
                  <Bar dataKey="vendas" fill="#1E40AF" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h3 className="text-base font-bold text-foreground mb-4">Status dos Pedidos</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={orderStatusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {orderStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* ── ORDERS TAB ── */}
      {activeTab === 'orders' && (
        <>
          {/* Page header */}
          <div className="bg-white border-b border-border px-4 pt-6 pb-4">
            <h2 className="text-xl font-bold text-foreground mb-4">Pedidos</h2>
            {/* Active / History toggle */}
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setOrderView('active')}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${orderView === 'active' ? 'bg-primary text-white' : 'bg-[#F8F9FC] text-muted-foreground'}`}
                data-testid="toggle-orders-active"
              >
                Ativos ({activeStoreOrders.length})
              </button>
              <button
                onClick={() => setOrderView('history')}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${orderView === 'history' ? 'bg-primary text-white' : 'bg-[#F8F9FC] text-muted-foreground'}`}
                data-testid="toggle-orders-history"
              >
                Histórico ({historyStoreOrders.length})
              </button>
            </div>
            {/* Payment filter pills */}
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              <button
                onClick={() => setPaymentFilter('all')}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${paymentFilter === 'all' ? 'bg-primary text-white' : 'bg-[#F8F9FC] text-foreground border border-border'}`}
                data-testid="filter-orders-all"
              >
                Todos ({storeOrders.length})
              </button>
              <button
                onClick={() => setPaymentFilter('pending_payment')}
                className={`flex-shrink-0 flex items-center gap-1 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${paymentFilter === 'pending_payment' ? 'bg-amber-500 text-white' : 'bg-[#F8F9FC] text-foreground border border-border'}`}
                data-testid="filter-orders-pending"
              >
                <AlertCircle className="w-3 h-3" />
                Pend. pagamento ({storeOrders.filter(o => !o.paymentStatus || o.paymentStatus === 'pending_payment').length})
              </button>
              <button
                onClick={() => setPaymentFilter('paid')}
                className={`flex-shrink-0 flex items-center gap-1 px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${paymentFilter === 'paid' ? 'bg-green-600 text-white' : 'bg-[#F8F9FC] text-foreground border border-border'}`}
                data-testid="filter-orders-paid"
              >
                <CheckCircle className="w-3 h-3" />
                Pagos ({storeOrders.filter(o => o.paymentStatus === 'paid').length})
              </button>
            </div>
          </div>

          <div className="px-4 pt-4 space-y-3">
            {filteredOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <ShoppingBag className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-lg font-semibold text-foreground mb-1">Nenhum pedido</p>
                <p className="text-muted-foreground text-sm">
                  {storeOrders.length === 0 ? 'Nenhum pedido recebido ainda' : 'Nenhum pedido nessa categoria'}
                </p>
              </div>
            ) : (
              filteredOrders.map(order => (
                <div key={order.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {/* Order header */}
                  <div className="px-4 pt-4 pb-3 border-b border-border">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">Pedido #{order.id}</p>
                        <p className="font-bold text-foreground">{order.customerName}</p>
                      </div>
                      <p className="text-lg font-bold text-primary flex-shrink-0">R$ {order.total.toFixed(2)}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {getStatusBadge(order.status)}
                      {order.isPickup ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                          <Store className="w-3 h-3" /> Retirada na loja
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                          <Bike className="w-3 h-3" /> Entrega
                        </span>
                      )}
                      {(!order.paymentStatus || order.paymentStatus === 'pending_payment') ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                          <AlertCircle className="w-3 h-3" /> Pag. pendente
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3" /> Pago
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Items */}
                  <div className="px-4 py-3">
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Itens</p>
                    <div className="space-y-2 bg-[#F8F9FC] rounded-xl p-3">
                      {order.items.map(item => {
                        const product = products.find(p => p.id === item.productId);
                        return (
                          <div key={item.productId} className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                              {product?.imageUrl ? (
                                <img src={product.imageUrl} alt={product.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                              ) : (
                                <span className="w-9 h-9 flex items-center justify-center text-xl bg-white rounded-lg flex-shrink-0">{product?.image}</span>
                              )}
                              <div>
                                <p className="font-medium text-foreground">{product?.name}</p>
                                <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                              </div>
                            </div>
                            <span className="font-semibold text-foreground">R$ {(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Status info banner */}
                    {getSellerStatusInfo(order)}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 pt-3 mt-3 border-t border-border">
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, 'pending')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${order.status === 'pending' ? 'bg-yellow-500 text-white' : 'bg-[#F8F9FC] text-foreground border border-border hover:border-yellow-300'}`}
                      >
                        <Clock className="w-3 h-3" /> Pendente
                      </button>
                      <button
                        onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${order.status === 'preparing' ? 'bg-orange-500 text-white' : 'bg-[#F8F9FC] text-foreground border border-border hover:border-orange-300'}`}
                      >
                        <ChefHat className="w-3 h-3" /> Preparando
                      </button>
                      {order.isPickup ? (
                        <button
                          disabled={order.paymentStatus !== 'paid'}
                          onClick={() => handleUpdateOrderStatus(order.id, 'ready_for_pickup')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 ${order.status === 'ready_for_pickup' ? 'bg-teal-600 text-white' : 'bg-[#F8F9FC] text-foreground border border-border hover:border-teal-300'}`}
                        >
                          <ThumbsUp className="w-3 h-3" /> Pronto p/ retirada
                        </button>
                      ) : (
                        <button
                          disabled={['waiting_motoboy', 'motoboy_accepted', 'motoboy_at_store', 'on_the_way', 'motoboy_arrived', 'delivered'].includes(order.status)}
                          onClick={() => handleUpdateOrderStatus(order.id, 'ready')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-40 ${order.status === 'ready' ? 'bg-green-600 text-white' : 'bg-[#F8F9FC] text-foreground border border-border hover:border-green-300'}`}
                        >
                          <ThumbsUp className="w-3 h-3" /> Marcar Pronto
                        </button>
                      )}
                      {(!order.paymentStatus || order.paymentStatus === 'pending_payment') ? (
                        <button
                          data-testid={`button-mark-paid-${order.id}`}
                          onClick={() => { updatePaymentStatus(order.id, 'paid'); toast.success('Pagamento confirmado!'); }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500 text-white hover:bg-amber-600 transition-all ml-auto"
                        >
                          <CreditCard className="w-3 h-3" /> Registrar Pagamento
                        </button>
                      ) : (
                        <span className="ml-auto flex items-center gap-1 text-xs text-green-700 font-medium">
                          <CheckCircle className="w-3 h-3" /> Pago
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ── PICKUP WAITING TAB ── */}
      {activeTab === 'pickup_waiting' && (
        <>
          <div className="bg-white border-b border-border px-4 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setActiveTab('mais')} className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-foreground">Aguardando Retirada</h2>
                <p className="text-sm text-muted-foreground">{pickupWaitingOrders.length} pedido(s)</p>
              </div>
            </div>
          </div>
          <div className="px-4 pt-4 space-y-3">
            {pickupWaitingOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Store className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-lg font-semibold text-foreground mb-1">Nenhum pedido aguardando</p>
                <p className="text-muted-foreground text-sm">Pedidos prontos para retirada aparecerão aqui</p>
              </div>
            ) : (
              pickupWaitingOrders.map(order => (
                <div key={order.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border-l-4 border-teal-500">
                  <div className="px-4 pt-4 pb-3 border-b border-border">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">Pedido #{order.id}</p>
                        <p className="font-bold text-foreground">{order.customerName}</p>
                        {order.customerPhone && <p className="text-xs text-muted-foreground">{order.customerPhone}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">R$ {order.total.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-3">
                    <div className="space-y-2 bg-[#F8F9FC] rounded-xl p-3 mb-3">
                      {order.items.map(item => {
                        const product = products.find(p => p.id === item.productId);
                        return (
                          <div key={item.productId} className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                              {product?.imageUrl ? (
                                <img src={product.imageUrl} alt={product.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                              ) : (
                                <span className="w-9 h-9 flex items-center justify-center text-xl bg-white rounded-lg flex-shrink-0">{product?.image}</span>
                              )}
                              <div>
                                <p className="font-medium text-foreground">{product?.name}</p>
                                <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                              </div>
                            </div>
                            <span className="font-semibold">R$ {(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-3 py-2">
                        <Store className="w-4 h-4 text-teal-600 flex-shrink-0" />
                        <p className="text-sm text-teal-800 font-medium">Cliente virá retirar</p>
                      </div>
                      <button
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all"
                        onClick={() => { setDeliveryConfirmOrder(order); setDeliveryCodeInput(''); setDeliveryCodeError(''); }}
                      >
                        <CheckCircle className="w-4 h-4" /> Marcar entregue
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ── HISTORY TAB ── */}
      {activeTab === 'history' && (
        <>
          <div className="bg-white border-b border-border px-4 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setActiveTab('mais')} className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-xl font-bold text-foreground">Histórico de Pedidos</h2>
                <p className="text-sm text-muted-foreground">{deliveredHistoryOrders.length} entregue(s)</p>
              </div>
            </div>
          </div>
          <div className="px-4 pt-4 space-y-3">
            {deliveredHistoryOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <CheckCircle className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-lg font-semibold text-foreground mb-1">Nenhum pedido entregue</p>
                <p className="text-muted-foreground text-sm">O histórico aparecerá aqui</p>
              </div>
            ) : (
              deliveredHistoryOrders.map(order => (
                <div key={order.id} className="bg-white rounded-2xl shadow-sm overflow-hidden border-l-4 border-blue-500">
                  <div className="px-4 pt-4 pb-3 border-b border-border">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-mono text-xs text-muted-foreground">Pedido #{order.id}</p>
                        <p className="font-bold text-foreground">{order.customerName}</p>
                        {order.customerEmail && <p className="text-xs text-muted-foreground">{order.customerEmail}</p>}
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-primary">R$ {order.total.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-3 space-y-3">
                    {/* Timeline */}
                    <div className="bg-blue-50 rounded-xl p-4">
                      <p className="text-xs font-bold text-blue-800 mb-3 flex items-center gap-1.5">
                        <CalendarClock className="w-3.5 h-3.5" /> Linha do Tempo
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="flex items-start gap-2">
                          <div className="w-7 h-7 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                            <Clock className="w-3.5 h-3.5 text-yellow-600" />
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">Pedido realizado</p>
                            <p className="text-xs font-semibold text-foreground">{fmtDateTime(order.createdAt)}</p>
                          </div>
                        </div>
                        {!order.isPickup ? (
                          <>
                            <div className="flex items-start gap-2">
                              <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                                <Bike className="w-3.5 h-3.5 text-orange-600" />
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground">Motoboy coletou</p>
                                <p className="text-xs font-semibold text-foreground">
                                  {fmtDateTime(getTimestampForStatus(order, 'on_the_way') ?? getTimestampForStatus(order, 'motoboy_at_store'))}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                              </div>
                              <div>
                                <p className="text-[10px] text-muted-foreground">Entregue ao cliente</p>
                                <p className="text-xs font-semibold text-foreground">
                                  {fmtDateTime(order.deliveredAt ?? getTimestampForStatus(order, 'delivered'))}
                                </p>
                              </div>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-start gap-2">
                            <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                              <Store className="w-3.5 h-3.5 text-teal-600" />
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground">Retirado pelo cliente</p>
                              <p className="text-xs font-semibold text-foreground">
                                {fmtDateTime(order.deliveredAt ?? getTimestampForStatus(order, 'delivered'))}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-2 bg-[#F8F9FC] rounded-xl p-3">
                      {order.items.map(item => {
                        const product = products.find(p => p.id === item.productId);
                        return (
                          <div key={item.productId} className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                              {product?.imageUrl ? (
                                <img src={product.imageUrl} alt={product.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                              ) : (
                                <span className="w-9 h-9 flex items-center justify-center text-xl bg-white rounded-lg flex-shrink-0">{product?.image}</span>
                              )}
                              <div>
                                <p className="font-medium text-foreground">{product?.name}</p>
                                <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                              </div>
                            </div>
                            <span className="font-semibold">R$ {(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        );
                      })}
                      {!order.isPickup && order.distanceKm != null && (() => {
                        const fee = calcDeliveryFee(order.distanceKm);
                        const subtotal = order.total - fee;
                        return (
                          <div className="mt-2 space-y-1 border-t border-border pt-2 text-sm">
                            <div className="flex justify-between text-muted-foreground">
                              <span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                              <span className="flex items-center gap-1"><Bike className="w-3 h-3" /> Taxa entrega</span>
                              <span>R$ {fee.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-foreground border-t border-border pt-1">
                              <span>Total</span><span>R$ {order.total.toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Status history */}
                    {order.statusHistory && order.statusHistory.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                          <CalendarClock className="w-3 h-3" /> Histórico de Status
                        </p>
                        <div className="space-y-1.5">
                          {order.statusHistory.map((entry, idx) => {
                            const labels: Record<string, string> = {
                              pending: 'Pedido Recebido', preparing: 'Preparando', ready: 'Pronto',
                              ready_for_pickup: 'Pronto para retirada', waiting_motoboy: 'Aguardando motoboy',
                              motoboy_accepted: 'Motoboy a caminho', motoboy_at_store: 'Motoboy na loja',
                              on_the_way: 'Motoboy saiu para entrega', delivered: 'Entregue', cancelled: 'Cancelado',
                            };
                            return (
                              <div key={idx} className="flex items-start gap-2 text-xs">
                                <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${idx === order.statusHistory!.length - 1 ? 'bg-primary' : 'bg-border'}`} />
                                <span className="font-medium text-foreground">{labels[entry.status] ?? entry.status}</span>
                                <span className="text-muted-foreground ml-auto">
                                  {new Date(entry.timestamp).toLocaleDateString('pt-BR')} {new Date(entry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {order.isPickup ? (
                        <span className="flex items-center gap-1.5 text-xs text-teal-700 font-medium">
                          <Store className="w-3.5 h-3.5" /> Retirada na loja
                        </span>
                      ) : (
                        order.deliveryAddress && (
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            {order.deliveryAddress.logradouro}, {order.deliveryAddress.numero} — {order.deliveryAddress.bairro}, {order.deliveryAddress.cidade}/{order.deliveryAddress.uf}
                          </span>
                        )
                      )}
                      <span className="ml-auto inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        <CheckCircle className="w-3 h-3" /> Entregue
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* ── PRODUCTS TAB ── */}
      {activeTab === 'products' && (
        <>
          <div className="bg-white border-b border-border px-4 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">Meus Produtos</h2>
                <p className="text-sm text-muted-foreground">{storeProducts.length} produto(s) cadastrado(s)</p>
              </div>
              <button
                onClick={() => setIsAddDialogOpen(true)}
                className="flex items-center gap-1.5 bg-primary text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" /> Novo Produto
              </button>
            </div>
          </div>
          <div className="px-4 pt-4">
            {storeProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Package className="w-7 h-7 text-muted-foreground" />
                </div>
                <p className="text-lg font-semibold text-foreground mb-1">Nenhum produto</p>
                <p className="text-muted-foreground text-sm mb-4">Adicione produtos para sua loja</p>
                <button
                  onClick={() => setIsAddDialogOpen(true)}
                  className="flex items-center gap-2 bg-primary text-white font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 transition-all"
                >
                  <Plus className="w-4 h-4" /> Adicionar produto
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pb-4">
                {storeProducts.map(product => (
                  <div
                    key={product.id}
                    className={`bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col ${product.frozen ? 'opacity-60' : ''}`}
                  >
                    {/* Image */}
                    <div className="relative aspect-square bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-4xl overflow-hidden">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <span>{product.image}</span>
                      )}
                      {product.frozen && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Lock className="w-6 h-6 text-white" />
                        </div>
                      )}
                      {product.frozen && (
                        <span className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-2 py-0.5 rounded-full">Congelado</span>
                      )}
                    </div>
                    {/* Info */}
                    <div className="p-3 flex flex-col flex-1">
                      <p className="text-xs text-muted-foreground mb-0.5 truncate">{product.category}</p>
                      <p className="text-sm font-semibold text-foreground line-clamp-2 leading-tight mb-2 flex-1">{product.name}</p>
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-base font-bold text-primary">R$ {product.price.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">Estoque: {product.stock}</p>
                      </div>
                      {/* Actions */}
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="flex-1 flex items-center justify-center gap-1 bg-primary text-white text-xs font-semibold py-2 rounded-xl hover:bg-primary/90 transition-all"
                        >
                          <Edit className="w-3 h-3" /> Editar
                        </button>
                        <button
                          onClick={() => handleToggleFrozen(product.id, product.frozen || false)}
                          className={`flex items-center justify-center px-2 py-2 rounded-xl transition-all border ${product.frozen ? 'bg-yellow-100 border-yellow-200 text-yellow-700' : 'bg-[#F8F9FC] border-border text-muted-foreground hover:border-yellow-300'}`}
                        >
                          {product.frozen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="flex items-center justify-center px-2 py-2 rounded-xl bg-[#F8F9FC] border border-border text-red-400 hover:border-red-300 hover:bg-red-50 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── PROFILE TAB ── */}
      {activeTab === 'profile' && (
        <SellerProfilePage onBack={() => setActiveTab('mais')} />
      )}

      {/* ── PROMOÇÕES TAB ── */}
      {activeTab === 'promocoes' && (
        <PromotionsScreen onBack={() => setActiveTab('mais')} />
      )}

      {/* ── FINANCEIRO TAB ── */}
      {activeTab === 'financeiro' && (
        <FinanceiroScreen onBack={() => setActiveTab('mais')} />
      )}

      {/* ── SUPORTE TAB ── */}
      {activeTab === 'suporte' && (
        <>
          <div className="bg-white border-b border-border px-4 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setActiveTab('mais')} className="text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <Headphones className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-bold text-foreground">Suporte</h2>
              </div>
            </div>
          </div>
          <div className="px-4 pt-4 max-w-lg mx-auto">
            {/* Active chat */}
            {activeTicket?.status === 'in_chat' && (
              <div className="flex flex-col h-[70vh] bg-white rounded-2xl overflow-hidden shadow-sm border border-border">
                <div className="flex items-center gap-3 px-4 py-3 bg-primary text-white">
                  <MessageCircle className="w-5 h-5" />
                  <div>
                    <p className="font-semibold text-sm">Atendimento em andamento</p>
                    <p className="text-xs text-white/80">{activeTicket.category}</p>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8F9FC]">
                  {activeTicket.chat.map(msg => (
                    <div key={msg.id} className={`flex ${msg.sender === 'seller' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${msg.sender === 'seller' ? 'bg-primary text-white rounded-br-sm' : 'bg-white border border-border text-foreground rounded-bl-sm'}`}>
                        {msg.sender === 'admin' && (
                          <p className="text-[10px] font-semibold text-muted-foreground mb-1">Suporte Marketplace</p>
                        )}
                        <p>{msg.text}</p>
                        <p className={`text-[10px] mt-1 ${msg.sender === 'seller' ? 'text-white/70' : 'text-muted-foreground'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div className="flex items-center gap-2 p-3 border-t border-border bg-white">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && chatInput.trim()) {
                        sendMessage(activeTicket.id, 'seller', chatInput.trim());
                        setChatInput('');
                      }
                    }}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 border border-border rounded-xl px-4 py-2 text-sm bg-[#F8F9FC] focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button
                    disabled={!chatInput.trim()}
                    onClick={() => { if (chatInput.trim()) { sendMessage(activeTicket.id, 'seller', chatInput.trim()); setChatInput(''); } }}
                    className="p-2.5 bg-primary text-white rounded-xl disabled:opacity-40 hover:bg-primary/90 transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Pending ticket */}
            {activeTicket?.status === 'pending' && (
              <div className="bg-white rounded-2xl shadow-sm p-8 text-center border-2 border-dashed border-primary/30">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="text-lg font-bold text-foreground mb-2">Solicitação enviada!</h4>
                <p className="text-muted-foreground text-sm mb-4">Em breve um membro da equipe irá te atender.</p>
                <div className="bg-[#F8F9FC] rounded-xl p-3 text-left text-sm mb-4">
                  <p className="text-muted-foreground text-xs mb-1">Categoria</p>
                  <p className="font-semibold text-foreground">{activeTicket.category}</p>
                  <p className="text-muted-foreground text-xs mt-2 mb-1">Mensagem</p>
                  <p className="text-foreground">{activeTicket.message}</p>
                </div>
                <p className="text-xs text-muted-foreground">O chat abrirá automaticamente quando um atendente iniciar.</p>
              </div>
            )}

            {/* No active ticket */}
            {!activeTicket && (
              <div className="space-y-3">
                {supportStep === 'select' && (
                  <>
                    <p className="text-sm text-muted-foreground mb-4">Como podemos te ajudar? Selecione a categoria:</p>
                    {SUPPORT_CATEGORIES.map(cat => (
                      <button
                        key={cat.label}
                        onClick={() => { setSupportCategory(cat.label); setSupportStep('write'); }}
                        className="w-full flex items-center gap-4 bg-white border border-border rounded-2xl px-5 py-4 hover:bg-[#F8F9FC] hover:border-primary/40 transition-all text-left shadow-sm"
                      >
                        <span className="text-2xl w-8 text-center flex-shrink-0">{cat.emoji}</span>
                        <span className="font-semibold text-foreground">{cat.label}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto flex-shrink-0" />
                      </button>
                    ))}
                  </>
                )}

                {supportStep === 'write' && supportCategory && (
                  <div className="space-y-4">
                    <button
                      onClick={() => { setSupportStep('select'); setSupportCategory(null); setSupportMessage(''); }}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" /> Voltar
                    </button>
                    <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3">
                      <p className="text-xs text-muted-foreground mb-1">Categoria selecionada</p>
                      <p className="font-semibold text-primary text-sm">
                        {SUPPORT_CATEGORIES.find(c => c.label === supportCategory)?.emoji} {supportCategory}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-foreground mb-2 block">Descreva seu problema:</label>
                      <textarea
                        value={supportMessage}
                        onChange={e => setSupportMessage(e.target.value)}
                        placeholder={`Ex: "Pedido #123 não apareceu no painel"`}
                        rows={4}
                        className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-[#F8F9FC] focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      />
                    </div>
                    <button
                      disabled={!supportMessage.trim()}
                      onClick={() => {
                        if (supportMessage.trim() && supportCategory) {
                          submitTicket(storeId, storeName, supportCategory, supportMessage.trim());
                          setSupportStep('sent');
                          setSupportMessage('');
                          setSupportCategory(null);
                        }
                      }}
                      className="w-full flex items-center justify-center gap-2 bg-primary text-white font-semibold py-3 rounded-xl hover:bg-primary/90 transition-all disabled:opacity-40"
                    >
                      <Send className="w-4 h-4" /> Enviar Solicitação
                    </button>
                  </div>
                )}

                {supportStep === 'sent' && (
                  <div className="bg-white rounded-2xl shadow-sm p-8 text-center border-2 border-dashed border-green-300">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h4 className="text-lg font-bold text-foreground mb-2">Solicitação enviada!</h4>
                    <p className="text-muted-foreground text-sm mb-6">
                      Em breve um membro da equipe irá te atender.<br />
                      O chat abrirá quando o ADM iniciar o atendimento.
                    </p>
                    <button
                      onClick={() => setSupportStep('select')}
                      className="border border-border text-foreground font-semibold px-6 py-2.5 rounded-xl hover:bg-[#F8F9FC] transition-all"
                    >
                      Fechar
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── NOTIFICAÇÕES TAB ── */}
      {activeTab === 'notificacoes' && (
        <>
          <div className="bg-white border-b border-border px-4 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setActiveTab('mais')} className="text-muted-foreground hover:text-foreground transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-xl font-bold text-foreground">Notificações</h2>
              </div>
              {sellerNotifications.length > 0 && (
                <button
                  onClick={() => markAllRead('seller')}
                  className="text-sm text-primary font-semibold hover:underline"
                >
                  Marcar todas lidas
                </button>
              )}
            </div>
          </div>
          <div className="px-4 pt-4">
            {sellerNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Bell className="w-7 h-7 text-muted-foreground opacity-40" />
                </div>
                <p className="text-lg font-semibold text-foreground mb-1">Nenhuma notificação</p>
                <p className="text-muted-foreground text-sm">Novos pedidos e atualizações aparecerão aqui.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[...sellerNotifications].reverse().map(n => {
                  const isQuestion = n.type === 'question';
                  const questionId = n.metadata?.questionId ?? '';
                  const alreadyReplied = repliedIds.has(questionId);

                  return (
                    <div
                      key={n.id}
                      data-testid={`notif-seller-${n.id}`}
                      className={`bg-white rounded-2xl shadow-sm border transition-all ${n.read ? 'border-border opacity-70' : 'border-primary/20 bg-primary/5'}`}
                    >
                      <div className="flex items-start gap-3 p-4">
                        <div className="text-2xl mt-0.5 flex-shrink-0">{n.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm ${n.read ? 'text-foreground' : 'text-primary'}`}>{n.title}</p>
                          <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{n.body}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(n.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {!n.read && <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                      </div>

                      {isQuestion && questionId && (
                        <div className="px-4 pb-4 space-y-2">
                          {alreadyReplied ? (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                              <p className="text-sm text-green-700 font-semibold">✅ Pergunta respondida e chat encerrado</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground">Responder ao cliente:</p>
                              <textarea
                                className="w-full text-sm border border-border rounded-xl p-3 bg-[#F8F9FC] resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                                rows={3}
                                placeholder="Digite sua resposta..."
                                value={replyInputs[questionId] ?? ''}
                                onChange={e => setReplyInputs(prev => ({ ...prev, [questionId]: e.target.value }))}
                                data-testid={`input-reply-${questionId}`}
                              />
                              <button
                                className="w-full flex items-center justify-center gap-1.5 bg-primary text-white text-sm font-semibold rounded-xl py-2.5 px-4 hover:bg-primary/90 transition-colors disabled:opacity-50"
                                disabled={!(replyInputs[questionId] ?? '').trim()}
                                data-testid={`btn-reply-${questionId}`}
                                onClick={() => {
                                  const reply = (replyInputs[questionId] ?? '').trim();
                                  if (!reply) return;
                                  answerQuestion(questionId, reply);
                                  closeThread(questionId);
                                  markRead(n.id);
                                  addNotification({
                                    target: 'client',
                                    type: 'question_answer',
                                    icon: '💬',
                                    title: `Resposta do lojista: ${n.metadata?.productName ?? 'produto'}`,
                                    body: reply,
                                    metadata: {
                                      questionId,
                                      productId: n.metadata?.productId ?? '',
                                      productName: n.metadata?.productName ?? '',
                                      storeId: n.metadata?.storeId ?? '',
                                    },
                                  });
                                  setRepliedIds(prev => new Set([...prev, questionId]));
                                  toast.success('Resposta enviada e chat encerrado!');
                                }}
                              >
                                <Send className="w-3.5 h-3.5" /> Responder e encerrar chat
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── MAIS TAB ── */}
      {activeTab === 'mais' && (
        <div className="px-4 py-6 max-w-md mx-auto">
          {/* Profile card */}
          <div className="bg-gradient-to-r from-[#1E40AF] to-[#3B82F6] rounded-2xl p-5 mb-5 text-white flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center bg-white/20 flex-shrink-0">
              {isPhotoUrl ? (
                <img src={displayLogo} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl">{displayLogo}</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg leading-tight truncate">{displayName}</p>
              {displayAddress && (
                <p className="text-blue-200 text-xs mt-0.5 truncate flex items-center gap-1">
                  <MapPin className="w-3 h-3 flex-shrink-0" /> {displayAddress}
                </p>
              )}
            </div>
            <button
              onClick={() => setActiveTab('profile')}
              className="bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-all flex-shrink-0"
            >
              Editar
            </button>
          </div>

          {/* Action grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => setActiveTab('dashboard')}
              className="bg-white rounded-2xl p-4 flex flex-col items-start gap-3 hover:shadow-md transition-all border border-border active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <p className="font-semibold text-sm text-foreground">Dashboard</p>
            </button>

            <button
              onClick={() => setActiveTab('pickup_waiting')}
              className="bg-white rounded-2xl p-4 flex flex-col items-start gap-3 hover:shadow-md transition-all border border-border active:scale-[0.98] relative"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center relative">
                <Store className="w-5 h-5 text-teal-600" />
                {pickupWaitingOrders.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {pickupWaitingOrders.length}
                  </span>
                )}
              </div>
              <p className="font-semibold text-sm text-foreground">Ag. Retirada</p>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className="bg-white rounded-2xl p-4 flex flex-col items-start gap-3 hover:shadow-md transition-all border border-border active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-indigo-600" />
              </div>
              <p className="font-semibold text-sm text-foreground">Histórico</p>
            </button>

            <button
              onClick={() => { markAllRead('seller'); setActiveTab('notificacoes'); }}
              className="bg-white rounded-2xl p-4 flex flex-col items-start gap-3 hover:shadow-md transition-all border border-border active:scale-[0.98] relative"
              data-testid="btn-notifications-seller"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center relative">
                <Bell className="w-5 h-5 text-amber-600" />
                {sellerUnread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {sellerUnread > 9 ? '9+' : sellerUnread}
                  </span>
                )}
              </div>
              <p className="font-semibold text-sm text-foreground">Notificações</p>
            </button>

            <button
              onClick={() => setActiveTab('financeiro')}
              className="bg-white rounded-2xl p-4 flex flex-col items-start gap-3 hover:shadow-md transition-all border border-border active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-green-600" />
              </div>
              <p className="font-semibold text-sm text-foreground">Financeiro</p>
            </button>

            <button
              onClick={() => setActiveTab('suporte')}
              className="bg-white rounded-2xl p-4 flex flex-col items-start gap-3 hover:shadow-md transition-all border border-border active:scale-[0.98]"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Headphones className="w-5 h-5 text-purple-600" />
              </div>
              <p className="font-semibold text-sm text-foreground">Suporte</p>
            </button>

            <button
              onClick={() => setActiveTab('promocoes')}
              className="bg-white rounded-2xl p-4 flex flex-col items-start gap-3 hover:shadow-md transition-all border border-border active:scale-[0.98]"
              data-testid="btn-promocoes-mais"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <CalendarClock className="w-5 h-5 text-rose-600" />
              </div>
              <p className="font-semibold text-sm text-foreground">Promoções</p>
            </button>
          </div>

          {/* Profile link */}
          <button
            onClick={() => setActiveTab('profile')}
            className="w-full flex items-center justify-between bg-white border border-border rounded-2xl px-4 py-3.5 hover:shadow-sm transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
                <UserCog className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm text-foreground">Minha Loja</p>
                <p className="text-xs text-muted-foreground">Editar perfil e configurações</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* ── FIXED BOTTOM NAV ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-card border-t border-border shadow-lg">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${activeTab === 'dashboard' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs font-medium">Início</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${activeTab === 'products' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <Package className="w-6 h-6" />
            <span className="text-xs font-medium">Produtos</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all relative ${activeTab === 'orders' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <div className="relative">
              <ShoppingBag className="w-6 h-6" />
              {storeUnseenOrders.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                  {storeUnseenOrders.length}
                </span>
              )}
            </div>
            <span className="text-xs font-medium">Pedidos</span>
          </button>

          <button
            onClick={() => setActiveTab(activeTab === 'mais' ? 'dashboard' : 'mais')}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${['mais', 'financeiro', 'suporte', 'pickup_waiting', 'history', 'profile', 'notificacoes', 'promocoes'].includes(activeTab) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <MoreHorizontal className="w-6 h-6" />
            <span className="text-xs font-medium">Mais</span>
          </button>
        </div>
      </nav>

      {/* New order popup */}
      {newOrderPopup && (
        <div className="fixed top-20 left-4 right-4 z-50 bg-white rounded-2xl shadow-2xl border border-border p-4 flex items-start gap-3 animate-in slide-in-from-top-4 duration-300">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
            <ShoppingBag className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-foreground">Novo pedido recebido!</p>
            <p className="text-xs text-muted-foreground truncate">#{newOrderPopup.id} — {newOrderPopup.customerName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setActiveTab('orders'); setNewOrderPopup(null); }}
              className="bg-primary text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
            >
              Ver
            </button>
            <button onClick={() => setNewOrderPopup(null)} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add Product Dialog */}
      <ProductAddDialog
        storeId={storeId}
        isOpen={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
      />

      {/* Edit Product Dialog */}
      <ProductEditDialog
        product={editingProduct}
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setEditingProduct(null);
        }}
      />

      {/* Delivery Code Validation Dialog */}
      {deliveryConfirmOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-card rounded-2xl shadow-2xl max-w-sm w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="bg-blue-600 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Confirmar Entrega</h3>
                  <p className="text-white/80 text-sm">Pedido #{deliveryConfirmOrder.id}</p>
                </div>
              </div>
              <button onClick={() => setDeliveryConfirmOrder(null)} className="text-white/70 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                Digite os <span className="font-semibold text-foreground">4 últimos dígitos</span> do telefone do cliente para confirmar a retirada.
              </p>
              <div>
                <input
                  type="text"
                  maxLength={4}
                  inputMode="numeric"
                  placeholder="0000"
                  value={deliveryCodeInput}
                  onChange={e => {
                    setDeliveryCodeInput(e.target.value.replace(/\D/g, '').slice(0, 4));
                    setDeliveryCodeError('');
                  }}
                  className="w-full text-center text-4xl font-mono tracking-widest border-2 border-border rounded-xl py-4 focus:outline-none focus:border-blue-500 bg-[#F8F9FC]"
                />
                {deliveryCodeError && (
                  <p className="text-destructive text-sm mt-2 text-center font-medium">{deliveryCodeError}</p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeliveryConfirmOrder(null)}
                  className="flex-1 border border-border text-foreground font-semibold py-2.5 rounded-xl hover:bg-[#F8F9FC] transition-all"
                >
                  Cancelar
                </button>
                <button
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition-all"
                  onClick={() => {
                    const expected = deliveryConfirmOrder.deliveryCode || '';
                    if (deliveryCodeInput !== expected) {
                      setDeliveryCodeError('Código incorreto. Tente novamente.');
                      return;
                    }
                    handleUpdateOrderStatus(deliveryConfirmOrder.id, 'delivered');
                    toast.success('Pedido marcado como entregue!');
                    setDeliveryConfirmOrder(null);
                    setDeliveryCodeInput('');
                    setDeliveryCodeError('');
                  }}
                >
                  <CheckCircle className="w-4 h-4" /> Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

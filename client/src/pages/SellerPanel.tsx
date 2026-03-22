/**
 * Seller Panel - Dashboard for store owners
 * Features: Sales dashboard, product management, order management, store profile
 */
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { useProducts } from '@/contexts/ProductContext';
import { useProfile } from '@/contexts/ProfileContext';
import { getStoreById } from '@/lib/mockData';
import { calcDeliveryFee } from '@/lib/deliveryCalc';
import { Card } from '@/components/ui/card';
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

const STORE_ID = 'store-1'; // Simulating seller logged in as store-1

export default function SellerPanel() {
  const { sellerOrders, updateOrderStatus, updatePaymentStatus, unseenSellerOrders, markSellerOrdersAsSeen } = useMarketplace();
  const { products, deleteProduct, toggleFrozen } = useProducts();
  const { sellerProfile } = useProfile();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'pickup_waiting' | 'history' | 'products' | 'profile' | 'mais' | 'financeiro' | 'suporte' | 'notificacoes'>('dashboard');
  const [editingProduct, setEditingProduct] = useState(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newOrderPopup, setNewOrderPopup] = useState<Order | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending_payment' | 'paid'>('all');
  const [orderView, setOrderView] = useState<'active' | 'history'>('active');
  const [deliveryConfirmOrder, setDeliveryConfirmOrder] = useState<Order | null>(null);
  const [deliveryCodeInput, setDeliveryCodeInput] = useState('');
  const [deliveryCodeError, setDeliveryCodeError] = useState('');

  // Notifications
  const { notifications, sellerUnread, markAllRead, markRead, addNotification, sellerNotifRequested, clearSellerNotifRequest } = useNotification();
  const sellerNotifications = notifications.filter(n => n.target === 'seller');

  // Q&A
  const { answerQuestion, closeThread } = useProductQA();
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [repliedIds, setRepliedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (sellerNotifRequested) {
      setActiveTab('notificacoes');
      clearSellerNotifRequest();
    }
  }, [sellerNotifRequested, clearSellerNotifRequest]);

  // Support
  const { submitTicket, sendMessage, getSellerActiveTicket } = useSupport();
  const [supportStep, setSupportStep] = useState<'select' | 'write' | 'sent'>('select');
  const [supportCategory, setSupportCategory] = useState<SupportCategory | null>(null);
  const [supportMessage, setSupportMessage] = useState('');
  const [chatInput, setChatInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const store = getStoreById(STORE_ID);
  const storeName = store?.name ?? 'Minha Loja';
  const activeTicket = getSellerActiveTicket(STORE_ID);

  const storeOrders = sellerOrders.filter(o => o.storeId === STORE_ID);
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
  const storeProducts = products.filter(p => p.storeId === STORE_ID);
  const storeUnseenOrders = unseenSellerOrders.filter(o => o.storeId === STORE_ID);

  // Show popup for new orders
  useEffect(() => {
    if (storeUnseenOrders.length > 0 && activeTab !== 'orders') {
      setNewOrderPopup(storeUnseenOrders[storeUnseenOrders.length - 1]);
    }
  }, [storeUnseenOrders, activeTab]);

  // When entering orders tab, mark as seen
  useEffect(() => {
    if (activeTab === 'orders') {
      markSellerOrdersAsSeen();
      setNewOrderPopup(null);
    }
  }, [activeTab]);

  // Auto-scroll chat to bottom
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

  // Calculate metrics
  const totalSales = storeOrders.reduce((sum, order) => sum + order.total, 0);
  const totalOrders = storeOrders.length;
  const pendingOrders = storeOrders.filter(o => o.status === 'pending').length;
  const readyOrders = storeOrders.filter(o => o.status === 'ready' || o.status === 'waiting_motoboy' || o.status === 'motoboy_accepted' || o.status === 'motoboy_at_store' || o.status === 'on_the_way').length;
  const deliveredOrders = storeOrders.filter(o => o.status === 'delivered').length;

  // Chart data (memoized to avoid re-randomizing on re-render)
  const salesData = useMemo(() => [
    { name: 'Seg', vendas: Math.floor(Math.random() * 5000) },
    { name: 'Ter', vendas: Math.floor(Math.random() * 5000) },
    { name: 'Qua', vendas: Math.floor(Math.random() * 5000) },
    { name: 'Qui', vendas: Math.floor(Math.random() * 5000) },
    { name: 'Sex', vendas: Math.floor(Math.random() * 5000) },
    { name: 'Sab', vendas: Math.floor(Math.random() * 5000) },
    { name: 'Dom', vendas: Math.floor(Math.random() * 5000) },
  ], []);

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
      waiting_motoboy: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Aguardando motoboy' },
      motoboy_accepted: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Motoboy a caminho' },
      motoboy_at_store: { bg: 'bg-teal-100', text: 'text-teal-800', label: 'Motoboy na loja' },
      on_the_way: { bg: 'bg-green-100', text: 'text-green-800', label: 'Motoboy indo para entrega' },
      delivered: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Entregue' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800', label: 'Cancelado' },
    };
    const variant = variants[status] || variants.pending;
    return (
      <Badge className={`${variant.bg} ${variant.text}`}>
        {variant.label}
      </Badge>
    );
  };

  const getSellerStatusInfo = (status: string) => {
    if (status === 'waiting_motoboy') {
      return (
        <div className="mt-3 flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-4 py-3">
          <Bike className="w-4 h-4 text-purple-600 animate-pulse flex-shrink-0" />
          <p className="text-sm text-purple-800 font-medium">Aguardando motoboy aceitar a corrida...</p>
        </div>
      );
    }
    if (status === 'motoboy_accepted') {
      return (
        <div className="mt-3 flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3">
          <Navigation className="w-4 h-4 text-indigo-600 animate-pulse flex-shrink-0" />
          <p className="text-sm text-indigo-800 font-medium">Corrida aceita — motoboy está indo até a loja</p>
        </div>
      );
    }
    if (status === 'motoboy_at_store') {
      return (
        <div className="mt-3 flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-lg px-4 py-3">
          <Navigation className="w-4 h-4 text-teal-600 animate-pulse flex-shrink-0" />
          <p className="text-sm text-teal-800 font-medium">Motoboy chegou à loja — pedido sendo coletado</p>
        </div>
      );
    }
    if (status === 'on_the_way') {
      return (
        <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <Navigation className="w-4 h-4 text-green-600 animate-pulse flex-shrink-0" />
          <p className="text-sm text-green-800 font-medium">Motoboy está indo para entrega</p>
        </div>
      );
    }
    return null;
  };

  // Display name: prefer profile name, fallback to mockData
  const displayName = sellerProfile.storeName || store?.name || 'Minha Loja';
  const displayLogo = sellerProfile.storeLogo || store?.logo || '🏪';
  const displayAddress = sellerProfile.address
    ? `${sellerProfile.address.logradouro}, ${sellerProfile.address.numero} - ${sellerProfile.address.cidade}/${sellerProfile.address.uf}`
    : store?.location || '';

  const isPhotoUrl = displayLogo && (displayLogo.startsWith('data:') || displayLogo.startsWith('http'));

  return (
    <div className="min-h-screen bg-background py-12 pb-24">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center bg-secondary border border-border">
              {isPhotoUrl ? (
                <img src={displayLogo} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl">{displayLogo}</span>
              )}
            </div>
            <div>
              <h2 className="text-3xl font-display font-bold text-foreground">{displayName}</h2>
              {displayAddress && (
                <p className="text-muted-foreground flex items-center gap-1 text-sm">
                  <MapPin className="w-3 h-3" />
                  {displayAddress}
                </p>
              )}
            </div>
          </div>

        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Minhas Vendas</p>
                    <p className="text-3xl font-bold text-primary">R$ {totalSales.toFixed(2)}</p>
                  </div>
                  <DollarSign className="w-12 h-12 text-accent opacity-20" />
                </div>
              </Card>
              <Card className="p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Total de Pedidos</p>
                    <p className="text-3xl font-bold text-primary">{totalOrders}</p>
                  </div>
                  <ShoppingBag className="w-12 h-12 text-accent opacity-20" />
                </div>
              </Card>
              <Card className="p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Pendentes</p>
                    <p className="text-3xl font-bold text-accent">{pendingOrders}</p>
                  </div>
                  <Clock className="w-12 h-12 text-accent opacity-20" />
                </div>
              </Card>
              <Card className="p-6 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Entregues</p>
                    <p className="text-3xl font-bold text-green-600">{deliveredOrders}</p>
                  </div>
                  <CheckCircle className="w-12 h-12 text-green-600 opacity-20" />
                </div>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Vendas da Semana</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="name" stroke="#6B7280" />
                    <YAxis stroke="#6B7280" />
                    <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }} />
                    <Bar dataKey="vendas" fill="#1E40AF" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Status dos Pedidos</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={orderStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {orderStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Payment filter */}
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant={paymentFilter === 'all' ? 'default' : 'outline'}
                className="gap-1"
                onClick={() => setPaymentFilter('all')}
                data-testid="filter-orders-all"
              >
                Todos
                <span className="ml-1 text-xs font-normal opacity-70">({storeOrders.length})</span>
              </Button>
              <Button
                size="sm"
                variant={paymentFilter === 'pending_payment' ? 'default' : 'outline'}
                className={`gap-1 ${paymentFilter === 'pending_payment' ? 'bg-amber-500 hover:bg-amber-600 border-amber-500' : ''}`}
                onClick={() => setPaymentFilter('pending_payment')}
                data-testid="filter-orders-pending"
              >
                <AlertCircle className="w-3 h-3" />
                Pendentes de pagamento
                <span className="ml-1 text-xs font-normal opacity-70">
                  ({storeOrders.filter(o => !o.paymentStatus || o.paymentStatus === 'pending_payment').length})
                </span>
              </Button>
              <Button
                size="sm"
                variant={paymentFilter === 'paid' ? 'default' : 'outline'}
                className={`gap-1 ${paymentFilter === 'paid' ? 'bg-green-600 hover:bg-green-700 border-green-600' : ''}`}
                onClick={() => setPaymentFilter('paid')}
                data-testid="filter-orders-paid"
              >
                <CheckCircle className="w-3 h-3" />
                Pagos
                <span className="ml-1 text-xs font-normal opacity-70">
                  ({storeOrders.filter(o => o.paymentStatus === 'paid').length})
                </span>
              </Button>
            </div>

            {filteredOrders.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">
                  {storeOrders.length === 0 ? 'Nenhum pedido recebido ainda' : 'Nenhum pedido nessa categoria'}
                </p>
              </Card>
            ) : (
              filteredOrders.map(order => (
                <Card key={order.id} className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 pb-4 border-b border-border">
                    <div>
                      <p className="text-sm text-muted-foreground">Pedido Nº</p>
                      <p className="font-mono text-lg font-bold text-foreground">#{order.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cliente</p>
                      <p className="font-medium text-foreground">{order.customerName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-lg font-bold text-primary">R$ {order.total.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <div className="flex flex-wrap items-center gap-2">
                        {getStatusBadge(order.status)}
                        {order.isPickup ? (
                          <Badge className="bg-primary/10 text-primary flex items-center gap-1 text-xs">
                            <Store className="w-3 h-3" /> Retirada na loja
                          </Badge>
                        ) : (
                          <Badge className="bg-orange-100 text-orange-800 flex items-center gap-1 text-xs">
                            <Bike className="w-3 h-3" /> Pedido com entrega
                          </Badge>
                        )}
                        {(!order.paymentStatus || order.paymentStatus === 'pending_payment') ? (
                          <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 flex items-center gap-1 text-xs border-0">
                            <AlertCircle className="w-3 h-3" /> Pagamento pendente
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center gap-1 text-xs border-0">
                            <CheckCircle className="w-3 h-3" /> Pago
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mb-4">
                    <h4 className="font-semibold text-foreground mb-3">Itens:</h4>
                    <div className="space-y-2 bg-secondary rounded-lg p-3">
                      {order.items.map(item => {
                        const product = products.find(p => p.id === item.productId);
                        return (
                          <div key={item.productId} className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                              {product?.imageUrl ? (
                                <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded-lg object-cover border border-border flex-shrink-0" />
                              ) : (
                                <span className="w-10 h-10 flex items-center justify-center text-2xl bg-background rounded-lg border border-border flex-shrink-0">{product?.image}</span>
                              )}
                              <div>
                                <p className="font-medium text-foreground">{product?.name}</p>
                                <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                              </div>
                            </div>
                            <span className="font-medium text-foreground">R$ {(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* Status info banner for motoboy statuses */}
                  {getSellerStatusInfo(order.status)}

                  {/* Status Buttons - only seller statuses */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                    <Button
                      size="sm"
                      variant={order.status === 'pending' ? 'default' : 'outline'}
                      className="gap-1"
                      onClick={() => handleUpdateOrderStatus(order.id, 'pending')}
                    >
                      <Clock className="w-3 h-3" />
                      Pendente
                    </Button>
                    <Button
                      size="sm"
                      variant={order.status === 'preparing' ? 'default' : 'outline'}
                      className={`gap-1 ${order.status === 'preparing' ? 'bg-orange-500 hover:bg-orange-600 border-orange-500' : ''}`}
                      onClick={() => handleUpdateOrderStatus(order.id, 'preparing')}
                    >
                      <ChefHat className="w-3 h-3" />
                      Preparando
                    </Button>
                    {order.isPickup ? (
                      <Button
                        size="sm"
                        disabled={order.paymentStatus !== 'paid'}
                        title={order.paymentStatus !== 'paid' ? 'Registre o pagamento antes de liberar a retirada' : undefined}
                        variant={order.status === 'ready_for_pickup' ? 'default' : 'outline'}
                        className={`gap-1 ${order.status === 'ready_for_pickup' ? 'bg-teal-600 hover:bg-teal-700 border-teal-600' : ''}`}
                        onClick={() => handleUpdateOrderStatus(order.id, 'ready_for_pickup')}
                      >
                        <ThumbsUp className="w-3 h-3" /> Pronto para retirada
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        disabled={order.paymentStatus !== 'paid'}
                        title={order.paymentStatus !== 'paid' ? 'Registre o pagamento antes de chamar o motoboy' : undefined}
                        variant={order.status === 'ready' ? 'default' : 'outline'}
                        className={`gap-1 ${order.status === 'ready' ? 'bg-green-600 hover:bg-green-700 border-green-600' : ''}`}
                        onClick={() => handleUpdateOrderStatus(order.id, 'ready')}
                      >
                        <Bike className="w-3 h-3" /> Chamar motoboy
                      </Button>
                    )}
                    {(!order.paymentStatus || order.paymentStatus === 'pending_payment') ? (
                      <Button
                        data-testid={`button-mark-paid-${order.id}`}
                        size="sm"
                        className="gap-1 bg-amber-500 hover:bg-amber-600 text-white border-0 ml-auto"
                        onClick={() => {
                          updatePaymentStatus(order.id, 'paid');
                          toast.success('Pagamento confirmado!');
                        }}
                      >
                        <CreditCard className="w-3 h-3" />
                        Registrar Pagamento
                      </Button>
                    ) : (
                      <span className="ml-auto flex items-center gap-1 text-xs text-green-700 dark:text-green-400 font-medium">
                        <CheckCircle className="w-3 h-3" /> Pagamento confirmado
                      </span>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Aguardando Retirada Tab */}
        {activeTab === 'pickup_waiting' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Store className="w-6 h-6 text-teal-600" />
              <h3 className="text-xl font-semibold text-foreground">Aguardando retirada</h3>
              <Badge className="bg-teal-100 text-teal-800">{pickupWaitingOrders.length} pedido(s)</Badge>
            </div>
            {pickupWaitingOrders.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="text-6xl mb-4">🏪</div>
                <p className="text-muted-foreground text-lg">Nenhum pedido aguardando retirada</p>
              </Card>
            ) : (
              pickupWaitingOrders.map(order => (
                <Card key={order.id} className="p-6 border-l-4 border-teal-500">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 pb-4 border-b border-border">
                    <div>
                      <p className="text-sm text-muted-foreground">Pedido Nº</p>
                      <p className="font-mono text-lg font-bold text-foreground">#{order.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cliente</p>
                      <p className="font-medium text-foreground">{order.customerName}</p>
                      {order.customerPhone && (
                        <p className="text-xs text-muted-foreground">{order.customerPhone}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-lg font-bold text-primary">R$ {order.total.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Data / Hora</p>
                      <p className="font-medium text-foreground">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
                      <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  <div className="mb-4">
                    <h4 className="font-semibold text-foreground mb-3">Itens:</h4>
                    <div className="space-y-2 bg-secondary rounded-lg p-3">
                      {order.items.map(item => {
                        const product = products.find(p => p.id === item.productId);
                        return (
                          <div key={item.productId} className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                              {product?.imageUrl ? (
                                <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded-lg object-cover border border-border flex-shrink-0" />
                              ) : (
                                <span className="w-10 h-10 flex items-center justify-center text-2xl bg-background rounded-lg border border-border flex-shrink-0">{product?.image}</span>
                              )}
                              <div>
                                <p className="font-medium text-foreground">{product?.name}</p>
                                <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                              </div>
                            </div>
                            <span className="font-medium text-foreground">R$ {(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-lg px-4 py-2">
                      <Store className="w-4 h-4 text-teal-600 flex-shrink-0" />
                      <p className="text-sm text-teal-800 font-medium">Cliente virá retirar na loja</p>
                    </div>
                    <Button
                      className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => {
                        setDeliveryConfirmOrder(order);
                        setDeliveryCodeInput('');
                        setDeliveryCodeError('');
                      }}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Marcar como entregue
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Histórico de Pedidos Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-6 h-6 text-blue-600" />
              <h3 className="text-xl font-semibold text-foreground">Histórico de pedidos</h3>
              <Badge className="bg-blue-100 text-blue-800">{deliveredHistoryOrders.length} entregue(s)</Badge>
            </div>
            {deliveredHistoryOrders.length === 0 ? (
              <Card className="p-12 text-center">
                <div className="text-6xl mb-4">📋</div>
                <p className="text-muted-foreground text-lg">Nenhum pedido entregue ainda</p>
              </Card>
            ) : (
              deliveredHistoryOrders.map(order => (
                <Card key={order.id} className="p-6 border-l-4 border-blue-500">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 pb-4 border-b border-border">
                    <div>
                      <p className="text-sm text-muted-foreground">Pedido Nº</p>
                      <p className="font-mono text-lg font-bold text-foreground">#{order.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Cliente</p>
                      <p className="font-medium text-foreground">{order.customerName}</p>
                      {order.customerEmail && (
                        <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-lg font-bold text-primary">R$ {order.total.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Data / Hora</p>
                      <p className="font-medium text-foreground">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
                      <p className="text-xs text-muted-foreground">{new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                  {/* Date Summary */}
                  <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900 p-4">
                    <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                      <CalendarClock className="w-4 h-4" /> Linha do Tempo do Pedido
                    </h4>
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

                  <div className="mb-4">
                    <h4 className="font-semibold text-foreground mb-3">Itens do pedido:</h4>
                    <div className="space-y-2 bg-secondary rounded-lg p-3">
                      {order.items.map(item => {
                        const product = products.find(p => p.id === item.productId);
                        return (
                          <div key={item.productId} className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2">
                              {product?.imageUrl ? (
                                <img src={product.imageUrl} alt={product.name} className="w-10 h-10 rounded-lg object-cover border border-border flex-shrink-0" />
                              ) : (
                                <span className="w-10 h-10 flex items-center justify-center text-2xl bg-background rounded-lg border border-border flex-shrink-0">{product?.image}</span>
                              )}
                              <div>
                                <p className="font-medium text-foreground">{product?.name}</p>
                                <p className="text-xs text-muted-foreground">Qtd: {item.quantity}</p>
                              </div>
                            </div>
                            <span className="font-medium text-foreground">R$ {(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        );
                      })}
                    </div>
                    {!order.isPickup && order.distanceKm != null && (
                      (() => {
                        const fee = calcDeliveryFee(order.distanceKm);
                        const subtotal = order.total - fee;
                        return (
                          <div className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
                            <div className="flex justify-between text-muted-foreground">
                              <span>Subtotal dos produtos</span>
                              <span>R$ {subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                              <span className="flex items-center gap-1"><Bike className="w-3 h-3" /> Taxa de entrega</span>
                              <span>R$ {fee.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1">
                              <span>Total</span>
                              <span>R$ {order.total.toFixed(2)}</span>
                            </div>
                          </div>
                        );
                      })()
                    )}
                  </div>
                  {/* Status History Timeline */}
                  {order.statusHistory && order.statusHistory.length > 0 && (
                    <div className="mb-4">
                      <h4 className="font-semibold text-foreground mb-3 text-sm flex items-center gap-1">
                        <CalendarClock className="w-4 h-4" /> Histórico de Status
                      </h4>
                      <div className="space-y-2">
                        {order.statusHistory.map((entry, idx) => {
                          const labels: Record<string, string> = {
                            pending: 'Pedido Recebido', preparing: 'Preparando', ready: 'Pronto',
                            ready_for_pickup: 'Pronto para retirada', waiting_motoboy: 'Aguardando motoboy',
                            motoboy_accepted: 'Motoboy a caminho', motoboy_at_store: 'Motoboy na loja',
                            on_the_way: 'Motoboy saiu para entrega', delivered: 'Entregue', cancelled: 'Cancelado',
                          };
                          return (
                            <div key={idx} className="flex items-start gap-3 text-sm">
                              <div className="flex flex-col items-center">
                                <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${idx === order.statusHistory!.length - 1 ? 'bg-primary' : 'bg-border'}`} />
                                {idx < order.statusHistory!.length - 1 && (
                                  <div className="w-0.5 h-5 bg-border mt-0.5" />
                                )}
                              </div>
                              <div className="flex-1 pb-1">
                                <span className="font-medium text-foreground">{labels[entry.status] ?? entry.status}</span>
                                <span className="text-muted-foreground ml-2 text-xs">
                                  {new Date(entry.timestamp).toLocaleDateString('pt-BR')} às {new Date(entry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-4 pt-4 border-t border-border text-sm">
                    {order.isPickup ? (
                      <div className="flex items-center gap-2 text-teal-700">
                        <Store className="w-4 h-4" />
                        <span>Retirada na loja</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-orange-700">
                          <Bike className="w-4 h-4 flex-shrink-0" />
                          <span className="font-medium">Pedido com entrega</span>
                        </div>
                        {order.deliveryAddress && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span>{order.deliveryAddress.logradouro}, {order.deliveryAddress.numero} — {order.deliveryAddress.bairro}, {order.deliveryAddress.cidade}/{order.deliveryAddress.uf}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className="ml-auto">
                      <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Entregue
                      </Badge>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {/* Products Tab */}
        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold text-foreground">Meus Produtos ({storeProducts.length})</h3>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2" onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="w-4 h-4" /> Novo Produto
              </Button>
            </div>
            {storeProducts.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">Nenhum produto cadastrado</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {storeProducts.map(product => (
                  <Card key={product.id} className={`p-6 hover:shadow-lg transition-all ${product.frozen ? 'opacity-60' : ''}`}>
                    <div className="bg-gradient-to-br from-accent/20 to-primary/20 h-40 flex items-center justify-center text-5xl mb-4 rounded-lg overflow-hidden relative">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        product.image
                      )}
                      {product.frozen && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Lock className="w-8 h-8 text-white" />
                        </div>
                      )}
                    </div>
                    <h4 className="font-semibold text-foreground line-clamp-2 mb-2">{product.name}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{product.category}</p>
                    <div className="flex justify-between items-start mb-4 pb-4 border-b border-border">
                      <div>
                        <p className="text-2xl font-bold text-primary">R$ {product.price.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">Estoque: {product.stock}</p>
                      </div>
                      {product.frozen && (
                        <Badge className="bg-yellow-100 text-yellow-800">Congelado</Badge>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" className="flex-1 bg-primary hover:bg-primary/90 text-white gap-2" onClick={() => handleEditProduct(product)}>
                        <Edit className="w-4 h-4" /> Editar
                      </Button>
                      <Button size="sm" variant={product.frozen ? 'default' : 'outline'} className="flex-1 gap-2" onClick={() => handleToggleFrozen(product.id, product.frozen || false)}>
                        {product.frozen ? <><Unlock className="w-4 h-4" /> Descongelar</> : <><Lock className="w-4 h-4" /> Congelar</>}
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1 gap-2 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteProduct(product.id)}>
                        <Trash2 className="w-4 h-4" /> Excluir
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <SellerProfilePage onBack={() => setActiveTab('dashboard')} />
        )}

        {/* Financeiro Tab */}
        {activeTab === 'financeiro' && (
          <div className="flex flex-col items-center justify-center py-24 text-center text-muted-foreground">
            <Wallet className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">Financeiro</p>
            <p className="text-sm mt-1">Esta seção está em construção.</p>
          </div>
        )}

        {/* Suporte Tab */}
        {activeTab === 'suporte' && (
          <div className="max-w-lg mx-auto">
            <div className="flex items-center gap-3 mb-6">
              <Headphones className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-semibold text-foreground">Suporte</h3>
            </div>

            {/* ── Active chat (admin started) ── */}
            {activeTicket?.status === 'in_chat' && (
              <div className="flex flex-col h-[70vh] border border-border rounded-2xl overflow-hidden shadow-sm">
                {/* Chat header */}
                <div className="flex items-center gap-3 px-4 py-3 bg-primary text-white">
                  <MessageCircle className="w-5 h-5" />
                  <div>
                    <p className="font-semibold text-sm">Atendimento em andamento</p>
                    <p className="text-xs text-primary-foreground/80">{activeTicket.category}</p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-secondary/20">
                  {activeTicket.chat.map(msg => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === 'seller' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                          msg.sender === 'seller'
                            ? 'bg-primary text-white rounded-br-sm'
                            : 'bg-card border border-border text-foreground rounded-bl-sm'
                        }`}
                      >
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

                {/* Input */}
                <div className="flex items-center gap-2 p-3 border-t border-border bg-card">
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
                    className="flex-1 border border-border rounded-xl px-4 py-2 text-sm bg-secondary focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <Button
                    size="sm"
                    className="rounded-xl"
                    disabled={!chatInput.trim()}
                    onClick={() => {
                      if (chatInput.trim()) {
                        sendMessage(activeTicket.id, 'seller', chatInput.trim());
                        setChatInput('');
                      }
                    }}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ── Pending ticket (sent, waiting admin) ── */}
            {activeTicket?.status === 'pending' && (
              <Card className="p-8 text-center border-2 border-dashed border-primary/30">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="text-lg font-semibold text-foreground mb-2">Sua solicitação foi enviada!</h4>
                <p className="text-muted-foreground text-sm mb-4">
                  Em breve um membro da nossa equipe irá te atender.
                </p>
                <div className="bg-secondary rounded-xl p-3 text-left text-sm mb-4">
                  <p className="text-muted-foreground text-xs mb-1">Categoria</p>
                  <p className="font-medium text-foreground">{activeTicket.category}</p>
                  <p className="text-muted-foreground text-xs mt-2 mb-1">Mensagem</p>
                  <p className="text-foreground">{activeTicket.message}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  O chat abrirá automaticamente quando um atendente iniciar o atendimento.
                </p>
              </Card>
            )}

            {/* ── No active ticket — 3-step form ── */}
            {!activeTicket && (
              <>
                {/* Step 1: Category selection */}
                {supportStep === 'select' && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground mb-4">Como podemos te ajudar? Selecione a categoria:</p>
                    {SUPPORT_CATEGORIES.map(cat => (
                      <button
                        key={cat.label}
                        onClick={() => {
                          setSupportCategory(cat.label);
                          setSupportStep('write');
                        }}
                        className="w-full flex items-center gap-4 bg-card border border-border rounded-2xl px-5 py-4 hover:bg-secondary hover:border-primary/40 transition-all text-left"
                      >
                        <span className="text-2xl w-8 text-center flex-shrink-0">{cat.emoji}</span>
                        <span className="font-medium text-foreground">{cat.label}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Step 2: Write message */}
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
                      <label className="text-sm font-medium text-foreground mb-2 block">Descreva seu problema:</label>
                      <textarea
                        value={supportMessage}
                        onChange={e => setSupportMessage(e.target.value)}
                        placeholder={`Ex: "Pedido #123 não apareceu no painel"`}
                        rows={4}
                        className="w-full border border-border rounded-xl px-4 py-3 text-sm bg-secondary focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                      />
                    </div>
                    <Button
                      className="w-full gap-2"
                      disabled={!supportMessage.trim()}
                      onClick={() => {
                        if (supportMessage.trim() && supportCategory) {
                          submitTicket(STORE_ID, storeName, supportCategory, supportMessage.trim());
                          setSupportStep('sent');
                          setSupportMessage('');
                          setSupportCategory(null);
                        }
                      }}
                    >
                      <Send className="w-4 h-4" /> Enviar Solicitação
                    </Button>
                  </div>
                )}

                {/* Step 3: Confirmation */}
                {supportStep === 'sent' && (
                  <Card className="p-8 text-center border-2 border-dashed border-green-300">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-foreground mb-2">Sua solicitação foi enviada!</h4>
                    <p className="text-muted-foreground text-sm mb-6">
                      Em breve um membro da nossa equipe irá te atender.<br />
                      Você pode fechar essa tela. O chat abrirá quando o ADM iniciar o atendimento.
                    </p>
                    <Button variant="outline" onClick={() => setSupportStep('select')}>
                      Fechar
                    </Button>
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {/* Mais Tab */}
        {activeTab === 'mais' && (
          <div className="max-w-md">
            <h2 className="text-2xl font-display font-bold text-foreground mb-6">Menu</h2>
            <div className="space-y-3">
              {[
                { label: 'Dashboard', icon: <TrendingUp className="w-5 h-5 text-primary" />, tab: 'dashboard' as const },
                { label: 'Pedidos', icon: <ShoppingBag className="w-5 h-5 text-primary" />, tab: 'orders' as const },
                { label: 'Aguardando Retirada', icon: <Store className="w-5 h-5 text-primary" />, tab: 'pickup_waiting' as const },
                { label: 'Histórico de Pedidos', icon: <CheckCircle className="w-5 h-5 text-primary" />, tab: 'history' as const },
                { label: 'Produtos', icon: <Package className="w-5 h-5 text-primary" />, tab: 'products' as const },
                { label: 'Minha Loja', icon: <UserCog className="w-5 h-5 text-primary" />, tab: 'profile' as const },
                { label: 'Financeiro', icon: <Wallet className="w-5 h-5 text-primary" />, tab: 'financeiro' as const },
                { label: 'Suporte', icon: <Headphones className="w-5 h-5 text-primary" />, tab: 'suporte' as const },
              ].map(item => (
                <button
                  key={item.tab}
                  onClick={() => setActiveTab(item.tab)}
                  className="w-full flex items-center justify-between bg-card border border-border rounded-2xl px-5 py-4 hover:bg-secondary transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {item.icon}
                    </div>
                    <span className="font-semibold text-foreground">{item.label}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              ))}

              {/* Notificações */}
              <button
                onClick={() => { markAllRead('seller'); setActiveTab('notificacoes'); }}
                className="w-full flex items-center justify-between bg-card border border-border rounded-2xl px-5 py-4 hover:bg-secondary transition-all"
                data-testid="btn-notifications-seller"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center relative">
                    <Bell className="w-5 h-5 text-primary" />
                    {sellerUnread > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {sellerUnread > 9 ? '9+' : sellerUnread}
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-foreground">Notificações</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        )}
        {/* Notificações Tab */}
        {activeTab === 'notificacoes' && (
          <div className="max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-display font-bold text-foreground">Notificações</h2>
              {sellerNotifications.length > 0 && (
                <button
                  onClick={() => markAllRead('seller')}
                  className="text-sm text-primary font-medium hover:underline"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>
            {sellerNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
                <Bell className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg font-medium">Nenhuma notificação</p>
                <p className="text-sm mt-1">Novos pedidos e atualizações aparecerão aqui.</p>
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
                      className={`rounded-2xl border transition-all ${n.read ? 'bg-card border-border opacity-70' : 'bg-primary/5 border-primary/20'}`}
                    >
                      {/* Notification header */}
                      <div className="flex items-start gap-4 p-4">
                        <div className="text-2xl mt-0.5 flex-shrink-0">{n.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm ${n.read ? 'text-foreground' : 'text-primary'}`}>{n.title}</p>
                          <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{n.body}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(n.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {!n.read && (
                          <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        )}
                      </div>

                      {/* Q&A Reply UI */}
                      {isQuestion && questionId && (
                        <div className="px-4 pb-4 space-y-2">
                          {alreadyReplied ? (
                            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                              <p className="text-sm text-green-700 font-medium">✅ Pergunta respondida e chat encerrado</p>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-xs font-semibold text-muted-foreground">Responder ao cliente:</p>
                              <textarea
                                className="w-full text-sm border border-border rounded-xl p-3 bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                                rows={3}
                                placeholder="Digite sua resposta..."
                                value={replyInputs[questionId] ?? ''}
                                onChange={e => setReplyInputs(prev => ({ ...prev, [questionId]: e.target.value }))}
                                data-testid={`input-reply-${questionId}`}
                              />
                              <div className="flex gap-2">
                                <button
                                  className="flex-1 bg-primary text-white text-sm font-semibold rounded-xl py-2 px-4 hover:bg-primary/90 transition-colors disabled:opacity-50"
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
                                  <Send className="w-3.5 h-3.5 inline mr-1" />
                                  Responder e encerrar chat
                                </button>
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
          </div>
        )}
      </div>

      {/* Fixed Bottom Nav */}
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
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${['mais', 'financeiro', 'suporte', 'pickup_waiting', 'history', 'profile', 'notificacoes'].includes(activeTab) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <MoreHorizontal className="w-6 h-6" />
            <span className="text-xs font-medium">Mais</span>
          </button>
        </div>
      </nav>

      {/* Add Product Dialog */}
      <ProductAddDialog
        storeId={STORE_ID}
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
                  className="w-full text-center text-4xl font-mono tracking-widest border-2 border-border rounded-xl py-4 focus:outline-none focus:border-blue-500 bg-secondary"
                />
                {deliveryCodeError && (
                  <p className="text-destructive text-sm mt-2 text-center font-medium">{deliveryCodeError}</p>
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setDeliveryConfirmOrder(null)}>
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white gap-2"
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
                  <CheckCircle className="w-4 h-4" />
                  Confirmar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Order Popup */}
      {newOrderPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-in fade-in zoom-in duration-300">
            {/* Popup Header */}
            <div className="bg-primary text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <Bell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Novo Pedido!</h3>
                  <p className="text-white/80 text-sm">Pedido #{newOrderPopup.id}</p>
                </div>
              </div>
              <button
                onClick={() => setNewOrderPopup(null)}
                className="text-white/70 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Popup Body */}
            <div className="p-5 space-y-4">
              {/* Customer Info */}
              <div className="bg-secondary rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="font-semibold text-foreground">{newOrderPopup.customerName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-bold text-primary text-base">R$ {newOrderPopup.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Horário</span>
                  <span className="text-foreground">{new Date(newOrderPopup.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <p className="text-sm font-semibold text-foreground mb-2">Itens do pedido:</p>
                <div className="space-y-2">
                  {newOrderPopup.items.map(item => {
                    const product = products.find(p => p.id === item.productId);
                    return (
                      <div key={item.productId} className="flex justify-between items-center text-sm bg-secondary/50 rounded-lg px-3 py-2">
                        <span className="text-foreground">{product?.name} <span className="text-muted-foreground">x{item.quantity}</span></span>
                        <span className="font-medium text-foreground">R$ {(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Popup Footer */}
            <div className="px-5 pb-5 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setNewOrderPopup(null)}
              >
                Fechar
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90 text-white gap-2"
                onClick={() => {
                  setNewOrderPopup(null);
                  setActiveTab('orders');
                }}
              >
                <ShoppingBag className="w-4 h-4" />
                Ver Pedidos
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

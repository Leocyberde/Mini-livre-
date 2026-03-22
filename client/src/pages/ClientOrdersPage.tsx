/**
 * Client Orders Page - Visualização de pedidos do cliente
 * Features: Pedidos em andamento, histórico de pedidos entregues
 */
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { useProfile } from '@/contexts/ProfileContext';
import { getStoreById } from '@/lib/mockData';
import { useProducts } from '@/contexts/ProductContext';
import { useMotoboyClientChat } from '@/contexts/MotoboyClientChatContext';
import { calcDeliveryFee } from '@/lib/deliveryCalc';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Package, CheckCircle, Clock, ChefHat, ThumbsUp, KeyRound, Bike, Navigation, Store, AlertCircle, CreditCard, MapPin, History, CalendarClock, MessageCircle, X, Send } from 'lucide-react';
import { Link } from 'wouter';
import { useState, useEffect, useRef } from 'react';

function ClientMotoboyChat({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { getMessages, sendMessage, markRead } = useMotoboyClientChat();
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const messages = getMessages(orderId);

  useEffect(() => {
    markRead(orderId, 'client');
  }, [messages.length, orderId, markRead]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = () => {
    if (!input.trim()) return;
    sendMessage(orderId, 'client', input.trim());
    setInput('');
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm bg-background rounded-t-3xl shadow-2xl flex flex-col border border-border" style={{ maxHeight: '80vh' }}>
        <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>
        <div className="flex items-center justify-between px-5 pb-3 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
              <Bike className="w-4 h-4 text-green-700" />
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">Motoboy</p>
              <p className="text-xs text-muted-foreground">Em rota de entrega</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-secondary text-muted-foreground hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground text-sm text-center">
              <MessageCircle className="w-8 h-8 mb-2 opacity-30" />
              <p>Nenhuma mensagem ainda.</p>
              <p className="text-xs mt-1">Fale com o motoboy aqui.</p>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === 'client' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.sender === 'client'
                  ? 'bg-primary text-primary-foreground rounded-br-sm'
                  : 'bg-secondary text-foreground rounded-bl-sm'
              }`}>
                {msg.sender === 'motoboy' && (
                  <p className="text-[10px] font-semibold text-green-600 mb-1">Motoboy</p>
                )}
                <p className="leading-snug">{msg.text}</p>
                <p className="text-[10px] mt-1 opacity-60">
                  {new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="flex items-center gap-2 px-4 pt-3 pb-8 border-t border-border flex-shrink-0">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && input.trim()) handleSend(); }}
            placeholder="Mensagem para o motoboy..."
            className="flex-1 bg-secondary border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 text-primary-foreground transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientOrdersPage() {
  const { clientOrders } = useMarketplace();
  const { sellerProfile } = useProfile();
  const { products } = useProducts();
  const { getUnreadCount } = useMotoboyClientChat();
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);

  const getStoreLogo = (storeId: string) => {
    if (storeId === sellerProfile.storeId) return sellerProfile.storeLogo;
    return getStoreById(storeId)?.logo || '';
  };

  const isPhotoUrl = (logo: string) => logo && (logo.startsWith('data:') || logo.startsWith('http'));

  const getTimestampForStatus = (order: { statusHistory?: { status: string; timestamp: string }[] }, status: string): string | null => {
    if (!order.statusHistory) return null;
    return order.statusHistory.find(e => e.status === status)?.timestamp ?? null;
  };

  const fmtDateTime = (ts: string | null | undefined): string => {
    if (!ts) return '—';
    const d = new Date(ts);
    return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const pendingOrders = clientOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
  const historyOrders = clientOrders.filter(o => o.status === 'delivered');

  const displayOrders = activeTab === 'pending' ? pendingOrders : historyOrders;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'preparing': return <ChefHat className="w-5 h-5 text-orange-500" />;
      case 'ready': return <ThumbsUp className="w-5 h-5 text-green-600" />;
      case 'ready_for_pickup': return <Store className="w-5 h-5 text-teal-600" />;
      case 'waiting_motoboy': return <Bike className="w-5 h-5 text-purple-600" />;
      case 'motoboy_accepted': return <Navigation className="w-5 h-5 text-indigo-600" />;
      case 'motoboy_at_store': return <Navigation className="w-5 h-5 text-teal-600" />;
      case 'on_the_way': return <Navigation className="w-5 h-5 text-green-600" />;
      case 'delivered': return <CheckCircle className="w-5 h-5 text-blue-600" />;
      case 'cancelled': return <Package className="w-5 h-5 text-red-600" />;
      default: return <Package className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'preparing': return 'Preparando';
      case 'ready': return 'Pronto';
      case 'ready_for_pickup': return 'Pronto para retirada';
      case 'waiting_motoboy': return 'Aguardando motoboy';
      case 'motoboy_accepted': return 'Motoboy a caminho';
      case 'motoboy_at_store': return 'Motoboy na loja';
      case 'on_the_way': return 'Motoboy saiu para entrega';
      case 'delivered': return 'Entregue';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { bg: string; text: string }> = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      preparing: { bg: 'bg-orange-100', text: 'text-orange-800' },
      ready: { bg: 'bg-green-100', text: 'text-green-800' },
      ready_for_pickup: { bg: 'bg-teal-100', text: 'text-teal-800' },
      waiting_motoboy: { bg: 'bg-purple-100', text: 'text-purple-800' },
      motoboy_accepted: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
      motoboy_at_store: { bg: 'bg-teal-100', text: 'text-teal-800' },
      on_the_way: { bg: 'bg-green-100', text: 'text-green-800' },
      delivered: { bg: 'bg-blue-100', text: 'text-blue-800' },
      cancelled: { bg: 'bg-red-100', text: 'text-red-800' },
    };
    const variant = variants[status] || variants.pending;
    return (
      <Badge className={`${variant.bg} ${variant.text} flex items-center gap-1 w-fit`}>
        {getStatusIcon(status)}
        {getStatusLabel(status)}
      </Badge>
    );
  };

  // Order progress steps: pending → preparing → waiting_motoboy → motoboy_accepted → motoboy_at_store → on_the_way → delivered
  const DELIVERY_STEPS = [
    { key: 'pending', label: 'Pedido Recebido', icon: Clock },
    { key: 'preparing', label: 'Preparando', icon: ChefHat },
    { key: 'waiting_motoboy', label: 'Aguardando motoboy', icon: Bike },
    { key: 'motoboy_accepted', label: 'Motoboy a caminho', icon: Navigation },
    { key: 'motoboy_at_store', label: 'Motoboy na loja', icon: Navigation },
    { key: 'on_the_way', label: 'Saiu para entrega', icon: Navigation },
  ];

  // Pickup order progress steps: pending → preparing → ready_for_pickup
  const PICKUP_STEPS = [
    { key: 'pending', label: 'Pedido Recebido', icon: Clock },
    { key: 'preparing', label: 'Preparando', icon: ChefHat },
    { key: 'ready_for_pickup', label: 'Pronto para retirada', icon: Store },
  ];

  const renderProgressSteps = (order: { status: string; isPickup?: boolean }) => {
    const { status, isPickup } = order;
    if (status === 'delivered' || status === 'cancelled') return null;
    const STEPS = isPickup ? PICKUP_STEPS : DELIVERY_STEPS;
    const currentIndex = STEPS.findIndex(s => s.key === status);

    return (
      <div className="mb-4">
        <p className="text-sm font-semibold text-foreground mb-3">Acompanhe seu pedido:</p>
        <div className="flex items-center gap-0">
          {STEPS.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const StepIcon = step.icon;
            return (
              <div key={step.key} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCompleted
                        ? 'bg-primary border-primary text-white'
                        : isCurrent
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-secondary border-border text-muted-foreground'
                    }`}
                  >
                    <StepIcon className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-[10px] mt-1 text-center leading-tight max-w-[56px] ${
                      isCurrent ? 'font-bold text-primary' : isCompleted ? 'text-muted-foreground' : 'text-muted-foreground/60'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-1 mb-4 transition-all ${
                      index < currentIndex ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Descriptive messages */}
        {status === 'ready_for_pickup' && (
          <div className="mt-3 flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-lg px-4 py-3">
            <Store className="w-4 h-4 text-teal-600 animate-pulse flex-shrink-0" />
            <p className="text-sm text-teal-800 font-medium">Seu pedido está pronto! Dirija-se à loja para retirar.</p>
          </div>
        )}
        {status === 'waiting_motoboy' && (
          <div className="mt-3 flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-lg px-4 py-3">
            <Bike className="w-4 h-4 text-purple-600 animate-pulse flex-shrink-0" />
            <p className="text-sm text-purple-800 font-medium">Aguardando motoboy aceitar a corrida...</p>
          </div>
        )}
        {status === 'motoboy_accepted' && (
          <div className="mt-3 flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3">
            <Navigation className="w-4 h-4 text-indigo-600 animate-pulse flex-shrink-0" />
            <p className="text-sm text-indigo-800 font-medium">Corrida aceita — motoboy está indo até a coleta</p>
          </div>
        )}
        {status === 'on_the_way' && (
          <div className="mt-3 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
            <Navigation className="w-4 h-4 text-green-600 animate-pulse flex-shrink-0" />
            <p className="text-sm text-green-800 font-medium">Motoboy saiu para entrega — a caminho do seu endereço!</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/perfil">
            <Button variant="ghost" className="gap-2 mb-6">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </Link>

          <h1 className="text-3xl font-display font-bold text-foreground mb-2">Meus Pedidos</h1>
          <p className="text-muted-foreground">Acompanhe o status de seus pedidos</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-secondary rounded-lg p-1 w-fit">
          <Button
            variant={activeTab === 'pending' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('pending')}
            className="gap-2"
          >
            <Clock className="w-4 h-4" />
            Em Andamento ({pendingOrders.length})
          </Button>
          <Button
            variant={activeTab === 'history' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('history')}
            className="gap-2"
          >
            <History className="w-4 h-4" />
            Histórico de pedidos ({historyOrders.length})
          </Button>
        </div>

        {/* Orders List */}
        <div className="space-y-6">
          {displayOrders.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="text-6xl mb-4">
                {activeTab === 'pending' ? '📦' : '✓'}
              </div>
              <p className="text-muted-foreground text-lg">
                {activeTab === 'pending'
                  ? 'Você não tem pedidos em andamento'
                  : 'Você ainda não tem pedidos entregues'}
              </p>
            </Card>
          ) : (
            displayOrders.map(order => {
              const store = getStoreById(order.storeId);
              return (
                <Card key={order.id} className="p-6 hover:shadow-lg transition-all">
                  {/* Order Header */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 pb-4 border-b border-border">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Pedido Nº</p>
                      <p className="font-mono text-lg font-bold text-foreground">#{order.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Loja</p>
                      <p className="font-medium text-foreground flex items-center gap-2">
                        {(() => {
                          const logo = getStoreLogo(order.storeId);
                          const storeName = getStoreById(order.storeId)?.name || '';
                          return isPhotoUrl(logo) ? (
                            <img src={logo} alt={storeName} className="w-7 h-7 rounded-full object-cover border border-border" />
                          ) : (
                            <span>{logo}</span>
                          );
                        })()}
                        {getStoreById(order.storeId)?.name}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Total</p>
                      <p className="text-lg font-bold text-primary">R$ {order.total.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Status</p>
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
                            <AlertCircle className="w-3 h-3" /> Aguardando pagamento
                          </Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center gap-1 text-xs border-0">
                            <CreditCard className="w-3 h-3" /> Pago
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Date Summary — shown only in history tab */}
                  {activeTab === 'history' && order.status === 'delivered' && (
                    <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900 p-4">
                      <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                        <CalendarClock className="w-4 h-4" /> Linha do Tempo
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Order date */}
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
                            {/* Collection date (motoboy left for delivery) */}
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
                            {/* Delivery date */}
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
                          /* Pickup date */
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0">
                              <Store className="w-4 h-4 text-teal-600" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Retirado na loja</p>
                              <p className="text-sm font-semibold text-foreground">
                                {fmtDateTime(order.deliveredAt ?? getTimestampForStatus(order, 'delivered'))}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Progress Steps (only for active statuses) */}
                  {renderProgressSteps(order)}

                  {/* Chat with motoboy — only when on_the_way */}
                  {order.status === 'on_the_way' && (
                    <button
                      data-testid={`btn-chat-motoboy-${order.id}`}
                      onClick={() => setChatOrderId(order.id)}
                      className="relative w-full flex items-center justify-between gap-3 mb-4 bg-green-50 border border-green-200 hover:bg-green-100 rounded-xl px-4 py-3 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-green-200 flex items-center justify-center flex-shrink-0">
                          <Bike className="w-4 h-4 text-green-700" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-green-800">Falar com o motoboy</p>
                          <p className="text-xs text-green-700">Em rota até você</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getUnreadCount(order.id, 'client') > 0 && (
                          <span className="w-5 h-5 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold">
                            {getUnreadCount(order.id, 'client')}
                          </span>
                        )}
                        <MessageCircle className="w-5 h-5 text-green-600" />
                      </div>
                    </button>
                  )}

                  {/* Order Items */}
                  <div className="mb-4">
                    <h4 className="font-semibold text-foreground mb-3 text-sm">Itens do pedido:</h4>
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
                                <p className="text-xs text-muted-foreground">Quantidade: {item.quantity}</p>
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
                        {order.statusHistory.map((entry, idx) => (
                          <div key={idx} className="flex items-start gap-3 text-sm">
                            <div className="flex flex-col items-center">
                              <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${idx === order.statusHistory!.length - 1 ? 'bg-primary' : 'bg-border'}`} />
                              {idx < order.statusHistory!.length - 1 && (
                                <div className="w-0.5 h-5 bg-border mt-0.5" />
                              )}
                            </div>
                            <div className="flex-1 pb-1">
                              <span className="font-medium text-foreground">{getStatusLabel(entry.status)}</span>
                              <span className="text-muted-foreground ml-2 text-xs">
                                {new Date(entry.timestamp).toLocaleDateString('pt-BR')} às {new Date(entry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Delivery Code - only visible to client */}
                  {order.deliveryCode && (
                    <div className="mb-4 bg-primary/5 border border-primary/30 rounded-xl p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <KeyRound className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-0.5">Código de Entrega</p>
                        <p className="text-3xl font-mono font-bold tracking-widest text-primary">{order.deliveryCode}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {order.isPickup
                            ? 'Informe a loja esse código para fazer a retirada do seu pedido'
                            : 'Informe ao motoboy na entrega'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Order Footer */}
                  <div className="flex flex-wrap justify-between items-center pt-4 border-t border-border gap-2">
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Pedido realizado em{' '}
                        <span className="text-foreground font-medium">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</span>
                        {' '}às{' '}
                        <span className="text-foreground font-medium">{new Date(order.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </p>
                      {order.deliveryAddress && !order.isPickup && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />
                          {order.deliveryAddress.logradouro}, {order.deliveryAddress.numero} — {order.deliveryAddress.bairro}
                        </p>
                      )}
                      {order.isPickup && (
                        <p className="text-xs text-teal-600 flex items-center gap-1 mt-1">
                          <Store className="w-3 h-3" />
                          Retirada na loja
                        </p>
                      )}
                    </div>
                    {order.status === 'waiting_motoboy' && (
                      <Badge className="bg-purple-100 text-purple-800 flex items-center gap-1">
                        <Bike className="w-3 h-3" />
                        Aguardando motoboy
                      </Badge>
                    )}
                    {order.status === 'motoboy_accepted' && (
                      <Badge className="bg-indigo-100 text-indigo-800 flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        Motoboy a caminho
                      </Badge>
                    )}
                    {order.status === 'on_the_way' && (
                      <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        Motoboy saiu para entrega
                      </Badge>
                    )}
                    {order.status === 'delivered' && (
                      <Badge className="bg-blue-100 text-blue-800 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Entregue
                      </Badge>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {chatOrderId && (
        <ClientMotoboyChat orderId={chatOrderId} onClose={() => setChatOrderId(null)} />
      )}
    </div>
  );
}

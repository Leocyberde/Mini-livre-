/**
 * Client Orders Page - Visualização de pedidos do cliente
 * Features: Pedidos em andamento, histórico de pedidos entregues
 */
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useStores } from '@/contexts/StoresContext';
import { useProducts } from '@/contexts/ProductContext';
import { useMotoboyClientChat } from '@/contexts/MotoboyClientChatContext';
import { calcDeliveryFee } from '@/lib/deliveryCalc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Package, CheckCircle, Clock, ChefHat, ThumbsUp,
  KeyRound, Bike, Navigation, Store, AlertCircle, CreditCard,
  MapPin, History, CalendarClock, MessageCircle, ShoppingBag,
} from 'lucide-react';
import { Link } from 'wouter';
import { useState } from 'react';
import { LiveMotoboyMap } from './LiveMotoboyMap';
import { ClientMotoboyChat } from './ClientMotoboyChat';

export default function ClientOrdersPage() {
  const { clientOrders } = useMarketplace();
  const { sellerProfile } = useProfile();
  const { getStoreById } = useStores();
  const { products } = useProducts();
  const { getUnreadCount } = useMotoboyClientChat();
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);

  const getStoreLogo = (storeId: string) => {
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

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { icon: React.ReactNode; label: string; bg: string; text: string; dot: string }> = {
      pending:           { icon: <Clock className="w-3.5 h-3.5" />,      label: 'Pendente',               bg: 'bg-yellow-100',  text: 'text-yellow-800',  dot: 'bg-yellow-400' },
      preparing:         { icon: <ChefHat className="w-3.5 h-3.5" />,    label: 'Preparando',             bg: 'bg-orange-100',  text: 'text-orange-800',  dot: 'bg-orange-400' },
      ready:             { icon: <ThumbsUp className="w-3.5 h-3.5" />,   label: 'Pronto',                 bg: 'bg-green-100',   text: 'text-green-800',   dot: 'bg-green-400' },
      ready_for_pickup:  { icon: <Store className="w-3.5 h-3.5" />,      label: 'Pronto p/ retirada',     bg: 'bg-teal-100',    text: 'text-teal-800',    dot: 'bg-teal-400' },
      waiting_motoboy:   { icon: <Bike className="w-3.5 h-3.5" />,       label: 'Aguardando motoboy',     bg: 'bg-purple-100',  text: 'text-purple-800',  dot: 'bg-purple-400' },
      motoboy_accepted:  { icon: <Navigation className="w-3.5 h-3.5" />, label: 'Motoboy a caminho',      bg: 'bg-indigo-100',  text: 'text-indigo-800',  dot: 'bg-indigo-400' },
      motoboy_at_store:              { icon: <Navigation className="w-3.5 h-3.5" />, label: 'Motoboy na loja',          bg: 'bg-teal-100',    text: 'text-teal-800',    dot: 'bg-teal-400' },
      motoboy_doing_other_delivery:  { icon: <Bike className="w-3.5 h-3.5" />,       label: 'Fazendo outra entrega',    bg: 'bg-blue-100',    text: 'text-blue-800',    dot: 'bg-blue-400' },
      on_the_way:                    { icon: <Navigation className="w-3.5 h-3.5" />, label: 'Saiu para entrega',        bg: 'bg-green-100',   text: 'text-green-800',   dot: 'bg-green-400' },
      motoboy_arrived:   { icon: <Navigation className="w-3.5 h-3.5" />, label: 'Motoboy chegou!',        bg: 'bg-orange-100',  text: 'text-orange-800',  dot: 'bg-orange-400' },
      delivered:         { icon: <CheckCircle className="w-3.5 h-3.5" />,label: 'Entregue',               bg: 'bg-blue-100',    text: 'text-blue-800',    dot: 'bg-blue-400' },
      cancelled:         { icon: <Package className="w-3.5 h-3.5" />,    label: 'Cancelado',              bg: 'bg-red-100',     text: 'text-red-800',     dot: 'bg-red-400' },
    };
    return configs[status] || configs.pending;
  };

  const DELIVERY_STEPS = [
    { key: 'pending',                       label: 'Recebido',    icon: Clock },
    { key: 'preparing',                     label: 'Preparando',  icon: ChefHat },
    { key: 'waiting_motoboy',               label: 'Aguardando',  icon: Bike },
    { key: 'motoboy_accepted',              label: 'A caminho',   icon: Navigation },
    { key: 'motoboy_at_store',              label: 'Na loja',     icon: Navigation },
    { key: 'motoboy_doing_other_delivery',  label: 'Outra entrega', icon: Bike },
    { key: 'on_the_way',                    label: 'Em rota',     icon: Navigation },
    { key: 'motoboy_arrived',               label: 'Chegou!',     icon: Navigation },
  ];

  const PICKUP_STEPS = [
    { key: 'pending',          label: 'Recebido',   icon: Clock },
    { key: 'preparing',        label: 'Preparando', icon: ChefHat },
    { key: 'ready_for_pickup', label: 'Pronto',     icon: Store },
  ];

  const renderProgressSteps = (order: { status: string; isPickup?: boolean }) => {
    const { status, isPickup } = order;
    if (status === 'delivered' || status === 'cancelled') return null;
    const STEPS = isPickup ? PICKUP_STEPS : DELIVERY_STEPS;
    const currentIndex = STEPS.findIndex(s => s.key === status);

    return (
      <div className="mb-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Acompanhe seu pedido</p>
        <div className="flex items-start gap-0">
          {STEPS.map((step, index) => {
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const StepIcon = step.icon;
            return (
              <div key={step.key} className="flex items-start flex-1">
                <div className="flex flex-col items-center flex-shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCompleted
                        ? 'bg-[#1E40AF] border-[#1E40AF] text-white'
                        : isCurrent
                        ? 'bg-blue-50 border-[#1E40AF] text-[#1E40AF]'
                        : 'bg-gray-100 border-gray-200 text-gray-400'
                    }`}
                  >
                    <StepIcon className="w-3.5 h-3.5" />
                  </div>
                  <span
                    className={`text-[9px] mt-1 text-center leading-tight max-w-[52px] ${
                      isCurrent ? 'font-bold text-[#1E40AF]' : isCompleted ? 'text-gray-400' : 'text-gray-300'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-1 mt-4 transition-all ${
                      index < currentIndex ? 'bg-[#1E40AF]' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>

        {status === 'ready_for_pickup' && (
          <div className="mt-4 flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3">
            <Store className="w-4 h-4 text-teal-600 animate-pulse flex-shrink-0" />
            <p className="text-sm text-teal-800 font-medium">Seu pedido está pronto! Dirija-se à loja para retirar.</p>
          </div>
        )}
        {status === 'waiting_motoboy' && (
          <div className="mt-4 flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-xl px-4 py-3">
            <Bike className="w-4 h-4 text-purple-600 animate-pulse flex-shrink-0" />
            <p className="text-sm text-purple-800 font-medium">Aguardando motoboy aceitar a corrida...</p>
          </div>
        )}
        {status === 'motoboy_accepted' && (
          <div className="mt-4 flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3">
            <Navigation className="w-4 h-4 text-indigo-600 animate-pulse flex-shrink-0" />
            <p className="text-sm text-indigo-800 font-medium">Corrida aceita — motoboy está indo até a coleta</p>
          </div>
        )}
        {status === 'motoboy_doing_other_delivery' && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 space-y-1">
            <div className="flex items-center gap-2">
              <Bike className="w-4 h-4 text-blue-600 animate-pulse flex-shrink-0" />
              <p className="text-sm text-blue-900 font-semibold">Motoboy saiu da loja com seus pedidos!</p>
            </div>
            <p className="text-xs text-blue-700 pl-6">Ele está finalizando outra entrega antes de vir até você. Você é o próximo! 🚀</p>
          </div>
        )}
        {status === 'on_the_way' && (
          <div className="mt-4 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
            <Navigation className="w-4 h-4 text-green-600 animate-pulse flex-shrink-0" />
            <p className="text-sm text-green-800 font-medium">Motoboy saiu para entrega — a caminho do seu endereço!</p>
          </div>
        )}
        {status === 'motoboy_arrived' && (
          <div className="mt-4 flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
            <Navigation className="w-4 h-4 text-orange-600 animate-pulse flex-shrink-0" />
            <p className="text-sm text-orange-800 font-medium">Motoboy chegou — está te aguardando na sua porta!</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8F9FC]">
      {/* Gradient Header */}
      <div className="bg-gradient-to-r from-[#1E40AF] to-[#3B82F6] pt-10 pb-20 px-4">
        <div className="max-w-2xl mx-auto">
          <Link href="/perfil">
            <button className="flex items-center gap-2 text-white/80 hover:text-white text-sm mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Meus Pedidos</h1>
              <p className="text-blue-200 text-sm">Acompanhe o status de seus pedidos</p>
            </div>
          </div>

          {/* Stats strip */}
          <div className="flex gap-4 mt-6">
            <div className="flex-1 bg-white/10 rounded-2xl px-4 py-3 text-center">
              <p className="text-2xl font-bold text-white">{pendingOrders.length}</p>
              <p className="text-xs text-blue-200">Em andamento</p>
            </div>
            <div className="flex-1 bg-white/10 rounded-2xl px-4 py-3 text-center">
              <p className="text-2xl font-bold text-white">{historyOrders.length}</p>
              <p className="text-xs text-blue-200">Entregues</p>
            </div>
            <div className="flex-1 bg-white/10 rounded-2xl px-4 py-3 text-center">
              <p className="text-2xl font-bold text-white">{clientOrders.length}</p>
              <p className="text-xs text-blue-200">Total</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 -mt-12 pb-10">
        {/* Tab pills */}
        <div className="flex gap-2 mb-5">
          <button
            data-testid="tab-pending-orders"
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold shadow-sm transition-all ${
              activeTab === 'pending'
                ? 'bg-white text-[#1E40AF] shadow-md'
                : 'bg-white/60 text-gray-500 hover:bg-white hover:text-gray-700'
            }`}
          >
            <Clock className="w-4 h-4" />
            Em Andamento
            {pendingOrders.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'pending' ? 'bg-[#1E40AF] text-white' : 'bg-gray-200 text-gray-600'}`}>
                {pendingOrders.length}
              </span>
            )}
          </button>
          <button
            data-testid="tab-history-orders"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold shadow-sm transition-all ${
              activeTab === 'history'
                ? 'bg-white text-[#1E40AF] shadow-md'
                : 'bg-white/60 text-gray-500 hover:bg-white hover:text-gray-700'
            }`}
          >
            <History className="w-4 h-4" />
            Histórico
            {historyOrders.length > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'history' ? 'bg-[#1E40AF] text-white' : 'bg-gray-200 text-gray-600'}`}>
                {historyOrders.length}
              </span>
            )}
          </button>
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {displayOrders.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                {activeTab === 'pending'
                  ? <Clock className="w-8 h-8 text-gray-300" />
                  : <CheckCircle className="w-8 h-8 text-gray-300" />
                }
              </div>
              <p className="text-gray-500 text-base font-medium">
                {activeTab === 'pending'
                  ? 'Nenhum pedido em andamento'
                  : 'Nenhum pedido entregue ainda'}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {activeTab === 'pending'
                  ? 'Seus pedidos ativos aparecerão aqui'
                  : 'Seu histórico de entregas ficará aqui'}
              </p>
            </div>
          ) : (
            displayOrders.map(order => {
              const cfg = getStatusConfig(order.status);
              return (
                <div key={order.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {/* Card Top Bar */}
                  <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-50">
                    <div className="flex items-center gap-3">
                      {(() => {
                        const logo = getStoreLogo(order.storeId);
                        const storeName = getStoreById(order.storeId)?.name || '';
                        return isPhotoUrl(logo) ? (
                          <img src={logo} alt={storeName} className="w-9 h-9 rounded-xl object-cover border border-gray-100 flex-shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-xl flex-shrink-0">{logo}</div>
                        );
                      })()}
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{getStoreById(order.storeId)?.name || 'Loja'}</p>
                        <p className="text-xs text-gray-400 font-mono">#{order.id}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-[#1E40AF]">R$ {order.total.toFixed(2)}</p>
                      <p className="text-xs text-gray-400">{new Date(order.createdAt).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>

                  {/* Status badges row */}
                  <div className="flex flex-wrap gap-2 px-5 py-3 border-b border-gray-50">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {cfg.label}
                    </span>
                    {order.isPickup ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">
                        <Store className="w-3 h-3" /> Retirada na loja
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700">
                        <Bike className="w-3 h-3" /> Entrega
                      </span>
                    )}
                    {(!order.paymentStatus || order.paymentStatus === 'pending_payment') ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700">
                        <AlertCircle className="w-3 h-3" /> Aguardando pagamento
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-50 text-green-700">
                        <CreditCard className="w-3 h-3" /> Pago
                      </span>
                    )}
                  </div>

                  <div className="px-5 py-4 space-y-4">
                    {/* Timeline — history tab */}
                    {activeTab === 'history' && order.status === 'delivered' && (
                      <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                        <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                          <CalendarClock className="w-3.5 h-3.5" /> Linha do Tempo
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="flex items-start gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                              <Clock className="w-3.5 h-3.5 text-yellow-600" />
                            </div>
                            <div>
                              <p className="text-[10px] text-gray-500">Pedido realizado</p>
                              <p className="text-xs font-semibold text-gray-800">{fmtDateTime(order.createdAt)}</p>
                            </div>
                          </div>
                          {!order.isPickup ? (
                            <>
                              <div className="flex items-start gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                                  <Bike className="w-3.5 h-3.5 text-orange-600" />
                                </div>
                                <div>
                                  <p className="text-[10px] text-gray-500">Motoboy coletou</p>
                                  <p className="text-xs font-semibold text-gray-800">
                                    {fmtDateTime(getTimestampForStatus(order, 'on_the_way') ?? getTimestampForStatus(order, 'motoboy_at_store'))}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                  <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                                </div>
                                <div>
                                  <p className="text-[10px] text-gray-500">Entregue ao cliente</p>
                                  <p className="text-xs font-semibold text-gray-800">
                                    {fmtDateTime(order.deliveredAt ?? getTimestampForStatus(order, 'delivered'))}
                                  </p>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-start gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                                <Store className="w-3.5 h-3.5 text-teal-600" />
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-500">Retirado na loja</p>
                                <p className="text-xs font-semibold text-gray-800">
                                  {fmtDateTime(order.deliveredAt ?? getTimestampForStatus(order, 'delivered'))}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Progress Steps */}
                    {renderProgressSteps(order)}

                    {/* Live GPS tracking map — only when motoboy is actively coming to THIS client */}
                    {!order.isPickup && (order.status === 'on_the_way' || order.status === 'motoboy_arrived') && (
                      <LiveMotoboyMap
                        orderId={order.id}
                        deliveryCoords={Array.isArray(order.deliveryCoords) ? order.deliveryCoords as [number, number] : null}
                      />
                    )}

                    {/* Chat with motoboy */}
                    {(order.status === 'on_the_way' || order.status === 'motoboy_arrived') && (
                      <button
                        data-testid={`btn-chat-motoboy-${order.id}`}
                        onClick={() => setChatOrderId(order.id)}
                        className={`relative w-full flex items-center justify-between gap-3 rounded-xl px-4 py-3 transition-colors border ${
                          order.status === 'motoboy_arrived'
                            ? 'bg-orange-50 border-orange-200 hover:bg-orange-100'
                            : 'bg-green-50 border-green-200 hover:bg-green-100'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${order.status === 'motoboy_arrived' ? 'bg-orange-200' : 'bg-green-200'}`}>
                            <Bike className={`w-4 h-4 ${order.status === 'motoboy_arrived' ? 'text-orange-700' : 'text-green-700'}`} />
                          </div>
                          <div className="text-left">
                            <p className={`text-sm font-semibold ${order.status === 'motoboy_arrived' ? 'text-orange-800' : 'text-green-800'}`}>Falar com o motoboy</p>
                            <p className={`text-xs ${order.status === 'motoboy_arrived' ? 'text-orange-700' : 'text-green-700'}`}>
                              {order.status === 'motoboy_arrived' ? 'Aguardando na porta' : 'Em rota até você'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getUnreadCount(order.id, 'client') > 0 && (
                            <span className={`w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold ${order.status === 'motoboy_arrived' ? 'bg-orange-600' : 'bg-green-600'}`}>
                              {getUnreadCount(order.id, 'client')}
                            </span>
                          )}
                          <MessageCircle className={`w-5 h-5 ${order.status === 'motoboy_arrived' ? 'text-orange-600' : 'text-green-600'}`} />
                        </div>
                      </button>
                    )}

                    {/* Order Items */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5">Itens do pedido</p>
                      <div className="space-y-2.5">
                        {order.items.map(item => {
                          const product = products.find(p => p.id === item.productId);
                          return (
                            <div key={item.productId} className="flex items-center gap-3">
                              {product?.imageUrl ? (
                                <img src={product.imageUrl} alt={product.name} className="w-11 h-11 rounded-xl object-cover border border-gray-100 flex-shrink-0" />
                              ) : (
                                <div className="w-11 h-11 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-xl flex-shrink-0">
                                  {product?.image}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 text-sm truncate">{product?.name}</p>
                                <p className="text-xs text-gray-400">Qtd: {item.quantity}</p>
                              </div>
                              <span className="font-semibold text-gray-800 text-sm flex-shrink-0">R$ {(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>

                      {!order.isPickup && order.distanceKm != null && (
                        (() => {
                          const fee = calcDeliveryFee(order.distanceKm);
                          const subtotal = order.total - fee;
                          return (
                            <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                              <div className="flex justify-between text-xs text-gray-500">
                                <span>Subtotal dos produtos</span>
                                <span>R$ {subtotal.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-xs text-gray-500">
                                <span className="flex items-center gap-1"><Bike className="w-3 h-3" /> Taxa de entrega</span>
                                <span>R$ {fee.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-sm font-semibold text-gray-900 pt-1 border-t border-gray-100">
                                <span>Total</span>
                                <span>R$ {order.total.toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })()
                      )}
                    </div>

                    {/* Delivery Code */}
                    {order.deliveryCode && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <KeyRound className="w-5 h-5 text-[#1E40AF]" />
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-0.5">Código de Entrega</p>
                          <p className="text-3xl font-mono font-bold tracking-widest text-[#1E40AF]">{order.deliveryCode}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {order.isPickup
                              ? 'Informe a loja esse código para retirar seu pedido'
                              : 'Informe ao motoboy na entrega'}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Status History Timeline */}
                    {order.statusHistory && order.statusHistory.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                          <CalendarClock className="w-3.5 h-3.5" /> Histórico de Status
                        </p>
                        <div className="space-y-2">
                          {order.statusHistory.map((entry, idx) => (
                            <div key={idx} className="flex items-start gap-3 text-sm">
                              <div className="flex flex-col items-center flex-shrink-0">
                                <div className={`w-2 h-2 rounded-full mt-1.5 ${idx === order.statusHistory!.length - 1 ? 'bg-[#1E40AF]' : 'bg-gray-300'}`} />
                                {idx < order.statusHistory!.length - 1 && (
                                  <div className="w-px h-5 bg-gray-200 mt-0.5" />
                                )}
                              </div>
                              <div className="flex-1 pb-1">
                                <span className="font-medium text-gray-800 text-xs">{getStatusConfig(entry.status).label}</span>
                                <span className="text-gray-400 ml-2 text-[10px]">
                                  {new Date(entry.timestamp).toLocaleDateString('pt-BR')} às{' '}
                                  {new Date(entry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Footer: address */}
                    <div className="pt-2 border-t border-gray-50">
                      {order.deliveryAddress && !order.isPickup && (
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {order.deliveryAddress.logradouro}, {order.deliveryAddress.numero} — {order.deliveryAddress.bairro}
                        </p>
                      )}
                      {order.isPickup && (
                        <p className="text-xs text-teal-600 flex items-center gap-1">
                          <Store className="w-3 h-3 flex-shrink-0" />
                          Retirada na loja
                        </p>
                      )}
                    </div>
                  </div>
                </div>
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

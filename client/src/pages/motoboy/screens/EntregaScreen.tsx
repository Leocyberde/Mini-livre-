import { useState, useEffect, useRef } from 'react';
import { useMotoboyClientChat } from '@/contexts/MotoboyClientChatContext';
import { MOTOBOY_ENTREGA_SUPPORT_OPTIONS } from '@/contexts/SupportContext';
import { Order } from '@/lib/mockData';
import { Home, Clock, Map, MessageCircle, Navigation, UserRound } from 'lucide-react';
import { MotoboySupportModal } from '../components/MotoboySupportModal';
import { MotoboyClientChatModal } from '../components/MotoboyClientChatModal';
import { DeliveryChoiceMap } from './DeliveryChoiceMap';
import { ENTREGA_DURATION } from '../utils/mapUtils';

export function EntregaScreen({
  order,
  onGoHome,
  onArrived,
  deliveryIndex = 0,
  totalDeliveries = 1,
  allOrders = [],
  onSelectDelivery,
}: {
  order: Order;
  onGoHome: () => void;
  onArrived: () => void;
  deliveryIndex?: number;
  totalDeliveries?: number;
  allOrders?: Order[];
  onSelectDelivery?: (index: number) => void;
}) {
  const { getUnreadCount } = useMotoboyClientChat();
  const customerName = order.customerName || 'Cliente';
  const [secondsLeft, setSecondsLeft] = useState(ENTREGA_DURATION);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showClientChatModal, setShowClientChatModal] = useState(false);
  const clientUnread = getUnreadCount(order.id, 'motoboy');
  const [holdProgress, setHoldProgress] = useState(0);
  const [holdDone, setHoldDone] = useState(false);
  const [showConfirmArrival, setShowConfirmArrival] = useState(false);
  const [showDeliveryMap, setShowDeliveryMap] = useState(false);
  const holdTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isDoubleRoute = allOrders.length > 1;

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) { clearInterval(interval); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const progressPct = ((ENTREGA_DURATION - secondsLeft) / ENTREGA_DURATION) * 100;

  const [etaStr] = useState(() =>
    new Date(Date.now() + ENTREGA_DURATION * 1000)
      .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );

  const deliveryAddressLine = order.deliveryAddress
    ? `${order.deliveryAddress.logradouro}, ${order.deliveryAddress.numero}, ${order.deliveryAddress.bairro}${order.deliveryAddress.cidade ? `, ${order.deliveryAddress.cidade}` : ''}`
    : 'Endereço não informado';

  const openMap = () => {
    const query = encodeURIComponent(deliveryAddressLine);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  const startHold = () => {
    if (holdDone) return;
    holdTimerRef.current = setInterval(() => {
      setHoldProgress(p => {
        if (p >= 100) {
          if (holdTimerRef.current) clearInterval(holdTimerRef.current);
          setHoldDone(true);
          setShowConfirmArrival(true);
          return 100;
        }
        return p + 4;
      });
    }, 80);
  };

  const cancelHold = () => {
    if (holdTimerRef.current) clearInterval(holdTimerRef.current);
    if (!holdDone) setHoldProgress(0);
  };

  return (
    <div className="fixed inset-0 z-[3000] flex flex-col bg-[#111111]" data-testid="entrega-screen">
      {/* Delivery choice map modal */}
      {showDeliveryMap && isDoubleRoute && onSelectDelivery && (
        <DeliveryChoiceMap
          orders={allOrders}
          currentIndex={deliveryIndex}
          onSelectDelivery={onSelectDelivery}
          onClose={() => setShowDeliveryMap(false)}
        />
      )}

      {/* Confirm Arrival Modal */}
      {showConfirmArrival && (
        <div className="absolute inset-0 z-[100] flex items-end justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#1c1c1c] rounded-t-3xl p-6 pb-10 shadow-2xl">
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-red-500/20 flex items-center justify-center">
                <Navigation className="w-7 h-7 text-red-400" />
              </div>
            </div>
            <h3 className="text-white font-bold text-xl text-center mb-2">Você chegou na entrega?</h3>
            <p className="text-gray-400 text-sm text-center mb-6">Confirme apenas quando estiver no endereço do cliente.</p>
            <div className="flex gap-3">
              <button
                data-testid="btn-cancel-arrival"
                onClick={() => { setShowConfirmArrival(false); setHoldDone(false); setHoldProgress(0); }}
                className="flex-1 py-4 rounded-2xl border-2 border-white/20 text-white/70 font-bold text-base transition-colors hover:bg-white/10"
              >
                Voltar
              </button>
              <button
                data-testid="btn-confirm-arrival"
                onClick={() => { setShowConfirmArrival(false); onArrived(); }}
                className="flex-1 py-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold text-base transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <button
          data-testid="btn-entrega-home"
          onClick={onGoHome}
          className="w-10 h-10 flex items-center justify-center rounded-full text-white/70 hover:bg-white/10 transition-colors"
        >
          <Home className="w-6 h-6" />
        </button>
        <span className="text-white font-bold tracking-[0.2em] text-sm">ENTREGA</span>
        <div className="flex items-center gap-1">
          <button
            data-testid="btn-entrega-client-chat"
            onClick={() => setShowClientChatModal(true)}
            className="relative w-10 h-10 flex items-center justify-center rounded-full text-blue-400 hover:bg-white/10 transition-colors"
          >
            <UserRound className="w-6 h-6" />
            {clientUnread > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-blue-400 border border-[#111111]" />
            )}
          </button>
          <button
            data-testid="btn-entrega-support"
            onClick={() => setShowSupportModal(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white/90 transition-colors"
          >
            <MessageCircle className="w-6 h-6" />
          </button>
        </div>
      </div>

      {showSupportModal && <MotoboySupportModal onClose={() => setShowSupportModal(false)} orderId={order.id} options={MOTOBOY_ENTREGA_SUPPORT_OPTIONS} />}
      {showClientChatModal && <MotoboyClientChatModal onClose={() => setShowClientChatModal(false)} order={order} />}

      {/* Drag handle */}
      <div className="flex justify-center mb-4">
        <div className="w-10 h-1 rounded-full bg-white/20" />
      </div>

      <div className="flex-1 px-4 space-y-3 overflow-y-auto pb-6">
        {/* Double route progress banner + route choice button */}
        {totalDeliveries >= 2 && (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-purple-500/15 border border-purple-500/30 rounded-2xl px-4 py-2.5 flex items-center gap-2">
              <span className="text-purple-400 text-sm">🔄</span>
              <p className="text-purple-300 text-sm font-semibold">
                {deliveryIndex + 1}ª entrega de {totalDeliveries}
              </p>
            </div>
            {onSelectDelivery && (
              <button
                data-testid="btn-ver-rotas-mapa"
                onClick={() => setShowDeliveryMap(true)}
                className="flex-shrink-0 flex flex-col items-center justify-center gap-1 px-3 py-2.5 rounded-2xl bg-blue-500/20 border border-blue-500/40 text-blue-400 hover:bg-blue-500/30 transition-colors"
              >
                <Map className="w-4 h-4" />
                <span className="text-[10px] font-bold">Rotas</span>
              </button>
            )}
          </div>
        )}

        {/* Customer + address card with map button */}
        <div className="bg-[#1c1c1c] rounded-2xl p-4 flex items-start gap-3 border border-white/5">
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-lg leading-tight">{customerName}</p>
            <p className="text-gray-400 text-sm mt-1 leading-snug">{deliveryAddressLine}</p>
          </div>
          <button
            data-testid="btn-entrega-mapa"
            onClick={openMap}
            className="flex-shrink-0 flex flex-col items-center justify-center gap-1.5 w-16 h-16 rounded-2xl border-2 border-red-500 text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <Map className="w-5 h-5" />
            <span className="text-[11px] font-bold tracking-wide">Mapa</span>
          </button>
        </div>

        {/* Status + ETA card */}
        <div className="bg-[#1c1c1c] rounded-2xl p-4 border border-white/5">
          <p className="text-white font-bold text-base mb-2">Você está indo pra entrega</p>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-3">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-1000"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-400 text-sm">Previsão de entrega:</span>
            <span className="text-white font-bold text-sm">{etaStr}</span>
          </div>
        </div>
      </div>

      {/* Bottom button - hold to confirm */}
      <div className="px-4 pb-10 pt-2 flex-shrink-0">
        <div className="relative overflow-hidden rounded-2xl">
          <div
            className="absolute inset-0 bg-red-500 rounded-2xl transition-none"
            style={{ width: `${holdProgress}%`, opacity: 0.9 }}
          />
          <button
            data-testid="btn-cheguei-entrega"
            onPointerDown={startHold}
            onPointerUp={cancelHold}
            onPointerLeave={cancelHold}
            className="relative z-10 w-full py-5 rounded-2xl border-2 border-red-500 text-red-500 font-bold text-base tracking-wide transition-colors select-none"
            style={{
              color: holdProgress > 50 ? 'white' : undefined,
              borderColor: holdProgress > 50 ? 'transparent' : undefined,
            }}
          >
            Cheguei na entrega
          </button>
        </div>
        <p className="text-center text-gray-600 text-xs mt-2">Segure o botão para confirmar</p>
      </div>
    </div>
  );
}

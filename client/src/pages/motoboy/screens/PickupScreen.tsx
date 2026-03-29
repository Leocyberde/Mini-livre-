import { useState, useRef } from 'react';
import { useMotoboy } from '@/contexts/MotoboyContext';
import { Order, Store } from '@/lib/mockData';
import { Home, MessageCircle, Map, MapPin, User, CheckCircle2 } from 'lucide-react';
import { MotoboySupportModal } from '../components/MotoboySupportModal';

export function PickupScreen({
  order,
  orders,
  store,
  onGoHome,
  onConclude,
}: {
  order: Order;
  orders?: Order[];
  store: Store | undefined;
  onGoHome: () => void;
  onConclude: () => void;
}) {
  const { currentRoute } = useMotoboy();
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [holdDone, setHoldDone] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);

  const allPickupOrders = (orders && orders.length > 0) ? orders : [order];
  const isDouble = allPickupOrders.length >= 2;
  const storeName = order.storeName || store?.name || `Loja #${order.storeId}`;
  const storeAddress = currentRoute?.storeAddress || order.storeAddress || store?.address || 'Endereço não informado';

  const openWaze = () => {
    const address = encodeURIComponent(storeAddress);
    window.open(`https://waze.com/ul?q=${address}&navigate=yes`, '_blank');
  };

  const startHold = () => {
    if (holdDone) return;
    holdTimer.current = setInterval(() => {
      setHoldProgress(p => {
        if (p >= 100) {
          clearInterval(holdTimer.current!);
          setHoldDone(true);
          setShowConfirmModal(true);
          return 100;
        }
        return p + 1.67;
      });
    }, 50);
  };

  const cancelHold = () => {
    if (holdDone) return;
    if (holdTimer.current) clearInterval(holdTimer.current);
    setHoldProgress(0);
  };

  const handleConfirmCollect = () => {
    setShowConfirmModal(false);
    onConclude();
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
    setHoldDone(false);
    setHoldProgress(0);
  };

  return (
    <div className="fixed inset-0 z-[3000] flex flex-col bg-[#111111]" data-testid="pickup-screen">
      {/* Confirmation modal */}
      {showConfirmModal && (
        <div className="absolute inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#1c1c1c] rounded-t-3xl p-6 pb-10 shadow-2xl">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-orange-400" />
              </div>
            </div>
            <h3 className="text-white font-bold text-lg text-center mb-1">Coletou os pedidos?</h3>
            <p className="text-gray-400 text-sm text-center mb-6">
              Confirme que você retirou todos os itens da loja
            </p>
            <div className="flex flex-col gap-3">
              <button
                data-testid="btn-confirm-collect"
                onClick={handleConfirmCollect}
                className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-base flex items-center justify-center gap-2 transition-colors"
              >
                <CheckCircle2 className="w-5 h-5" />
                Confirmar coleta
              </button>
              <button
                data-testid="btn-cancel-collect"
                onClick={handleCancelConfirm}
                className="w-full py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm transition-colors"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <button
          data-testid="btn-pickup-home"
          onClick={onGoHome}
          className="w-10 h-10 flex items-center justify-center rounded-full text-white/70 hover:bg-white/10 transition-colors"
        >
          <Home className="w-6 h-6" />
        </button>
        <span className="text-white font-bold tracking-[0.2em] text-sm">COLETA</span>
        <button
          data-testid="btn-pickup-support"
          onClick={() => setShowSupportModal(true)}
          className="w-10 h-10 flex items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white/90 transition-colors"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>

      {showSupportModal && <MotoboySupportModal onClose={() => setShowSupportModal(false)} orderId={order.id} />}

      {/* Drag handle */}
      <div className="flex justify-center mb-2">
        <div className="w-10 h-1 rounded-full bg-white/20" />
      </div>

      <div className="flex-1 px-4 space-y-3 overflow-y-auto pb-6">
        {/* Store info card (Coleta) */}
        <div className="bg-[#1c1c1c] rounded-2xl p-4 border border-white/5">
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-orange-400 text-[10px] font-bold tracking-widest mb-1">🏪 COLETA</p>
              <p className="text-white font-bold text-base leading-tight">{storeName}</p>
              <p className="text-gray-400 text-sm mt-1 leading-snug">{storeAddress}</p>
            </div>
            <button
              data-testid="btn-pickup-waze"
              onClick={openWaze}
              className="flex-shrink-0 flex flex-col items-center justify-center gap-1.5 w-16 h-16 rounded-2xl border-2 border-red-500 text-red-500 hover:bg-red-500/10 transition-colors"
            >
              <Map className="w-5 h-5" />
              <span className="text-[11px] font-bold tracking-wide">Mapa</span>
            </button>
          </div>
        </div>

        {/* Delivery address card (Entrega) */}
        {order.deliveryAddress && (
          <div className="bg-[#1c1c1c] rounded-2xl p-4 border border-white/5">
            <p className="text-red-400 text-[10px] font-bold tracking-widest mb-1">📍 ENTREGA</p>
            <p className="text-white font-semibold text-sm leading-tight">
              {order.deliveryAddress.logradouro}, {order.deliveryAddress.numero}
            </p>
            <p className="text-gray-400 text-sm mt-0.5 leading-snug">
              {order.deliveryAddress.bairro}{order.deliveryAddress.cidade ? ` — ${order.deliveryAddress.cidade}` : ''}
            </p>
          </div>
        )}

        {/* Instructions card */}
        <div className="bg-[#1c1c1c] rounded-2xl p-4 border border-white/5 flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <span className="text-blue-400 text-sm">💡</span>
          </div>
          <div>
            <p className="text-blue-400 font-semibold text-sm mb-1">Confirmação da coleta</p>
            <p className="text-gray-400 text-sm leading-snug">
              Segure o botão para confirmar que coletou os pedidos
            </p>
          </div>
        </div>

        {/* Double route banner */}
        {isDouble && (
          <div className="bg-purple-500/15 border border-purple-500/30 rounded-2xl px-4 py-3 flex items-center gap-3">
            <span className="text-purple-400 text-sm">🔄</span>
            <p className="text-purple-300 text-sm font-semibold">Rota dupla — colete os {allPickupOrders.length} pedidos de uma vez</p>
          </div>
        )}

        {/* Order items */}
        {allPickupOrders.map((o, i) => (
          <div key={o.id} className="bg-[#1c1c1c] rounded-2xl border border-white/5 overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
              <span className="text-white text-sm font-bold">
                {isDouble ? `${i + 1}° Pedido` : '1° Pedido'}: #{o.id.slice(-5).toUpperCase()}
              </span>
              <span className="bg-green-500/20 text-green-400 text-xs font-bold px-3 py-1 rounded-full border border-green-500/30">
                Pronto
              </span>
            </div>
            <div className="px-4 py-2.5 flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
              <span className="text-gray-400 text-xs">Cliente:</span>
              <span className="text-gray-200 text-xs font-semibold ml-auto">—</span>
            </div>
            {o.deliveryAddress && (
              <div className="px-4 py-2.5 flex items-start gap-2 border-t border-white/5">
                <MapPin className="w-3.5 h-3.5 text-gray-500 flex-shrink-0 mt-0.5" />
                <span className="text-gray-400 text-xs leading-snug">
                  {o.deliveryAddress.logradouro}, {o.deliveryAddress.numero} — {o.deliveryAddress.bairro}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Hold-to-confirm bottom button */}
      <div className="px-4 pb-10 pt-2 flex-shrink-0">
        <div className="relative overflow-hidden rounded-2xl">
          <div
            className="absolute inset-0 bg-orange-500 rounded-2xl transition-none"
            style={{ width: `${holdProgress}%`, opacity: 0.9 }}
          />
          <button
            data-testid="btn-coletar-pedidos"
            onPointerDown={startHold}
            onPointerUp={cancelHold}
            onPointerLeave={cancelHold}
            className="relative z-10 w-full py-5 rounded-2xl border-2 border-red-500 text-red-500 font-bold text-base tracking-wide transition-colors select-none"
            style={{
              color: holdProgress > 50 ? 'white' : undefined,
              borderColor: holdProgress > 50 ? 'transparent' : undefined,
            }}
          >
            Coletar os pedidos
          </button>
        </div>
        <p className="text-center text-gray-600 text-xs mt-2">Segure o botão para confirmar</p>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useMotoboyClientChat } from '@/contexts/MotoboyClientChatContext';
import { MOTOBOY_CHEGADA_SUPPORT_OPTIONS } from '@/contexts/SupportContext';
import { Order } from '@/lib/mockData';
import { Home, Map, MessageCircle, CheckCircle2, X, Delete, Smartphone, UserRound } from 'lucide-react';
import { MotoboySupportModal } from '../components/MotoboySupportModal';
import { MotoboyClientChatModal } from '../components/MotoboyClientChatModal';

export function ChegadaEntregaScreen({
  order,
  onGoHome,
  onLeave,
  deliveryIndex = 0,
  totalDeliveries = 1,
}: {
  order: Order;
  onGoHome: () => void;
  onLeave: () => void;
  deliveryIndex?: number;
  totalDeliveries?: number;
}) {
  const { getUnreadCount } = useMotoboyClientChat();
  const [codeVerified, setCodeVerified] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeDigits, setCodeDigits] = useState(['', '', '', '']);
  const [codeError, setCodeError] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showClientChatModal, setShowClientChatModal] = useState(false);
  const clientUnread = getUnreadCount(order.id, 'motoboy');

  const deliveryAddressLine = order.deliveryAddress
    ? `${order.deliveryAddress.logradouro}, ${order.deliveryAddress.numero}, ${order.deliveryAddress.bairro}${order.deliveryAddress.cidade ? `, ${order.deliveryAddress.cidade}` : ''}`
    : 'Endereço não informado';

  const openMap = () => {
    const query = encodeURIComponent(deliveryAddressLine);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  const expectedCode = order.customerPhone
    ? order.customerPhone.replace(/\D/g, '').slice(-4)
    : '';

  const enteredCode = codeDigits.join('');

  const handleDigit = (digit: string) => {
    const idx = codeDigits.findIndex(d => d === '');
    if (idx === -1) return;
    const next = [...codeDigits];
    next[idx] = digit;
    setCodeDigits(next);
    setCodeError(false);
  };

  const handleBackspace = () => {
    const filled = codeDigits.filter(d => d !== '');
    if (filled.length === 0) return;
    const next = [...codeDigits];
    const idx = filled.length - 1;
    next[idx] = '';
    setCodeDigits(next);
    setCodeError(false);
  };

  const handleValidate = () => {
    if (enteredCode.length < 4) return;
    if (!expectedCode || enteredCode === expectedCode) {
      setCodeVerified(true);
      setShowCodeModal(false);
    } else {
      setCodeError(true);
      setCodeDigits(['', '', '', '']);
    }
  };

  const numpadButtons = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <div className="fixed inset-0 z-[3000] flex flex-col bg-[#111111]" data-testid="chegada-entrega-screen">
      {/* Code input modal */}
      {showCodeModal && (
        <div className="absolute inset-0 z-[100] flex items-end justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#1c1c1c] rounded-t-3xl p-6 pb-10 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-white font-bold text-lg">Código do cliente</h3>
              <button
                onClick={() => { setShowCodeModal(false); setCodeDigits(['', '', '', '']); setCodeError(false); }}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-400 text-sm mb-6 text-center">
              Digite os 4 últimos dígitos do telefone do cliente
            </p>

            {/* 4-digit display */}
            <div className="flex gap-3 justify-center mb-2">
              {codeDigits.map((d, i) => (
                <div
                  key={i}
                  className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold border-2 transition-colors ${
                    codeError
                      ? 'border-red-500 bg-red-500/10 text-red-400'
                      : d
                        ? 'border-red-500 bg-red-500/10 text-white'
                        : 'border-white/20 bg-white/5 text-gray-600'
                  }`}
                >
                  {d || '—'}
                </div>
              ))}
            </div>
            {codeError && (
              <p className="text-red-400 text-xs text-center mb-3">Código incorreto. Tente novamente.</p>
            )}

            {/* Numpad */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              {numpadButtons.map((btn, i) => {
                if (btn === '') return <div key={i} />;
                if (btn === '⌫') {
                  return (
                    <button
                      key={i}
                      onClick={handleBackspace}
                      className="h-14 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                    >
                      <Delete className="w-5 h-5 text-white" />
                    </button>
                  );
                }
                return (
                  <button
                    key={i}
                    onClick={() => handleDigit(btn)}
                    className="h-14 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xl transition-colors"
                  >
                    {btn}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleValidate}
              disabled={enteredCode.length < 4}
              className="mt-4 w-full py-4 rounded-2xl bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-base transition-colors"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <button
          data-testid="btn-chegada-home"
          onClick={onGoHome}
          className="w-10 h-10 flex items-center justify-center rounded-full text-white/70 hover:bg-white/10 transition-colors"
        >
          <Home className="w-6 h-6" />
        </button>
        <span className="text-white font-bold tracking-[0.2em] text-sm">ENTREGA</span>
        <div className="flex items-center gap-1">
          <button
            data-testid="btn-chegada-client-chat"
            onClick={() => setShowClientChatModal(true)}
            className="relative w-10 h-10 flex items-center justify-center rounded-full text-blue-400 hover:bg-white/10 transition-colors"
          >
            <UserRound className="w-6 h-6" />
            {clientUnread > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-blue-400 border border-[#111111]" />
            )}
          </button>
          <button
            data-testid="btn-chegada-support"
            onClick={() => setShowSupportModal(true)}
            className="w-10 h-10 flex items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white/90 transition-colors"
          >
            <MessageCircle className="w-6 h-6" />
          </button>
        </div>
      </div>

      {showSupportModal && <MotoboySupportModal onClose={() => setShowSupportModal(false)} orderId={order.id} options={MOTOBOY_CHEGADA_SUPPORT_OPTIONS} />}
      {showClientChatModal && <MotoboyClientChatModal onClose={() => setShowClientChatModal(false)} order={order} />}

      {/* Drag handle */}
      <div className="flex justify-center mb-4">
        <div className="w-10 h-1 rounded-full bg-white/20" />
      </div>

      <div className="flex-1 px-4 space-y-3 overflow-y-auto pb-6">
        {/* Delivery address card */}
        <div className="bg-[#1c1c1c] rounded-2xl p-4 flex items-start gap-3 border border-white/5">
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-base leading-tight mb-0.5">Endereço de entrega</p>
            <p className="text-gray-400 text-sm leading-snug">{deliveryAddressLine}</p>
            {order.storeName && (
              <p className="text-gray-500 text-xs mt-1">— {order.storeName}</p>
            )}
          </div>
          <button
            data-testid="btn-chegada-mapa"
            onClick={openMap}
            className="flex-shrink-0 flex flex-col items-center justify-center gap-1.5 w-16 h-16 rounded-2xl border-2 border-red-500 text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <Map className="w-5 h-5" />
            <span className="text-[11px] font-bold tracking-wide">Mapa</span>
          </button>
        </div>

        {/* Order info card */}
        <div className="bg-[#1c1c1c] rounded-2xl border border-white/5 overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-white/5">
            <p className="text-gray-400 text-sm">Pedido {order.id}</p>
          </div>
          <div className="px-4 py-3 border-b border-white/5">
            <p className="text-white font-bold text-base leading-tight">{order.customerName || 'Cliente'}</p>
            {order.storeName && (
              <p className="text-gray-400 text-sm mt-0.5">{order.storeName}</p>
            )}
          </div>
          <div className="px-4 py-3 flex items-center gap-2 border-b border-white/5">
            <Smartphone className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-300 text-sm">Cliente pagou no app</span>
          </div>
          <div className="px-4 py-3">
            <button
              data-testid="btn-digitar-codigo"
              onClick={() => { setShowCodeModal(true); setCodeDigits(['', '', '', '']); setCodeError(false); }}
              disabled={codeVerified}
              className={`w-full py-4 rounded-2xl border-2 font-bold text-base tracking-wide transition-colors flex items-center justify-center gap-2 ${
                codeVerified
                  ? 'border-green-500 text-green-400 bg-green-500/10 cursor-default'
                  : 'border-red-500 text-red-500 hover:bg-red-500/10'
              }`}
            >
              {codeVerified ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Código validado
                </>
              ) : (
                'Digitar código do cliente'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Sair da entrega button */}
      <div className="px-4 pb-10 pt-2 flex-shrink-0">
        <button
          data-testid="btn-sair-entrega"
          onClick={onLeave}
          disabled={!codeVerified}
          className={`w-full py-5 rounded-2xl font-bold text-base tracking-wide transition-colors ${
            codeVerified
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-[#2a2a2a] text-gray-600 cursor-not-allowed'
          }`}
        >
          Sair da entrega
        </button>
      </div>
    </div>
  );
}

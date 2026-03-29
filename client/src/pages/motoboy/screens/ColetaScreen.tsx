import { useState, useEffect, useRef } from 'react';
import { useMotoboy } from '@/contexts/MotoboyContext';
import { Home, MessageCircle, Map, Clock, CheckCircle2 } from 'lucide-react';
import { MotoboySupportModal } from '../components/MotoboySupportModal';
import { COLETA_DURATION } from '../utils/mapUtils';

export function ColetaScreen({
  onGoHome,
  onTimeout,
  onArrivedAtPickup,
  orderId,
}: {
  onGoHome: () => void;
  onTimeout: () => void;
  onArrivedAtPickup: () => void;
  orderId: string;
}) {
  const { currentRoute } = useMotoboy();
  const [secondsLeft, setSecondsLeft] = useState(COLETA_DURATION);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const [holdDone, setHoldDone] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const timedOut = useRef(false);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  // Countdown — runs once on mount, decrements every second
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(interval);
          if (!timedOut.current) {
            timedOut.current = true;
            onTimeoutRef.current();
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Format countdown as mm:ss
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const countdownStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

  // ETA fixed at mount time (now + 15 min), never changes
  const [etaStr] = useState(() =>
    new Date(Date.now() + COLETA_DURATION * 1000)
      .toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );

  // Timer is urgent when < 3 minutes left
  const isUrgent = secondsLeft < 180;
  const progressPct = ((COLETA_DURATION - secondsLeft) / COLETA_DURATION) * 100;

  // Hold-to-confirm handlers
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

  const openWaze = () => {
    const address = encodeURIComponent(currentRoute?.storeAddress || currentRoute?.from || '');
    window.open(`https://waze.com/ul?q=${address}&navigate=yes`, '_blank');
  };

  const handleConfirmArrival = () => {
    setShowConfirmModal(false);
    onArrivedAtPickup();
  };

  const handleCancelConfirm = () => {
    setShowConfirmModal(false);
    setHoldDone(false);
    setHoldProgress(0);
  };

  if (!currentRoute) return null;

  void orderId;

  return (
    <div className="fixed inset-0 z-[3000] flex flex-col bg-[#111111]" data-testid="coleta-screen">
      {/* Confirmation modal — shown after holding the button */}
      {showConfirmModal && (
        <div className="absolute inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-[#1c1c1c] rounded-t-3xl p-6 pb-10 shadow-2xl">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-green-400" />
              </div>
            </div>
            <h3 className="text-white font-bold text-lg text-center mb-1">Chegou na coleta?</h3>
            <p className="text-gray-400 text-sm text-center mb-6">Confirme sua chegada para prosseguir com a entrega</p>
            <div className="flex flex-col gap-3">
              <button
                data-testid="btn-confirm-arrival"
                onClick={handleConfirmArrival}
                className="w-full py-4 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-bold text-base flex items-center justify-center gap-2 transition-colors"
              >
                <CheckCircle2 className="w-5 h-5" />
                Confirmar chegada na coleta
              </button>
              <button
                data-testid="btn-cancel-arrival"
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
          data-testid="btn-coleta-home"
          onClick={onGoHome}
          className="w-10 h-10 flex items-center justify-center rounded-full text-white/70 hover:bg-white/10 transition-colors"
        >
          <Home className="w-6 h-6" />
        </button>
        <span className="text-white font-bold tracking-[0.2em] text-sm">COLETA</span>
        <button
          data-testid="btn-coleta-support"
          onClick={() => setShowSupportModal(true)}
          className="w-10 h-10 flex items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white/90 transition-colors"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>

      {showSupportModal && <MotoboySupportModal onClose={() => setShowSupportModal(false)} orderId={orderId} />}

      {/* Drag handle */}
      <div className="flex justify-center mb-2">
        <div className="w-10 h-1 rounded-full bg-white/20" />
      </div>

      <div className="flex-1 px-4 space-y-3 overflow-y-auto pb-6">
        {/* Store info card (Coleta) */}
        <div className="bg-[#1c1c1c] rounded-2xl p-4 flex items-center gap-3 border border-white/5">
          <div className="flex-1 min-w-0">
            <p className="text-orange-400 text-[10px] font-bold tracking-widest mb-0.5">🏪 COLETA</p>
            <p className="text-white font-bold text-base leading-tight">{currentRoute.from}</p>
            <p className="text-gray-400 text-sm mt-1 leading-snug">
              {currentRoute.storeAddress || 'Endereço não informado'}
            </p>
          </div>
          <button
            data-testid="btn-waze"
            onClick={openWaze}
            className="flex-shrink-0 flex flex-col items-center justify-center gap-1.5 w-16 h-16 rounded-2xl border-2 border-red-500 text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <Map className="w-5 h-5" />
            <span className="text-[11px] font-bold tracking-wide">Mapa</span>
          </button>
        </div>

        {/* Delivery address card (Entrega) */}
        {currentRoute.to && currentRoute.to !== 'Destino' && (
          <div className="bg-[#1c1c1c] rounded-2xl p-4 border border-white/5">
            <p className="text-red-400 text-[10px] font-bold tracking-widest mb-1">📍 ENTREGA</p>
            <p className="text-white font-semibold text-sm leading-snug">{currentRoute.to}</p>
          </div>
        )}

        {/* Timer card */}
        <div className={`rounded-2xl p-4 border transition-colors ${isUrgent ? 'bg-red-950/40 border-red-500/30' : 'bg-[#1c1c1c] border-white/5'}`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-white font-bold text-base">Você está indo pra coleta</p>
            {isUrgent && (
              <span className="text-red-400 text-xs font-bold animate-pulse">⚠ URGENTE</span>
            )}
          </div>
          {/* Countdown */}
          <div className="text-center mb-3">
            <div className={`text-4xl font-bold tabular-nums ${isUrgent ? 'text-red-400' : 'text-white'}`}>
              {countdownStr}
            </div>
            <div className="flex justify-center gap-8 mt-1">
              <span className="text-gray-500 text-[10px] font-medium tracking-widest">MIN</span>
              <span className="text-gray-500 text-[10px] font-medium tracking-widest">SEG</span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-3">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${isUrgent ? 'bg-red-500' : 'bg-green-500'}`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <span className="text-gray-400 text-sm">Previsão de chegada:</span>
            <span className={`font-bold text-sm ${isUrgent ? 'text-red-400' : 'text-white'}`}>{etaStr}</span>
          </div>
          {isUrgent && (
            <p className="text-red-400/70 text-xs mt-2">
              Se não chegar a tempo, a corrida será redirecionada para outro motoboy.
            </p>
          )}
        </div>
      </div>

      {/* Hold-to-confirm bottom button */}
      <div className="px-4 pb-10 pt-2 flex-shrink-0">
        <div className="relative overflow-hidden rounded-2xl">
          <div
            className="absolute inset-0 bg-green-500 rounded-2xl transition-none"
            style={{ width: `${holdProgress}%`, opacity: 0.9 }}
          />
          <button
            data-testid="btn-cheguei-coleta"
            onPointerDown={startHold}
            onPointerUp={cancelHold}
            onPointerLeave={cancelHold}
            className="relative z-10 w-full py-5 rounded-2xl border-2 border-red-500 text-red-500 font-bold text-base tracking-wide transition-colors select-none"
            style={{
              color: holdProgress > 50 ? 'white' : undefined,
              borderColor: holdProgress > 50 ? 'transparent' : undefined,
            }}
          >
            Cheguei na coleta
          </button>
        </div>
        <p className="text-center text-gray-600 text-xs mt-2">Segure o botão para confirmar</p>
      </div>
    </div>
  );
}

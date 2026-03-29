import { useState, useEffect, useRef } from 'react';
import { Order } from '@/lib/mockData';
import { calcDoubleRouteValues, formatKm } from '@/lib/deliveryCalc';
import { CheckCircle2, X } from 'lucide-react';

export function StackingModal({
  stackOrder,
  currentRouteValue,
  currentRouteKm,
  betweenKm,
  onAccept,
  onReject,
}: {
  stackOrder: Order;
  currentRouteValue: number;
  currentRouteKm: number;
  betweenKm: number;
  onAccept: () => void;
  onReject: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(60);
  const onRejectRef = useRef(onReject);
  useEffect(() => { onRejectRef.current = onReject; }, [onReject]);

  useEffect(() => {
    const t = setInterval(() => {
      setTimeLeft(v => {
        if (v <= 1) { clearInterval(t); onRejectRef.current(); return 0; }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // totalRouteKm = store → first delivery + first delivery → second delivery
  const addValue = calcDoubleRouteValues(currentRouteKm + betweenKm).order2Value;
  const newTotal = parseFloat((currentRouteValue + addValue).toFixed(2));

  const RADIUS = 36;
  const circ = 2 * Math.PI * RADIUS;
  const timerOffset = circ * (1 - timeLeft / 60);
  const timerColor = timeLeft > 15 ? '#ffffff' : '#fca5a5';

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/80 backdrop-blur-sm p-3">
      <div className="w-full max-w-sm bg-gray-900 rounded-3xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-purple-600 px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-2xl animate-bounce flex-shrink-0">
            🛵
          </div>
          <div className="flex-1">
            <h2 className="text-white font-bold text-base leading-tight">Rota adicional disponível!</h2>
            <p className="text-purple-100 text-xs mt-0.5">Mesma loja — adicione ao trajeto atual</p>
          </div>
          <div className="relative w-12 h-12 flex items-center justify-center flex-shrink-0">
            <svg className="absolute -rotate-90" viewBox="0 0 100 100" width="48" height="48">
              <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="10" />
              <circle
                cx="50" cy="50" r={RADIUS} fill="none"
                stroke={timerColor} strokeWidth="10"
                strokeDasharray={circ} strokeDashoffset={timerOffset}
                style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
              />
            </svg>
            <span className="text-white font-bold text-sm z-10">{timeLeft}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* New delivery address */}
          <div className="bg-gray-800 rounded-xl p-3 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <div className="w-3 h-3 rounded-full bg-red-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-gray-400 text-[10px] font-bold tracking-widest">2ª ENTREGA</p>
              {stackOrder.deliveryAddress ? (
                <>
                  <p className="text-white text-sm font-semibold leading-tight">
                    {stackOrder.deliveryAddress.logradouro}, {stackOrder.deliveryAddress.numero}
                  </p>
                  <p className="text-gray-400 text-xs mt-0.5">
                    {stackOrder.deliveryAddress.bairro}{stackOrder.deliveryAddress.cidade ? ` — ${stackOrder.deliveryAddress.cidade}` : ''}
                  </p>
                </>
              ) : (
                <p className="text-white text-sm font-semibold">Endereço não informado</p>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-2.5 text-center">
              <p className="text-orange-400 text-[9px] font-bold tracking-widest mb-1">+KM</p>
              <p className="text-orange-400 text-base font-bold">{formatKm(betweenKm)}</p>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-2.5 text-center">
              <p className="text-purple-400 text-[9px] font-bold tracking-widest mb-1">+VALOR</p>
              <p className="text-purple-400 text-base font-bold">+R$ {addValue.toFixed(2).replace('.', ',')}</p>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-2.5 text-center">
              <p className="text-green-400 text-[9px] font-bold tracking-widest mb-1">NOVO TOTAL</p>
              <p className="text-green-400 text-base font-bold">R$ {newTotal.toFixed(2).replace('.', ',')}</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              data-testid="btn-reject-stack"
              onClick={onReject}
              className="flex-1 py-3 rounded-2xl bg-red-500/15 hover:bg-red-500/25 text-red-400 font-bold text-sm transition-colors border border-red-500/25 flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Recusar
            </button>
            <button
              data-testid="btn-accept-stack"
              onClick={onAccept}
              className="flex-[2] py-3 rounded-2xl bg-purple-500 hover:bg-purple-600 active:bg-purple-700 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Adicionar à rota
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

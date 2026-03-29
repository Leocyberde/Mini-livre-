import { useMotoboy } from '@/contexts/MotoboyContext';
import { Navigation, X, CheckCircle2 } from 'lucide-react';

export function RouteSheet({ onClose, isDark }: { onClose: () => void; isDark: boolean }) {
  const { currentRoute, finishRoute } = useMotoboy();
  if (!currentRoute) return null;
  const bg = isDark ? 'bg-gray-900' : 'bg-white';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-gray-50';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col" data-testid="route-sheet">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative mt-auto ${bg} rounded-t-2xl shadow-2xl p-5 pb-10`}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-orange-500" />
            <h2 className={`font-semibold text-base ${textMain}`}>Rota Atual</h2>
          </div>
          <button onClick={onClose} className={textSub}>
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-3 mb-6">
          <div className={`flex items-start gap-3 ${cardBg} rounded-xl p-3`}>
            <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div>
              <p className={`text-xs ${textSub} font-medium`}>RETIRADA</p>
              <p className={`text-sm font-medium ${textMain} mt-0.5`}>{currentRoute.from}</p>
            </div>
          </div>
          <div className={`flex items-start gap-3 ${cardBg} rounded-xl p-3`}>
            <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <div className="w-3 h-3 rounded-full bg-red-500" />
            </div>
            <div>
              <p className={`text-xs ${textSub} font-medium`}>ENTREGA</p>
              <p className={`text-sm font-medium ${textMain} mt-0.5`}>{currentRoute.to}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mb-6">
          <span className={`${textSub} text-sm`}>Valor da corrida</span>
          <span className={`text-xl font-bold ${textMain}`}>
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(currentRoute.value)}
          </span>
        </div>
        <button
          data-testid="btn-finish-route"
          onClick={() => { finishRoute(); onClose(); }}
          className="w-full py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl transition-colors flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-5 h-5" />
          Finalizar Entrega
        </button>
      </div>
    </div>
  );
}

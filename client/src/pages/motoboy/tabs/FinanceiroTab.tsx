import { useMotoboy } from '@/contexts/MotoboyContext';
import {
  Eye, EyeOff, ArrowDownCircle, Navigation, Clock,
} from 'lucide-react';
import { formatCurrency, formatTime, formatDate } from '../utils/formatters';

export function FinanceiroTab({ isDark }: { isDark: boolean }) {
  const {
    todayEarnings, weekEarnings, totalEntradas,
    completedRoutes, balanceVisible, toggleBalanceVisible,
  } = useMotoboy();

  const bg = isDark ? 'bg-gray-950' : 'bg-gray-50';
  const cardBg = isDark ? 'bg-gray-900' : 'bg-white';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-gray-400' : 'text-gray-500';
  const divide = isDark ? 'divide-gray-800' : 'divide-gray-50';

  const grouped: Record<string, typeof completedRoutes> = {};
  completedRoutes.forEach(r => {
    const label = formatDate(r.completedAt);
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(r);
  });

  return (
    <div className={`flex flex-col gap-4 p-4 pb-4 ${bg} min-h-full`} data-testid="tab-financeiro">
      {/* Header */}
      <div className="flex items-center justify-between pt-1">
        <h1 className={`text-xl font-bold ${textMain}`}>Financeiro</h1>
        <button
          data-testid="btn-toggle-balance-fin"
          onClick={toggleBalanceVisible}
          className={`flex items-center gap-1.5 text-sm ${textSub} hover:text-primary transition-colors`}
        >
          {balanceVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          {balanceVisible ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>

      {/* Top cards row */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`${cardBg} rounded-2xl p-4 shadow-sm`}>
          <p className={`text-xs ${textSub} mb-1`}>Ganhos hoje</p>
          <p className={`text-lg font-bold ${textMain}`} data-testid="text-fin-today">
            {formatCurrency(todayEarnings, balanceVisible)}
          </p>
        </div>
        <div className={`${cardBg} rounded-2xl p-4 shadow-sm`}>
          <p className={`text-xs ${textSub} mb-1`}>Ganhos na semana</p>
          <p className={`text-lg font-bold ${textMain}`} data-testid="text-fin-week">
            {formatCurrency(weekEarnings, balanceVisible)}
          </p>
        </div>
      </div>

      {/* Entradas reais */}
      <div className={`${cardBg} rounded-2xl shadow-sm divide-y ${divide} overflow-hidden`}>
        <div className="flex items-center justify-between px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-500/15 flex items-center justify-center">
              <ArrowDownCircle className="w-5 h-5 text-green-500" />
            </div>
            <div>
              <span className={`text-sm font-medium ${textMain}`}>Total recebido</span>
              <p className={`text-[10px] ${textSub}`}>Soma de todas as corridas concluídas</p>
            </div>
          </div>
          <span className="text-sm font-bold text-green-500" data-testid="text-fin-entradas">
            +{formatCurrency(totalEntradas, balanceVisible)}
          </span>
        </div>
        {completedRoutes.length === 0 && (
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="w-9 h-9 rounded-full bg-gray-500/15 flex items-center justify-center">
              <Navigation className={`w-5 h-5 ${textSub}`} />
            </div>
            <span className={`text-sm ${textSub}`}>Nenhuma corrida concluída ainda</span>
          </div>
        )}
      </div>

      {/* Completed routes history */}
      <div>
        <h2 className={`text-xs font-semibold ${textSub} uppercase tracking-wider mb-3`}>
          Histórico de corridas
        </h2>
        <div className="space-y-4">
          {Object.entries(grouped).map(([date, routes]) => (
            <div key={date}>
              <p className={`text-xs font-semibold ${textSub} mb-2`}>{date}</p>
              <div className={`${cardBg} rounded-2xl shadow-sm divide-y ${divide} overflow-hidden`}>
                {routes.map(r => (
                  <div
                    key={r.id}
                    className="flex items-center gap-3 px-4 py-3.5"
                    data-testid={`route-history-${r.id}`}
                  >
                    <div className="w-9 h-9 rounded-full bg-orange-500/15 flex items-center justify-center flex-shrink-0">
                      <Navigation className="w-4 h-4 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${textMain} truncate`}>{r.to}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock className={`w-3 h-3 ${textSub}`} />
                        <span className={`text-xs ${textSub}`}>{formatTime(r.completedAt)}</span>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-green-500 flex-shrink-0">
                      +{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(r.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

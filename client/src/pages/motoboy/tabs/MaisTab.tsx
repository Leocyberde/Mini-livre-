import { useAuth } from '@/contexts/AuthContext';
import { useMotoboy } from '@/contexts/MotoboyContext';
import { Moon, Sun, LogOut, ChevronRight, Star, Award, Zap } from 'lucide-react';
import { formatMoney } from '../utils/formatters';

export function MaisTab({
  isDark,
  toggleTheme,
  isOnline,
  setIsOnline,
}: {
  isDark: boolean;
  toggleTheme: () => void;
  isOnline: boolean;
  setIsOnline: (v: boolean) => void;
}) {
  const { user, logout } = useAuth();
  const { todayEarnings, deliveriesToday, rating } = useMotoboy();
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const bg = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const border = isDark ? 'border-gray-700' : 'border-gray-200';

  const menuItems = [
    {
      icon: isOnline ? Zap : Zap,
      label: isOnline ? 'Ficar Offline' : 'Ficar Online',
      sublabel: isOnline ? 'Pausar recebimento de corridas' : 'Receber novas corridas',
      onClick: () => setIsOnline(!isOnline),
      iconColor: isOnline ? 'text-green-500' : 'text-gray-400',
    },
    {
      icon: isDark ? Sun : Moon,
      label: isDark ? 'Tema Claro' : 'Tema Escuro',
      sublabel: isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro',
      onClick: toggleTheme,
      iconColor: 'text-yellow-400',
    },
    {
      icon: LogOut,
      label: 'Sair',
      sublabel: 'Encerrar sessão',
      onClick: logout,
      iconColor: 'text-red-500',
    },
  ];

  return (
    <div className={`flex-1 overflow-y-auto px-4 py-4 space-y-4 ${bg}`} data-testid="mais-tab">
      {/* Profile card */}
      <div className={`${cardBg} rounded-2xl p-4`}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-2xl font-bold text-white flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase() || 'M'}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-base ${textMain} truncate`}>{user?.name || 'Motoboy'}</p>
            <p className={`text-sm ${textSub} truncate`}>{user?.email || ''}</p>
            <div className="flex items-center gap-1 mt-1">
              <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
              <span className={`text-sm font-semibold ${textMain}`}>{rating?.toFixed(1) ?? '5.0'}</span>
              <span className={`text-xs ${textSub}`}>· Avaliação</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`${cardBg} rounded-2xl p-4 flex items-center gap-3`}>
          <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
            <Award className="w-4 h-4 text-green-500" />
          </div>
          <div>
            <p className={`text-xs ${textSub} font-medium`}>Ganhos hoje</p>
            <p className={`text-base font-bold ${textMain}`}>{formatMoney(todayEarnings)}</p>
          </div>
        </div>
        <div className={`${cardBg} rounded-2xl p-4 flex items-center gap-3`}>
          <div className="w-8 h-8 rounded-full bg-blue-500/15 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-blue-500" />
          </div>
          <div>
            <p className={`text-xs ${textSub} font-medium`}>Entregas hoje</p>
            <p className={`text-base font-bold ${textMain}`}>{deliveriesToday}</p>
          </div>
        </div>
      </div>

      {/* Menu items */}
      <div className={`${cardBg} rounded-2xl border ${border} divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-200'}`}>
        {menuItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={i}
              data-testid={`mais-menu-item-${i}`}
              onClick={item.onClick}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:opacity-80 transition-opacity"
            >
              <div className="w-8 h-8 rounded-full bg-gray-700/30 flex items-center justify-center flex-shrink-0">
                <Icon className={`w-4 h-4 ${item.iconColor}`} />
              </div>
              <div className="flex-1">
                <p className={`text-sm font-semibold ${textMain}`}>{item.label}</p>
                <p className={`text-xs ${textSub}`}>{item.sublabel}</p>
              </div>
              <ChevronRight className={`w-4 h-4 ${textSub}`} />
            </button>
          );
        })}
      </div>

      {/* Version */}
      <p className={`text-center text-xs ${textSub} pb-2`}>Marketplace Regional v1.0 · Motoboy</p>
    </div>
  );
}

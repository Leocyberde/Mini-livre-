import { useMotoboy } from '@/contexts/MotoboyContext';
import { Badge } from '@/components/ui/badge';
import { Bell, X } from 'lucide-react';
import { formatTime } from '../utils/formatters';

export function NotificationsSheet({ onClose, isDark }: { onClose: () => void; isDark: boolean }) {
  const { notifications, markAllRead, unreadCount } = useMotoboy();
  const bg = isDark ? 'bg-gray-900' : 'bg-white';
  const border = isDark ? 'border-gray-800' : 'border-gray-100';
  const textMain = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-gray-400' : 'text-gray-500';
  const unreadBg = isDark ? 'bg-blue-900/40' : 'bg-blue-50/60';

  return (
    <div className="fixed inset-0 z-[2000] flex flex-col" data-testid="notifications-sheet">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative mt-auto ${bg} rounded-t-2xl max-h-[80vh] flex flex-col shadow-2xl`}>
        <div className={`flex items-center justify-between px-5 pt-5 pb-3 border-b ${border}`}>
          <div className="flex items-center gap-2">
            <Bell className={`w-5 h-5 text-primary`} />
            <h2 className={`font-semibold text-base ${textMain}`}>Notificações</h2>
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white text-xs px-2 py-0.5">{unreadCount}</Badge>
            )}
          </div>
          <div className="flex items-center gap-3">
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary font-medium">
                Marcar todas
              </button>
            )}
            <button onClick={onClose} className={`${textSub} hover:text-gray-400`}>
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className={`overflow-y-auto flex-1 divide-y ${isDark ? 'divide-gray-800' : 'divide-gray-50'}`}>
          {notifications.length === 0 && (
            <div className={`py-12 text-center ${textSub} text-sm`}>Nenhuma notificação</div>
          )}
          {notifications.map(n => (
            <div
              key={n.id}
              className={`px-5 py-4 flex items-start gap-3 ${!n.read ? unreadBg : ''}`}
              data-testid={`notification-item-${n.id}`}
            >
              <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${!n.read ? 'bg-primary' : 'bg-gray-500'}`} />
              <div className="flex-1">
                <p className={`text-sm leading-snug ${!n.read ? `${textMain} font-medium` : textSub}`}>{n.message}</p>
                <p className={`text-xs ${textSub} mt-1`}>{formatTime(n.time)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

import { Bell } from 'lucide-react';
import { AppNotification } from '@/contexts/NotificationContext';
import ReviewRequestCard from './ReviewRequestCard';

interface NotificacoesTabProps {
  clientNotifications: AppNotification[];
  clientUnread: number;
  markAllRead: (target: 'client' | 'seller') => void;
  markRead: (id: string) => void;
}

export default function NotificacoesTab({ clientNotifications, clientUnread, markAllRead, markRead }: NotificacoesTabProps) {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold text-foreground">Notificações</h2>
        {clientUnread > 0 && (
          <button
            onClick={() => markAllRead('client')}
            className="text-xs text-primary font-semibold hover:underline"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      {clientNotifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Bell className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="font-semibold text-foreground">Tudo em dia!</p>
          <p className="text-sm text-muted-foreground mt-1">Nenhuma notificação por enquanto.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {clientNotifications.map(notif => {
            if (notif.type === 'review_request' && notif.metadata) {
              const m = notif.metadata as { orderId?: string; storeId?: string; storeName?: string; productId?: string };
              return (
                <ReviewRequestCard
                  key={notif.id}
                  notifId={notif.id}
                  orderId={m.orderId ?? ''}
                  storeId={m.storeId ?? ''}
                  storeName={m.storeName ?? ''}
                  productId={m.productId ?? ''}
                  timestamp={notif.timestamp}
                  read={notif.read}
                />
              );
            }
            return (
              <div
                key={notif.id}
                onClick={() => markRead(notif.id)}
                className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                  notif.read ? 'bg-white border-border' : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  notif.read ? 'bg-gray-100' : 'bg-blue-100'
                }`}>
                  <span className="text-lg">{notif.icon || '🔔'}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm ${notif.read ? 'text-foreground' : 'text-blue-900'}`}>{notif.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(notif.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {!notif.read && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

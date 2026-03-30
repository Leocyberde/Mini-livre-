import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, Bike, Navigation, Wallet, Bell, Ban, Eye, UserCheck } from 'lucide-react';
import { AdminMotoboy } from '../types';

interface MbListProps {
  mbListWithContext: AdminMotoboy[];
  setSelectedMbId: (id: string | null) => void;
  setMbDetailTab: (t: 'profile' | 'orders') => void;
  setNotifMbDialog: (v: { mbId: string; mbName: string } | null) => void;
  handleMbUnblock: (mbId: string, mbName: string) => void;
  setBlockDialog: (v: { mbId: string; mbName: string } | null) => void;
}

export default function MbList({
  mbListWithContext,
  setSelectedMbId,
  setMbDetailTab,
  setNotifMbDialog,
  handleMbUnblock,
  setBlockDialog,
}: MbListProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
        <Bike className="w-5 h-5" /> Todos os Motoboys ({mbListWithContext.length})
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {mbListWithContext.map(mb => (
          <Card key={mb.id} className="p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{mb.avatar}</div>
                <div>
                  <p className="font-semibold text-foreground">{mb.name}</p>
                  <p className="text-xs text-muted-foreground">{mb.vehicle}</p>
                </div>
              </div>
              <Badge className={
                mb.status === 'available' ? 'bg-green-100 text-green-800' :
                mb.status === 'on_route'  ? 'bg-blue-100 text-blue-800' :
                mb.status === 'blocked'   ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-600'
              }>
                {mb.status === 'available' ? 'Disponível' :
                 mb.status === 'on_route'  ? 'Em rota' :
                 mb.status === 'blocked'   ? 'Bloqueado' : 'Indisponível'}
              </Badge>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-secondary rounded-lg py-2">
                <p className="text-muted-foreground">Hoje</p>
                <p className="font-bold text-foreground">{mb.completedToday}</p>
              </div>
              <div className="bg-secondary rounded-lg py-2">
                <p className="text-muted-foreground">Total</p>
                <p className="font-bold text-foreground">{mb.completedTotal}</p>
              </div>
              <div className="bg-secondary rounded-lg py-2">
                <p className="text-muted-foreground">⭐ Rating</p>
                <p className="font-bold text-yellow-600">{mb.rating.toFixed(1)}</p>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{mb.phone}</span>
            </div>

            {/* Current route */}
            {mb.currentRoute && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2 text-xs">
                <p className="text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1">
                  <Navigation className="w-3.5 h-3.5" /> Em rota
                </p>
                <p className="text-muted-foreground mt-0.5 truncate">{mb.currentRoute.from} → {mb.currentRoute.to}</p>
              </div>
            )}

            {/* Block info */}
            {mb.blockInfo && (
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 text-xs text-red-700 dark:text-red-300">
                <p className="font-medium">🚫 {mb.blockInfo.type === 'permanent' ? 'Bloqueado permanentemente' : `Bloqueado até ${mb.blockInfo.until?.toLocaleString('pt-BR') ?? '?'}`}</p>
                <p className="text-muted-foreground mt-0.5">Motivo: {mb.blockInfo.reason}</p>
              </div>
            )}

            {/* Saldo bonus */}
            {mb.balanceBonus > 0 && (
              <div className="flex items-center gap-1 text-xs text-green-700">
                <Wallet className="w-3.5 h-3.5" /> Bônus acumulado: R$ {mb.balanceBonus.toFixed(2)}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1 mt-auto">
              <Button size="sm" className="flex-1 gap-1"
                onClick={() => { setSelectedMbId(mb.id); setMbDetailTab('profile'); }}
                data-testid={`btn-manage-mb-${mb.id}`}>
                <Eye className="w-3.5 h-3.5" /> Gerenciar
              </Button>
              <Button size="sm" variant="outline" className="gap-1"
                onClick={() => setNotifMbDialog({ mbId: mb.id, mbName: mb.name })}
                data-testid={`btn-notif-mb-${mb.id}`}>
                <Bell className="w-3.5 h-3.5" />
              </Button>
              {mb.status === 'blocked' ? (
                <Button size="sm" variant="outline" className="gap-1 text-green-700 border-green-400"
                  onClick={() => handleMbUnblock(mb.id, mb.name)}
                  data-testid={`btn-unblock-mb-${mb.id}`}>
                  <UserCheck className="w-3.5 h-3.5" />
                </Button>
              ) : (
                <Button size="sm" variant="outline" className="gap-1 text-orange-600 border-orange-400"
                  onClick={() => setBlockDialog({ mbId: mb.id, mbName: mb.name })}
                  data-testid={`btn-block-mb-${mb.id}`}>
                  <Ban className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

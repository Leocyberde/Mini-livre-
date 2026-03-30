import { Card } from '@/components/ui/card';
import { AdminMotoboy } from '../types';

interface MbKpiCardsProps {
  mbListWithContext: AdminMotoboy[];
}

export default function MbKpiCards({ mbListWithContext }: MbKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Card className="p-4 text-center">
        <p className="text-xs text-muted-foreground mb-1">Motoboys ativos</p>
        <p className="text-2xl font-bold text-green-700">{mbListWithContext.filter(m => m.status === 'available' || m.status === 'on_route').length}</p>
      </Card>
      <Card className="p-4 text-center">
        <p className="text-xs text-muted-foreground mb-1">Em rota agora</p>
        <p className="text-2xl font-bold text-blue-700">{mbListWithContext.filter(m => m.status === 'on_route').length}</p>
      </Card>
      <Card className="p-4 text-center">
        <p className="text-xs text-muted-foreground mb-1">Bloqueados</p>
        <p className="text-2xl font-bold text-red-600">{mbListWithContext.filter(m => m.status === 'blocked').length}</p>
      </Card>
      <Card className="p-4 text-center">
        <p className="text-xs text-muted-foreground mb-1">Entregas hoje</p>
        <p className="text-2xl font-bold text-primary">{mbListWithContext.reduce((s, m) => s + m.completedToday, 0)}</p>
      </Card>
    </div>
  );
}

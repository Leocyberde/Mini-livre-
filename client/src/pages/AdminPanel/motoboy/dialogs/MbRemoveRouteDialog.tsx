import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { XCircle } from 'lucide-react';

interface MbRemoveRouteDialogProps {
  removeRouteConfirm: string | null;
  setRemoveRouteConfirm: (v: string | null) => void;
  handleMbRemoveRoute: (mbId: string) => void;
}

export default function MbRemoveRouteDialog({
  removeRouteConfirm,
  setRemoveRouteConfirm,
  handleMbRemoveRoute,
}: MbRemoveRouteDialogProps) {
  return (
    <Dialog open={!!removeRouteConfirm} onOpenChange={open => { if (!open) setRemoveRouteConfirm(null); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" /> Retirar Rota do Motoboy
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground py-2">
          Tem certeza que deseja retirar a rota atual deste motoboy? A entrega em andamento pode ser afetada.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setRemoveRouteConfirm(null)}>Cancelar</Button>
          <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => removeRouteConfirm && handleMbRemoveRoute(removeRouteConfirm)} data-testid="btn-confirm-remove-route">
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

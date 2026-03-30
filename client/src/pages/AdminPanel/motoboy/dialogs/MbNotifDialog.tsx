import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Bell, Send } from 'lucide-react';

interface MbNotifDialogProps {
  notifMbDialog: { mbId: string; mbName: string } | null;
  setNotifMbDialog: (v: { mbId: string; mbName: string } | null) => void;
  notifMbTitle: string;
  setNotifMbTitle: (v: string) => void;
  notifMbBody: string;
  setNotifMbBody: (v: string) => void;
  handleMbSendNotif: () => void;
}

export default function MbNotifDialog({
  notifMbDialog,
  setNotifMbDialog,
  notifMbTitle,
  setNotifMbTitle,
  notifMbBody,
  setNotifMbBody,
  handleMbSendNotif,
}: MbNotifDialogProps) {
  return (
    <Dialog open={!!notifMbDialog} onOpenChange={open => { if (!open) { setNotifMbDialog(null); setNotifMbTitle(''); setNotifMbBody(''); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" /> Enviar Notificação — {notifMbDialog?.mbName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Título</label>
            <Input
              placeholder="Ex: Atenção necessária"
              value={notifMbTitle}
              onChange={e => setNotifMbTitle(e.target.value)}
              data-testid="input-notif-mb-title"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Mensagem</label>
            <Textarea
              placeholder="Escreva a mensagem..."
              value={notifMbBody}
              onChange={e => setNotifMbBody(e.target.value)}
              rows={4}
              data-testid="input-notif-mb-body"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setNotifMbDialog(null)}>Cancelar</Button>
          <Button className="gap-2" onClick={handleMbSendNotif} data-testid="btn-confirm-send-notif">
            <Send className="w-4 h-4" /> Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Ban } from 'lucide-react';

interface MbBlockDialogProps {
  blockDialog: { mbId: string; mbName: string } | null;
  setBlockDialog: (v: { mbId: string; mbName: string } | null) => void;
  blockType: 'permanent' | 'hours' | 'days';
  setBlockType: (v: 'permanent' | 'hours' | 'days') => void;
  blockDuration: string;
  setBlockDuration: (v: string) => void;
  blockReason: string;
  setBlockReason: (v: string) => void;
  handleMbBlock: () => void;
}

export default function MbBlockDialog({
  blockDialog,
  setBlockDialog,
  blockType,
  setBlockType,
  blockDuration,
  setBlockDuration,
  blockReason,
  setBlockReason,
  handleMbBlock,
}: MbBlockDialogProps) {
  return (
    <Dialog open={!!blockDialog} onOpenChange={open => { if (!open) { setBlockDialog(null); setBlockReason(''); setBlockDuration(''); setBlockType('permanent'); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="w-5 h-5 text-red-600" />
            Bloquear Motoboy — {blockDialog?.mbName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Tipo de Bloqueio</label>
            <Select value={blockType} onValueChange={(v: 'permanent' | 'hours' | 'days') => setBlockType(v)}>
              <SelectTrigger data-testid="select-block-type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="permanent">Permanente</SelectItem>
                <SelectItem value="hours">Por horas</SelectItem>
                <SelectItem value="days">Por dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {blockType !== 'permanent' && (
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">
                Duração ({blockType === 'hours' ? 'horas' : 'dias'})
              </label>
              <Input
                type="number"
                min="1"
                placeholder={blockType === 'hours' ? 'Ex: 24' : 'Ex: 7'}
                value={blockDuration}
                onChange={e => setBlockDuration(e.target.value)}
                data-testid="input-block-duration"
              />
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Motivo</label>
            <Textarea
              placeholder="Descreva o motivo do bloqueio..."
              value={blockReason}
              onChange={e => setBlockReason(e.target.value)}
              rows={3}
              data-testid="input-block-reason"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setBlockDialog(null)}>Cancelar</Button>
          <Button className="bg-red-600 hover:bg-red-700 text-white gap-2" onClick={handleMbBlock} data-testid="btn-confirm-block">
            <Ban className="w-4 h-4" /> Bloquear
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

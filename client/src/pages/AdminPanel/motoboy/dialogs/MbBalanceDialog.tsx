import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Wallet, Plus, Minus } from 'lucide-react';

interface MbBalanceDialogProps {
  balanceDialog: { mbId: string; mbName: string } | null;
  setBalanceDialog: (v: { mbId: string; mbName: string } | null) => void;
  balanceAmount: string;
  setBalanceAmount: (v: string) => void;
  balanceType: 'add' | 'deduct';
  setBalanceType: (v: 'add' | 'deduct') => void;
  handleMbBalance: () => void;
}

export default function MbBalanceDialog({
  balanceDialog,
  setBalanceDialog,
  balanceAmount,
  setBalanceAmount,
  balanceType,
  setBalanceType,
  handleMbBalance,
}: MbBalanceDialogProps) {
  return (
    <Dialog open={!!balanceDialog} onOpenChange={open => { if (!open) { setBalanceDialog(null); setBalanceAmount(''); setBalanceType('add'); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            {balanceType === 'add' ? 'Creditar' : 'Debitar'} Saldo — {balanceDialog?.mbName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="flex gap-2">
            <Button size="sm" className={balanceType === 'add' ? 'bg-green-700 text-white' : 'bg-secondary text-foreground'}
              onClick={() => setBalanceType('add')}>
              <Plus className="w-4 h-4 mr-1" /> Creditar
            </Button>
            <Button size="sm" className={balanceType === 'deduct' ? 'bg-red-600 text-white' : 'bg-secondary text-foreground'}
              onClick={() => setBalanceType('deduct')}>
              <Minus className="w-4 h-4 mr-1" /> Debitar
            </Button>
          </div>
          <div>
            <label className="text-sm font-medium text-foreground block mb-1">Valor (R$)</label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0,00"
              value={balanceAmount}
              onChange={e => setBalanceAmount(e.target.value)}
              data-testid="input-balance-amount"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setBalanceDialog(null)}>Cancelar</Button>
          <Button
            className={balanceType === 'add' ? 'bg-green-700 hover:bg-green-800 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
            onClick={handleMbBalance}
            data-testid="btn-confirm-balance">
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

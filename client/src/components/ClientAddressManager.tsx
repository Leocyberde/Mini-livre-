/**
 * ClientAddressManager - Gerenciador de endereços do cliente
 * Permite adicionar, editar, definir principal e remover endereços
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Plus, Star, Trash2, Edit2, Check, X } from 'lucide-react';
import { useProfile, SavedAddress } from '@/contexts/ProfileContext';
import AddressForm from '@/components/AddressForm';
import { AddressForm as AddressFormType } from '@/hooks/useCep';
import { toast } from 'sonner';

const emptyAddress: AddressFormType = {
  cep: '',
  logradouro: '',
  bairro: '',
  cidade: '',
  uf: '',
  numero: '',
  complemento: '',
};

export default function ClientAddressManager() {
  const { clientProfile, addClientAddress, updateClientAddress, removeClientAddress, setPrimaryAddress } = useProfile();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState<AddressFormType>(emptyAddress);
  const [newLabel, setNewLabel] = useState('');
  const [editAddress, setEditAddress] = useState<AddressFormType>(emptyAddress);
  const [editLabel, setEditLabel] = useState('');

  const handleSaveNew = () => {
    if (!newAddress.cep || !newAddress.numero) {
      toast.error('Preencha o CEP e o número do endereço');
      return;
    }
    addClientAddress({
      ...newAddress,
      label: newLabel || `Endereço ${clientProfile.addresses.length + 1}`,
      isPrimary: clientProfile.addresses.length === 0,
    });
    setNewAddress(emptyAddress);
    setNewLabel('');
    setIsAdding(false);
    toast.success('Endereço adicionado com sucesso!');
  };

  const handleStartEdit = (addr: SavedAddress) => {
    setEditingId(addr.id);
    setEditAddress({
      cep: addr.cep,
      logradouro: addr.logradouro,
      bairro: addr.bairro,
      cidade: addr.cidade,
      uf: addr.uf,
      numero: addr.numero,
      complemento: addr.complemento,
    });
    setEditLabel(addr.label);
  };

  const handleSaveEdit = () => {
    if (!editingId) return;
    if (!editAddress.cep || !editAddress.numero) {
      toast.error('Preencha o CEP e o número do endereço');
      return;
    }
    updateClientAddress(editingId, { ...editAddress, label: editLabel });
    setEditingId(null);
    toast.success('Endereço atualizado!');
  };

  const handleRemove = (id: string) => {
    if (window.confirm('Remover este endereço?')) {
      removeClientAddress(id);
      toast.success('Endereço removido.');
    }
  };

  const handleSetPrimary = (id: string) => {
    setPrimaryAddress(id);
    toast.success('Endereço principal definido!');
  };

  const formatFullAddress = (addr: SavedAddress) =>
    `${addr.logradouro}${addr.numero ? `, ${addr.numero}` : ''}${addr.complemento ? ` - ${addr.complemento}` : ''}, ${addr.bairro}, ${addr.cidade} - ${addr.uf}, CEP: ${addr.cep}`;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          Meus Endereços
        </h4>
        {!isAdding && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsAdding(true)}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Endereço
          </Button>
        )}
      </div>

      {/* Lista de endereços */}
      {clientProfile.addresses.length === 0 && !isAdding && (
        <Card className="p-6 text-center text-muted-foreground">
          <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p className="text-sm">Nenhum endereço cadastrado.</p>
          <p className="text-xs mt-1">Adicione um endereço para facilitar seus pedidos.</p>
        </Card>
      )}

      {clientProfile.addresses.map(addr => (
        <Card key={addr.id} className={`p-4 border-2 transition-all ${addr.isPrimary ? 'border-primary' : 'border-border'}`}>
          {editingId === addr.id ? (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Nome do endereço</label>
                <input
                  type="text"
                  value={editLabel}
                  onChange={e => setEditLabel(e.target.value)}
                  placeholder="Ex: Casa, Trabalho..."
                  className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                />
              </div>
              <AddressForm value={editAddress} onChange={setEditAddress} />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSaveEdit} className="gap-2 bg-primary text-white">
                  <Check className="w-4 h-4" /> Salvar
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingId(null)} className="gap-2">
                  <X className="w-4 h-4" /> Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm text-foreground">{addr.label}</span>
                  {addr.isPrimary && (
                    <Badge className="bg-primary/10 text-primary text-xs px-2 py-0.5 flex items-center gap-1">
                      <Star className="w-3 h-3 fill-primary" /> Principal
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed truncate">
                  {formatFullAddress(addr)}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                {!addr.isPrimary && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSetPrimary(addr.id)}
                    title="Definir como principal"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                  >
                    <Star className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleStartEdit(addr)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemove(addr.id)}
                  className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      ))}

      {/* Formulário de novo endereço */}
      {isAdding && (
        <Card className="p-4 border-2 border-dashed border-primary/40">
          <h5 className="text-sm font-semibold text-foreground mb-4">Novo Endereço</h5>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Nome do endereço</label>
              <input
                type="text"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder="Ex: Casa, Trabalho..."
                className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
              />
            </div>
            <AddressForm value={newAddress} onChange={setNewAddress} />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSaveNew} className="gap-2 bg-primary text-white">
                <Check className="w-4 h-4" /> Salvar Endereço
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setIsAdding(false); setNewAddress(emptyAddress); }}
                className="gap-2"
              >
                <X className="w-4 h-4" /> Cancelar
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

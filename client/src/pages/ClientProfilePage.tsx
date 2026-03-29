/**
 * Client Profile Page - Perfil do cliente
 * Features: Dados pessoais, gerenciador de endereços, link para pedidos
 */
import { useProfile } from '@/contexts/ProfileContext';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft, MapPin, Plus, Star, ShoppingBag, Edit2, Trash2,
  User, Mail, Phone, Check, X, ChevronRight,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useState } from 'react';
import { toast } from 'sonner';
import AddressForm from '@/components/AddressForm';
import { AddressForm as AddressFormType } from '@/hooks/useCep';

const emptyAddress: AddressFormType = {
  cep: '', logradouro: '', bairro: '', cidade: '', uf: '', numero: '', complemento: '',
};

export default function ClientProfilePage() {
  const { clientProfile, updateClientProfile, addClientAddress, removeClientAddress, setPrimaryAddress } = useProfile();
  const [, navigate] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddress, setNewAddress] = useState<AddressFormType>(emptyAddress);
  const [newAddressLabel, setNewAddressLabel] = useState('');

  const [formData, setFormData] = useState({
    name: clientProfile.name || '',
    email: clientProfile.email || '',
    phone: clientProfile.phone || '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveProfile = () => {
    if (!formData.name.trim()) { toast.error('Nome é obrigatório'); return; }
    if (!formData.email.trim()) { toast.error('Email é obrigatório'); return; }
    updateClientProfile(formData);
    setIsEditing(false);
    toast.success('Perfil atualizado!');
  };

  const handleSaveNewAddress = () => {
    if (!newAddress.cep || !newAddress.numero) { toast.error('Preencha o CEP e o número'); return; }
    addClientAddress({ ...newAddress, label: newAddressLabel || `Endereço ${clientProfile.addresses.length + 1}`, isPrimary: clientProfile.addresses.length === 0 });
    setShowNewAddressForm(false);
    setNewAddress(emptyAddress);
    setNewAddressLabel('');
    toast.success('Endereço salvo!');
  };

  const handleDeleteAddress = (id: string) => {
    if (window.confirm('Excluir este endereço?')) {
      removeClientAddress(id);
      toast.success('Endereço excluído!');
    }
  };

  const initials = clientProfile.name
    ? clientProfile.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-8">

      {/* ── Top bar ── */}
      <div className="bg-white border-b border-border px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button
          onClick={() => navigate('/?tab=mais')}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-secondary hover:bg-muted transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <h1 className="font-bold text-lg text-foreground">Meu Perfil</h1>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">

        {/* ── Avatar + Name card ── */}
        <div className="bg-gradient-to-r from-primary to-[#3B82F6] rounded-2xl p-5 flex items-center gap-4 text-white">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-white">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-lg leading-tight truncate">{clientProfile.name || 'Sem nome'}</p>
            <p className="text-blue-200 text-sm truncate">{clientProfile.email || 'Sem email'}</p>
            {clientProfile.phone && <p className="text-blue-200 text-sm">{clientProfile.phone}</p>}
          </div>
        </div>

        {/* ── Quick actions ── */}
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-border">
          <button
            onClick={() => navigate('/pedidos')}
            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-secondary/50 transition-colors"
            data-testid="btn-meus-pedidos-perfil"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-sm text-foreground flex-1 text-left">Meus Pedidos</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* ── Profile Section ── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3.5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              <p className="font-semibold text-sm text-foreground">Dados Pessoais</p>
            </div>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
                data-testid="btn-edit-profile"
              >
                <Edit2 className="w-3.5 h-3.5" /> Editar
              </button>
            ) : (
              <button
                onClick={() => { setIsEditing(false); setFormData({ name: clientProfile.name || '', email: clientProfile.email || '', phone: clientProfile.phone || '' }); }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nome completo</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input name="name" value={formData.name} onChange={handleInputChange} className="pl-9 rounded-xl" placeholder="Seu nome" data-testid="input-profile-name" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input name="email" type="email" value={formData.email} onChange={handleInputChange} className="pl-9 rounded-xl" placeholder="seu@email.com" data-testid="input-profile-email" />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Telefone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input name="phone" value={formData.phone} onChange={handleInputChange} className="pl-9 rounded-xl" placeholder="(11) 99999-9999" data-testid="input-profile-phone" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={handleSaveProfile} className="flex-1 bg-primary text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-1.5" data-testid="btn-save-profile">
                  <Check className="w-4 h-4" /> Salvar
                </button>
                <button onClick={() => { setIsEditing(false); setFormData({ name: clientProfile.name || '', email: clientProfile.email || '', phone: clientProfile.phone || '' }); }} className="px-4 border border-border text-sm font-semibold rounded-xl hover:bg-secondary transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Nome</p>
                  <p className="font-medium text-sm text-foreground">{clientProfile.name || 'Não informado'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium text-sm text-foreground">{clientProfile.email || 'Não informado'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Telefone</p>
                  <p className="font-medium text-sm text-foreground">{clientProfile.phone || 'Não informado'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Addresses Section ── */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3.5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <p className="font-semibold text-sm text-foreground">Meus Endereços</p>
            </div>
            {!showNewAddressForm && (
              <button
                onClick={() => setShowNewAddressForm(true)}
                className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline"
                data-testid="btn-add-address"
              >
                <Plus className="w-3.5 h-3.5" /> Novo
              </button>
            )}
          </div>

          <div className="p-4 space-y-3">
            {/* New address form */}
            {showNewAddressForm && (
              <div className="border border-dashed border-primary/40 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm text-foreground">Novo Endereço</p>
                  <button onClick={() => { setShowNewAddressForm(false); setNewAddress(emptyAddress); setNewAddressLabel(''); }} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nome do endereço</label>
                  <input type="text" value={newAddressLabel} onChange={e => setNewAddressLabel(e.target.value)} placeholder="Ex: Casa, Trabalho..." className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" data-testid="input-new-address-label" />
                </div>
                <AddressForm value={newAddress} onChange={setNewAddress} />
                <div className="flex gap-2 pt-1">
                  <button onClick={handleSaveNewAddress} className="flex-1 bg-primary text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-primary/90 transition-colors" data-testid="btn-save-new-address">
                    Salvar Endereço
                  </button>
                  <button onClick={() => { setShowNewAddressForm(false); setNewAddress(emptyAddress); setNewAddressLabel(''); }} className="px-4 border border-border text-sm font-semibold rounded-xl hover:bg-secondary transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Empty state */}
            {clientProfile.addresses.length === 0 && !showNewAddressForm && (
              <div className="text-center py-8">
                <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MapPin className="w-7 h-7 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-foreground">Nenhum endereço cadastrado</p>
                <p className="text-xs text-muted-foreground mt-1">Adicione um endereço para agilizar suas entregas.</p>
                <button onClick={() => setShowNewAddressForm(true)} className="mt-3 bg-primary/10 text-primary text-sm font-semibold px-4 py-2 rounded-xl hover:bg-primary/20 transition-colors" data-testid="btn-add-first-address">
                  + Adicionar endereço
                </button>
              </div>
            )}

            {/* Address list */}
            {clientProfile.addresses.map(addr => (
              <div
                key={addr.id}
                className={`rounded-xl border-2 p-3.5 transition-all ${addr.isPrimary ? 'border-primary bg-primary/5' : 'border-border'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${addr.isPrimary ? 'bg-primary text-white' : 'bg-gray-100 text-muted-foreground'}`}>
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-foreground">{addr.label}</span>
                        {addr.isPrimary && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                            <Star className="w-2.5 h-2.5 fill-primary" /> Principal
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {addr.logradouro}{addr.numero ? `, ${addr.numero}` : ''}{addr.complemento ? ` - ${addr.complemento}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {addr.bairro}, {addr.cidade}/{addr.uf} — CEP {addr.cep}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!addr.isPrimary && (
                      <button
                        onClick={() => { setPrimaryAddress(addr.id); toast.success('Endereço principal atualizado!'); }}
                        className="text-xs text-primary font-semibold hover:underline px-1"
                        data-testid={`btn-set-primary-${addr.id}`}
                      >
                        Principal
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-xl text-destructive hover:bg-red-50 transition-colors"
                      data-testid={`btn-delete-address-${addr.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

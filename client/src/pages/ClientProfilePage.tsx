/**
 * Client Profile Page - Perfil do cliente
 * Features: Dados pessoais, gerenciador de endereços, link para pedidos
 */
import { useProfile } from '@/contexts/ProfileContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Plus, Star, ShoppingBag, Edit2, Trash2 } from 'lucide-react';
import { Link } from 'wouter';
import { useState } from 'react';
import { toast } from 'sonner';
import AddressForm from '@/components/AddressForm';
import { AddressForm as AddressFormType } from '@/hooks/useCep';

const emptyAddress: AddressFormType = {
  cep: '', logradouro: '', bairro: '', cidade: '', uf: '', numero: '', complemento: '',
};

export default function ClientProfilePage() {
  const { clientProfile, updateClientProfile, addClientAddress, removeClientAddress, setPrimaryAddress } = useProfile();
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
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!formData.email.trim()) {
      toast.error('Email é obrigatório');
      return;
    }
    updateClientProfile(formData);
    setIsEditing(false);
    toast.success('Perfil atualizado com sucesso!');
  };

  const handleSaveNewAddress = () => {
    if (!newAddress.cep || !newAddress.numero) {
      toast.error('Preencha o CEP e o número');
      return;
    }
    addClientAddress({
      ...newAddress,
      label: newAddressLabel || `Endereço ${clientProfile.addresses.length + 1}`,
      isPrimary: clientProfile.addresses.length === 0,
    });
    setShowNewAddressForm(false);
    setNewAddress(emptyAddress);
    setNewAddressLabel('');
    toast.success('Endereço salvo com sucesso!');
  };

  const handleDeleteAddress = (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este endereço?')) {
      removeClientAddress(id);
      toast.success('Endereço excluído!');
    }
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <Link href="/">
          <Button variant="ghost" className="gap-2 mb-8">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sidebar - Quick Links */}
          <div className="lg:col-span-1">
            <Card className="p-6 space-y-3 sticky top-24">
              <h3 className="font-semibold text-foreground mb-4">Menu Rápido</h3>
              <Link href="/perfil">
                <Button variant="outline" className="w-full justify-start gap-2 bg-primary/5 border-primary/20">
                  <Edit2 className="w-4 h-4" />
                  Meu Perfil
                </Button>
              </Link>
              <Link href="/pedidos">
                <Button variant="outline" className="w-full justify-start gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  Meus Pedidos
                </Button>
              </Link>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Profile Section */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-display font-bold text-foreground">Meu Perfil</h2>
                {!isEditing && (
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(true)} className="gap-2">
                    <Edit2 className="w-4 h-4" />
                    Editar
                  </Button>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Nome</label>
                    <Input
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                    <Input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Telefone</label>
                    <Input
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="(11) 99999-9999"
                      className="bg-secondary border-border"
                    />
                  </div>
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSaveProfile} className="bg-primary text-white gap-2">
                      Salvar
                    </Button>
                    <Button variant="outline" onClick={() => { setIsEditing(false); setFormData({ name: clientProfile.name || '', email: clientProfile.email || '', phone: clientProfile.phone || '' }); }}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Nome</p>
                      <p className="font-medium text-foreground">{clientProfile.name || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Email</p>
                      <p className="font-medium text-foreground">{clientProfile.email || 'Não informado'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Telefone</p>
                      <p className="font-medium text-foreground">{clientProfile.phone || 'Não informado'}</p>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Addresses Section */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
                  <MapPin className="w-6 h-6 text-primary" />
                  Meus Endereços
                </h2>
                {!showNewAddressForm && (
                  <Button size="sm" variant="outline" onClick={() => setShowNewAddressForm(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Novo
                  </Button>
                )}
              </div>

              {/* New Address Form */}
              {showNewAddressForm && (
                <div className="border border-dashed border-primary/40 rounded-lg p-4 mb-6 space-y-4">
                  <h4 className="text-sm font-semibold text-foreground">Novo Endereço</h4>
                  <div>
                    <label className="text-xs font-medium text-foreground mb-1 block">Nome do endereço</label>
                    <input
                      type="text"
                      value={newAddressLabel}
                      onChange={e => setNewAddressLabel(e.target.value)}
                      placeholder="Ex: Casa, Trabalho..."
                      className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background"
                    />
                  </div>
                  <AddressForm value={newAddress} onChange={setNewAddress} />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveNewAddress} className="bg-primary text-white gap-2">
                      Salvar Endereço
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setShowNewAddressForm(false); setNewAddress(emptyAddress); setNewAddressLabel(''); }}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {/* Addresses List */}
              {clientProfile.addresses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhum endereço cadastrado</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clientProfile.addresses.map(addr => (
                    <div key={addr.id} className={`p-4 rounded-lg border-2 transition-all ${addr.isPrimary ? 'border-primary bg-primary/5' : 'border-border'}`}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-foreground">{addr.label}</span>
                            {addr.isPrimary && (
                              <Badge className="bg-primary/10 text-primary text-xs px-1.5 py-0 flex items-center gap-1">
                                <Star className="w-2.5 h-2.5 fill-primary" /> Principal
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {addr.logradouro}{addr.numero ? `, ${addr.numero}` : ''} {addr.complemento ? `- ${addr.complemento}` : ''}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {addr.bairro}, {addr.cidade}/{addr.uf} - CEP {addr.cep}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          {!addr.isPrimary && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setPrimaryAddress(addr.id);
                                toast.success('Endereço principal atualizado!');
                              }}
                              className="text-xs"
                            >
                              Definir como principal
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteAddress(addr.id)}
                            className="text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

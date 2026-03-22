/**
 * SellerProfilePage - Página de perfil do logista
 * Permite editar dados da loja e endereço via CEP automático
 */
import { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Store, Save, MapPin, Phone, Mail, Tag, AlignLeft, Camera, Upload } from 'lucide-react';
import { useProfile, SavedAddress } from '@/contexts/ProfileContext';
import AddressForm from '@/components/AddressForm';
import { AddressForm as AddressFormType } from '@/hooks/useCep';
import { toast } from 'sonner';

const STORE_CATEGORIES = [
  'Eletrônicos', 'Papelaria', 'Bebidas', 'Alimentos', 'Livros', 'Moda',
  'Farmácia', 'Mercado', 'Restaurante', 'Serviços', 'Outros',
];

const emptyAddress: AddressFormType = {
  cep: '', logradouro: '', bairro: '', cidade: '', uf: '', numero: '', complemento: '',
};

export default function SellerProfilePage({ onBack }: { onBack?: () => void }) {
  const { sellerProfile, updateSellerProfile } = useProfile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    storeName: sellerProfile.storeName,
    storeDescription: sellerProfile.storeDescription,
    storeCategory: sellerProfile.storeCategory,
    storeLogo: sellerProfile.storeLogo,
    storePhone: sellerProfile.storePhone,
    storeEmail: sellerProfile.storeEmail,
  });

  const [address, setAddress] = useState<AddressFormType>(
    sellerProfile.address
      ? {
          cep: sellerProfile.address.cep,
          logradouro: sellerProfile.address.logradouro,
          bairro: sellerProfile.address.bairro,
          cidade: sellerProfile.address.cidade,
          uf: sellerProfile.address.uf,
          numero: sellerProfile.address.numero,
          complemento: sellerProfile.address.complemento,
        }
      : emptyAddress
  );

  const isPhotoUrl = form.storeLogo && (form.storeLogo.startsWith('data:') || form.storeLogo.startsWith('http'));

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem válida.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setForm(f => ({ ...f, storeLogo: dataUrl }));
      toast.success('Foto carregada com sucesso!');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!form.storeName.trim()) {
      toast.error('Informe o nome da loja');
      return;
    }

    const savedAddress: SavedAddress | null =
      address.cep && address.numero
        ? {
            id: 'seller-addr',
            label: 'Endereço da Loja',
            isPrimary: true,
            ...address,
          }
        : null;

    updateSellerProfile({ ...form, address: savedAddress });
    toast.success('Perfil da loja atualizado com sucesso!');
    if (onBack) onBack();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-14 h-14 rounded-full overflow-hidden flex items-center justify-center bg-secondary border-2 border-border">
          {isPhotoUrl ? (
            <img src={form.storeLogo} alt={form.storeName} className="w-full h-full object-cover" />
          ) : (
            <span className="text-3xl">{form.storeLogo || '🏪'}</span>
          )}
        </div>
        <div>
          <h3 className="text-xl font-bold text-foreground">Perfil da Loja</h3>
          <p className="text-sm text-muted-foreground">Edite as informações da sua loja</p>
        </div>
      </div>

      {/* Informações básicas */}
      <Card className="p-6">
        <h4 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <Store className="w-4 h-4 text-primary" />
          Informações da Loja
        </h4>
        <div className="space-y-4">
          {/* Nome */}
          <div>
            <Label className="text-sm font-medium text-foreground mb-1 block">
              Nome da Loja <span className="text-destructive">*</span>
            </Label>
            <Input
              type="text"
              placeholder="Nome da sua loja"
              value={form.storeName}
              onChange={e => setForm(f => ({ ...f, storeName: e.target.value }))}
            />
          </div>

          {/* Descrição */}
          <div>
            <Label className="text-sm font-medium text-foreground mb-1 block flex items-center gap-1">
              <AlignLeft className="w-3 h-3" /> Descrição
            </Label>
            <textarea
              placeholder="Descreva sua loja..."
              value={form.storeDescription}
              onChange={e => setForm(f => ({ ...f, storeDescription: e.target.value }))}
              rows={3}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Categoria */}
          <div>
            <Label className="text-sm font-medium text-foreground mb-1 block flex items-center gap-1">
              <Tag className="w-3 h-3" /> Categoria
            </Label>
            <select
              value={form.storeCategory}
              onChange={e => setForm(f => ({ ...f, storeCategory: e.target.value }))}
              className="w-full border border-border rounded-md px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {STORE_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Foto da Loja via Upload */}
          <div>
            <Label className="text-sm font-medium text-foreground mb-2 block flex items-center gap-1">
              <Camera className="w-3 h-3" /> Foto da Loja
            </Label>
            <div className="flex items-center gap-4">
              {/* Preview */}
              <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-border bg-secondary flex items-center justify-center flex-shrink-0">
                {isPhotoUrl ? (
                  <img src={form.storeLogo} alt="Foto da loja" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              {/* Upload Button */}
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="w-4 h-4" />
                  {isPhotoUrl ? 'Trocar Foto' : 'Adicionar Foto'}
                </Button>
                {isPhotoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive text-xs"
                    onClick={() => setForm(f => ({ ...f, storeLogo: '🏪' }))}
                  >
                    Remover foto
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">JPG, PNG ou GIF. Máx. 5MB.</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
        </div>
      </Card>

      {/* Contato */}
      <Card className="p-6">
        <h4 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <Phone className="w-4 h-4 text-primary" />
          Contato
        </h4>
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-foreground mb-1 block flex items-center gap-1">
              <Phone className="w-3 h-3" /> Telefone
            </Label>
            <Input
              type="tel"
              placeholder="(00) 00000-0000"
              value={form.storePhone}
              onChange={e => setForm(f => ({ ...f, storePhone: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-sm font-medium text-foreground mb-1 block flex items-center gap-1">
              <Mail className="w-3 h-3" /> E-mail
            </Label>
            <Input
              type="email"
              placeholder="contato@sualoja.com"
              value={form.storeEmail}
              onChange={e => setForm(f => ({ ...f, storeEmail: e.target.value }))}
            />
          </div>
        </div>
      </Card>

      {/* Endereço */}
      <Card className="p-6">
        <h4 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" />
          Endereço da Loja
        </h4>
        <p className="text-xs text-muted-foreground mb-4">
          O endereço da loja é usado para calcular a taxa de entrega ao cliente.
        </p>
        <AddressForm value={address} onChange={setAddress} />
      </Card>

      {/* Botão salvar */}
      <div className="flex gap-3">
        <Button
          onClick={handleSave}
          className="gap-2 bg-primary hover:bg-primary/90 text-white flex-1"
        >
          <Save className="w-4 h-4" />
          Salvar Perfil
        </Button>
        {onBack && (
          <Button variant="outline" onClick={onBack} className="flex-1">
            Cancelar
          </Button>
        )}
      </div>
    </div>
  );
}

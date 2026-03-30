import {
  ChevronRight, Bell, ShoppingCart as CartIcon,
  ClipboardList, User, X, Store, Bike, Loader2, Headphones,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { UserMode } from '@/contexts/MarketplaceContext';

interface UserAddress {
  logradouro?: string;
  cep?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
}

interface AuthUser {
  name?: string;
  email?: string;
  address?: UserAddress;
}

interface StoreForm {
  cnpj: string;
  storeName: string;
  storeDescription: string;
  storeCategory: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  useExistingAddress: boolean;
}

interface MotoboyForm {
  vehicle: string;
  licensePlate: string;
  agreed: boolean;
}

interface MaisTabProps {
  user: AuthUser | null;
  hasRole: (role: UserMode) => boolean;
  clientUnread: number;
  markAllRead: (target: 'client' | 'seller') => void;
  navigate: (to: string) => void;
  showCreateStore: boolean;
  setShowCreateStore: (v: boolean) => void;
  showBecomeMotoboy: boolean;
  setShowBecomeMotoboy: (v: boolean) => void;
  storeLoading: boolean;
  storeForm: StoreForm;
  setStoreForm: (fn: (prev: StoreForm) => StoreForm) => void;
  handleCreateStore: (e: React.FormEvent) => void;
  handleStoreCepBlur: () => void;
  cepLoading: boolean;
  formatCep: (v: string) => string;
  motoboyLoading: boolean;
  motoboyForm: MotoboyForm;
  setMotoboyForm: (fn: (prev: MotoboyForm) => MotoboyForm) => void;
  handleBecomeMotoboy: () => void;
}

export default function MaisTab({
  user, hasRole, clientUnread, markAllRead, navigate,
  showCreateStore, setShowCreateStore,
  showBecomeMotoboy, setShowBecomeMotoboy,
  storeLoading, storeForm, setStoreForm, handleCreateStore, handleStoreCepBlur, cepLoading, formatCep,
  motoboyLoading, motoboyForm, setMotoboyForm, handleBecomeMotoboy,
}: MaisTabProps) {
  return (
    <>
      <div className="px-4 py-6 max-w-md mx-auto">
        {/* Profile card */}
        <div className="bg-gradient-to-r from-primary to-[#3B82F6] rounded-2xl p-5 mb-5 text-white flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <User className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-lg leading-tight truncate">
              {user?.name || 'Cliente'}
            </p>
            <p className="text-blue-200 text-sm truncate">{user?.email || 'Bem-vindo!'}</p>
          </div>
          <button
            onClick={() => navigate('/perfil')}
            className="bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-all flex-shrink-0"
            data-testid="btn-ver-perfil"
          >
            Ver perfil
          </button>
        </div>

        {/* Actions grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => navigate('/pedidos')}
            className="bg-white rounded-2xl p-4 flex flex-col items-start gap-3 hover:shadow-md transition-all border border-border active:scale-[0.98]"
            data-testid="btn-meus-pedidos"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <p className="font-semibold text-sm text-foreground">Meus Pedidos</p>
          </button>

          <button
            onClick={() => navigate('/cart')}
            className="bg-white rounded-2xl p-4 flex flex-col items-start gap-3 hover:shadow-md transition-all border border-border active:scale-[0.98]"
            data-testid="btn-carrinho-mais"
          >
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <CartIcon className="w-5 h-5 text-green-600" />
            </div>
            <p className="font-semibold text-sm text-foreground">Carrinho</p>
          </button>

          <button
            onClick={() => { markAllRead('client'); navigate('/app?tab=notificacoes'); }}
            className="bg-white rounded-2xl p-4 flex flex-col items-start gap-3 hover:shadow-md transition-all border border-border active:scale-[0.98] relative"
            data-testid="btn-notifications-client"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center relative">
              <Bell className="w-5 h-5 text-amber-600" />
              {clientUnread > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {clientUnread > 9 ? '9+' : clientUnread}
                </span>
              )}
            </div>
            <p className="font-semibold text-sm text-foreground">Notificações</p>
          </button>

          <button
            onClick={() => navigate('/app?tab=suporte')}
            className="bg-white rounded-2xl p-4 flex flex-col items-start gap-3 hover:shadow-md transition-all border border-border active:scale-[0.98]"
            data-testid="btn-suporte"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Headphones className="w-5 h-5 text-purple-600" />
            </div>
            <p className="font-semibold text-sm text-foreground">Suporte</p>
          </button>
        </div>

        {/* Expand roles section */}
        <div className="mt-5 border-t border-border pt-5 space-y-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Expandir acesso</p>
          {!hasRole('seller') && (
            <button
              data-testid="btn-criar-loja"
              onClick={() => setShowCreateStore(true)}
              className="w-full flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-4 hover:bg-emerald-100 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Store className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm text-emerald-800">Criar minha loja</p>
                  <p className="text-xs text-emerald-600">Venda seus produtos na plataforma</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-emerald-500" />
            </button>
          )}
          {!hasRole('motoboy') && (
            <button
              data-testid="btn-virar-motoboy"
              onClick={() => setShowBecomeMotoboy(true)}
              className="w-full flex items-center justify-between bg-orange-50 border border-orange-200 rounded-2xl px-4 py-4 hover:bg-orange-100 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Bike className="w-5 h-5 text-orange-500" />
                </div>
                <div className="text-left">
                  <p className="font-semibold text-sm text-orange-800">Quero ser entregador</p>
                  <p className="text-xs text-orange-600">Faça entregas e ganhe dinheiro</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-orange-400" />
            </button>
          )}
        </div>
      </div>

      {/* ── MODAL: Criar Loja ── */}
      {showCreateStore && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-2 sticky top-0 bg-white">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            <div className="flex items-center justify-between px-5 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Store className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Criar minha loja</h3>
                  <p className="text-xs text-muted-foreground">Preencha os dados da sua loja</p>
                </div>
              </div>
              <button onClick={() => setShowCreateStore(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-muted-foreground hover:bg-gray-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateStore} className="p-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="store-name">Nome da loja *</Label>
                <Input id="store-name" placeholder="Ex: Padaria do João" value={storeForm.storeName} onChange={e => setStoreForm(p => ({ ...p, storeName: e.target.value }))} required data-testid="input-store-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-cnpj">CNPJ</Label>
                <Input id="store-cnpj" placeholder="00.000.000/0000-00" value={storeForm.cnpj} onChange={e => setStoreForm(p => ({ ...p, cnpj: e.target.value }))} data-testid="input-store-cnpj" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-category">Categoria</Label>
                <Input id="store-category" placeholder="Ex: Alimentos, Eletrônicos..." value={storeForm.storeCategory} onChange={e => setStoreForm(p => ({ ...p, storeCategory: e.target.value }))} data-testid="input-store-category" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-description">Descrição</Label>
                <Input id="store-description" placeholder="Descreva sua loja brevemente" value={storeForm.storeDescription} onChange={e => setStoreForm(p => ({ ...p, storeDescription: e.target.value }))} data-testid="input-store-description" />
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-sm font-semibold text-foreground mb-3">Endereço da loja</p>
                {user?.address?.logradouro && (
                  <label className="flex items-center gap-2 mb-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={storeForm.useExistingAddress}
                      onChange={e => setStoreForm(p => ({ ...p, useExistingAddress: e.target.checked }))}
                      data-testid="checkbox-use-existing-address"
                    />
                    <span className="text-sm text-foreground">Usar meu endereço cadastrado</span>
                  </label>
                )}
                {!storeForm.useExistingAddress && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <Label htmlFor="store-cep">CEP</Label>
                      <Input id="store-cep" placeholder="00000-000" value={storeForm.cep} onChange={e => setStoreForm(p => ({ ...p, cep: formatCep(e.target.value) }))} onBlur={handleStoreCepBlur} maxLength={9} data-testid="input-store-cep" />
                      {cepLoading && <p className="text-xs text-muted-foreground">Buscando...</p>}
                    </div>
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <Label htmlFor="store-numero">Número</Label>
                      <Input id="store-numero" placeholder="123" value={storeForm.numero} onChange={e => setStoreForm(p => ({ ...p, numero: e.target.value }))} data-testid="input-store-numero" />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label htmlFor="store-logradouro">Rua</Label>
                      <Input id="store-logradouro" placeholder="Rua..." value={storeForm.logradouro} onChange={e => setStoreForm(p => ({ ...p, logradouro: e.target.value }))} data-testid="input-store-logradouro" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="store-bairro">Bairro</Label>
                      <Input id="store-bairro" placeholder="Centro" value={storeForm.bairro} onChange={e => setStoreForm(p => ({ ...p, bairro: e.target.value }))} data-testid="input-store-bairro" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="store-cidade">Cidade</Label>
                      <Input id="store-cidade" placeholder="São Paulo" value={storeForm.cidade} onChange={e => setStoreForm(p => ({ ...p, cidade: e.target.value }))} data-testid="input-store-cidade" />
                    </div>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={storeLoading} data-testid="btn-confirm-create-store">
                {storeLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {storeLoading ? 'Criando loja...' : 'Criar loja'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Virar Motoboy ── */}
      {showBecomeMotoboy && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-2 sticky top-0 bg-white">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            <div className="flex items-center justify-between px-5 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Bike className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Quero ser entregador</h3>
                  <p className="text-xs text-muted-foreground">Leia as regras antes de continuar</p>
                </div>
              </div>
              <button onClick={() => setShowBecomeMotoboy(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-muted-foreground hover:bg-gray-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Suas informações</p>
                <div className="space-y-2">
                  <Label htmlFor="motoboy-vehicle">Veículo</Label>
                  <Input id="motoboy-vehicle" placeholder="Ex: Moto Honda CG 160" value={motoboyForm.vehicle} onChange={e => setMotoboyForm(p => ({ ...p, vehicle: e.target.value }))} data-testid="input-motoboy-vehicle" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="motoboy-plate">Placa</Label>
                  <Input id="motoboy-plate" placeholder="ABC-1234" value={motoboyForm.licensePlate} onChange={e => setMotoboyForm(p => ({ ...p, licensePlate: e.target.value }))} data-testid="input-motoboy-plate" />
                </div>
              </div>
              <div className="bg-muted rounded-xl p-4 text-sm text-muted-foreground space-y-1">
                <p>• Você deve ter CNH válida</p>
                <p>• O veículo deve estar regularizado</p>
                <p>• Entregas no raio de até 3 km da loja</p>
                <p>• Pagamento calculado pela distância percorrida</p>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={motoboyForm.agreed}
                  onChange={e => setMotoboyForm(p => ({ ...p, agreed: e.target.checked }))}
                  className="mt-0.5"
                  data-testid="checkbox-motoboy-agree"
                />
                <span className="text-sm text-foreground">Li e aceito as regras e condições para ser um entregador parceiro.</span>
              </label>
              <Button
                onClick={handleBecomeMotoboy}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                disabled={motoboyLoading || !motoboyForm.agreed}
                data-testid="btn-confirm-become-motoboy"
              >
                {motoboyLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {motoboyLoading ? 'Cadastrando...' : 'Quero ser entregador'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

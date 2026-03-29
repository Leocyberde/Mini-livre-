import { useState, useEffect, ReactNode } from 'react';
import { usePromotions, Promotion, PromotionStatus, getPromotionStatus } from '@/contexts/PromotionsContext';
import { useProducts } from '@/contexts/ProductContext';
import { useProfile } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tag, Plus, Edit2, Trash2, Clock, Calendar, ChevronDown, ChevronUp,
  Percent, DollarSign, ShoppingCart, Truck, X, ToggleLeft, ToggleRight,
  AlertCircle, CheckCircle2, Timer, Ban,
} from 'lucide-react';
import { toast } from 'sonner';

type TabFilter = 'all' | 'active' | 'scheduled' | 'expired' | 'inactive';

const TYPE_LABELS: Record<string, string> = {
  percentage: 'Desconto %',
  fixed: 'Desconto fixo (R$)',
  buy_x_get_y: 'Leve X Pague Y',
  free_shipping: 'Frete grátis',
};

const APPLY_LABELS: Record<string, string> = {
  all: 'Todos os produtos',
  category: 'Categoria',
  specific: 'Produtos específicos',
};

const STATUS_CONFIG: Record<PromotionStatus, { label: string; color: string; icon: ReactNode }> = {
  active:    { label: 'Ativa',     color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="w-3 h-3" /> },
  scheduled: { label: 'Agendada', color: 'bg-blue-100 text-blue-700',       icon: <Timer className="w-3 h-3" /> },
  expired:   { label: 'Encerrada', color: 'bg-gray-100 text-gray-500',      icon: <Ban className="w-3 h-3" /> },
  inactive:  { label: 'Inativa',   color: 'bg-amber-100 text-amber-700',    icon: <ToggleLeft className="w-3 h-3" /> },
};

function formatDateTime(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function toLocalDatetimeValue(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface FormState {
  title: string;
  description: string;
  type: Promotion['type'];
  value: string;
  minOrderValue: string;
  applyTo: Promotion['applyTo'];
  productIds: string[];
  category: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  buyQuantity: string;
  getQuantity: string;
}

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  type: 'percentage',
  value: '',
  minOrderValue: '',
  applyTo: 'all',
  productIds: [],
  category: '',
  startsAt: '',
  endsAt: '',
  isActive: true,
  buyQuantity: '2',
  getQuantity: '1',
};

function promoToForm(p: Promotion): FormState {
  return {
    title: p.title,
    description: p.description,
    type: p.type,
    value: String(p.value),
    minOrderValue: p.minOrderValue > 0 ? String(p.minOrderValue) : '',
    applyTo: p.applyTo,
    productIds: p.productIds,
    category: p.category,
    startsAt: toLocalDatetimeValue(p.startsAt),
    endsAt: toLocalDatetimeValue(p.endsAt),
    isActive: p.isActive,
    buyQuantity: String(p.buyQuantity),
    getQuantity: String(p.getQuantity),
  };
}

const CATEGORIES = ['Alimentos', 'Bebidas', 'Limpeza', 'Higiene', 'Eletrônicos', 'Roupas', 'Outros'];

export default function PromotionsScreen({ onBack }: { onBack: () => void }) {
  const { sellerProfile } = useProfile();
  const { promotions, isLoading, fetchPromotions, createPromotion, updatePromotion, deletePromotion } = usePromotions();
  const { products } = useProducts();
  const storeId = sellerProfile.storeId || 'store-1';

  const [tab, setTab] = useState<TabFilter>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchPromotions(storeId);
  }, [storeId]);

  const storeProducts = products.filter(p => p.storeId === storeId || !p.storeId);

  const filtered = promotions.filter(p => {
    if (tab === 'all') return true;
    return getPromotionStatus(p) === tab;
  });

  const counts: Record<TabFilter, number> = {
    all: promotions.length,
    active: promotions.filter(p => getPromotionStatus(p) === 'active').length,
    scheduled: promotions.filter(p => getPromotionStatus(p) === 'scheduled').length,
    expired: promotions.filter(p => getPromotionStatus(p) === 'expired').length,
    inactive: promotions.filter(p => getPromotionStatus(p) === 'inactive').length,
  };

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  }

  function openEdit(promo: Promotion) {
    setForm(promoToForm(promo));
    setEditingId(promo.id);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  async function handleSave() {
    if (!form.title.trim()) { toast.error('Título é obrigatório'); return; }
    if (!form.startsAt) { toast.error('Data de início é obrigatória'); return; }
    if (!form.endsAt) { toast.error('Data de término é obrigatória'); return; }
    if (new Date(form.startsAt) >= new Date(form.endsAt)) { toast.error('A data de início deve ser antes do término'); return; }
    if (form.type !== 'free_shipping' && form.type !== 'buy_x_get_y' && (!form.value || Number(form.value) <= 0)) {
      toast.error('Informe um valor de desconto válido'); return;
    }
    setSaving(true);
    try {
      const payload = {
        storeId,
        title: form.title.trim(),
        description: form.description.trim(),
        type: form.type,
        value: Number(form.value) || 0,
        minOrderValue: Number(form.minOrderValue) || 0,
        applyTo: form.applyTo,
        productIds: form.productIds,
        category: form.category,
        startsAt: new Date(form.startsAt).toISOString(),
        endsAt: new Date(form.endsAt).toISOString(),
        isActive: form.isActive,
        buyQuantity: Number(form.buyQuantity) || 2,
        getQuantity: Number(form.getQuantity) || 1,
      };
      if (editingId) {
        await updatePromotion(editingId, payload);
        toast.success('Promoção atualizada!');
      } else {
        await createPromotion(payload);
        toast.success('Promoção criada!');
      }
      closeForm();
    } catch {
      toast.error('Erro ao salvar promoção');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await deletePromotion(id);
    setDeleteConfirm(null);
    toast.success('Promoção removida');
  }

  async function handleToggleActive(promo: Promotion) {
    await updatePromotion(promo.id, { isActive: !promo.isActive });
    toast.success(promo.isActive ? 'Promoção desativada' : 'Promoção ativada');
  }

  function toggleProduct(pid: string) {
    setForm(prev => ({
      ...prev,
      productIds: prev.productIds.includes(pid)
        ? prev.productIds.filter(id => id !== pid)
        : [...prev.productIds, pid],
    }));
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-lg text-foreground">Promoções</h1>
          <p className="text-xs text-muted-foreground">{promotions.length} promoção{promotions.length !== 1 ? 'ões' : ''} cadastrada{promotions.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openCreate} size="sm" className="gap-1.5" data-testid="btn-nova-promocao">
          <Plus className="w-4 h-4" />
          Nova
        </Button>
      </div>

      <div className="px-4 pt-4">
        {/* Status filter tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
          {(['all', 'active', 'scheduled', 'expired', 'inactive'] as TabFilter[]).map(t => {
            const labels: Record<TabFilter, string> = { all: 'Todas', active: 'Ativas', scheduled: 'Agendadas', expired: 'Encerradas', inactive: 'Inativas' };
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  tab === t ? 'bg-primary text-white shadow-sm' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {labels[t]}
                {counts[t] > 0 && (
                  <span className={`text-[10px] font-bold px-1 rounded-full ${tab === t ? 'bg-white/20' : 'bg-background'}`}>
                    {counts[t]}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Promotions list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Tag className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground mb-1">Nenhuma promoção</p>
            <p className="text-sm text-muted-foreground mb-4">
              {tab === 'all' ? 'Crie sua primeira promoção para atrair mais clientes.' : `Nenhuma promoção ${tab === 'active' ? 'ativa' : tab === 'scheduled' ? 'agendada' : tab === 'expired' ? 'encerrada' : 'inativa'} no momento.`}
            </p>
            {tab === 'all' && (
              <Button onClick={openCreate} size="sm" className="gap-1.5">
                <Plus className="w-4 h-4" />
                Criar promoção
              </Button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(promo => {
              const status = getPromotionStatus(promo);
              const cfg = STATUS_CONFIG[status];
              const isExpanded = expandedId === promo.id;
              return (
                <div
                  key={promo.id}
                  className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm"
                  data-testid={`card-promo-${promo.id}`}
                >
                  {/* Card header */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
                            {cfg.icon}{cfg.label}
                          </span>
                          <span className="text-[11px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-medium">
                            {TYPE_LABELS[promo.type]}
                          </span>
                        </div>
                        <p className="font-bold text-base text-foreground leading-tight">{promo.title}</p>
                        {promo.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{promo.description}</p>
                        )}
                      </div>
                      {/* Discount highlight */}
                      <div className="flex-shrink-0 text-right">
                        {promo.type === 'percentage' && (
                          <span className="text-xl font-black text-primary">-{promo.value}%</span>
                        )}
                        {promo.type === 'fixed' && (
                          <span className="text-xl font-black text-primary">-R${promo.value.toFixed(2)}</span>
                        )}
                        {promo.type === 'buy_x_get_y' && (
                          <span className="text-sm font-black text-primary">{promo.buyQuantity}+{promo.getQuantity}</span>
                        )}
                        {promo.type === 'free_shipping' && (
                          <Truck className="w-6 h-6 text-primary" />
                        )}
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDateTime(promo.startsAt)}
                      </span>
                      <span>→</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(promo.endsAt)}
                      </span>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="px-4 pb-3 border-t border-border/50 pt-3 flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-muted rounded-xl p-2.5">
                          <p className="text-muted-foreground mb-0.5">Aplica em</p>
                          <p className="font-semibold text-foreground">{APPLY_LABELS[promo.applyTo]}</p>
                          {promo.applyTo === 'category' && promo.category && (
                            <p className="text-muted-foreground mt-0.5">{promo.category}</p>
                          )}
                          {promo.applyTo === 'specific' && promo.productIds.length > 0 && (
                            <p className="text-muted-foreground mt-0.5">{promo.productIds.length} produto(s)</p>
                          )}
                        </div>
                        <div className="bg-muted rounded-xl p-2.5">
                          <p className="text-muted-foreground mb-0.5">Pedido mín.</p>
                          <p className="font-semibold text-foreground">
                            {promo.minOrderValue > 0 ? `R$ ${promo.minOrderValue.toFixed(2)}` : 'Sem mínimo'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-0 border-t border-border/50">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : promo.id)}
                      className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      {isExpanded ? 'Menos' : 'Detalhes'}
                    </button>
                    <div className="w-px h-6 bg-border" />
                    <button
                      onClick={() => handleToggleActive(promo)}
                      className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs hover:bg-muted/50 transition-colors"
                      title={promo.isActive ? 'Desativar' : 'Ativar'}
                    >
                      {promo.isActive
                        ? <ToggleRight className="w-4 h-4 text-emerald-600" />
                        : <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                      }
                      <span className={promo.isActive ? 'text-emerald-600' : 'text-muted-foreground'}>
                        {promo.isActive ? 'Ativa' : 'Inativa'}
                      </span>
                    </button>
                    <div className="w-px h-6 bg-border" />
                    <button
                      onClick={() => openEdit(promo)}
                      className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs text-primary hover:bg-primary/5 transition-colors"
                      data-testid={`btn-edit-promo-${promo.id}`}
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar
                    </button>
                    <div className="w-px h-6 bg-border" />
                    <button
                      onClick={() => setDeleteConfirm(promo.id)}
                      className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs text-red-500 hover:bg-red-50 transition-colors"
                      data-testid={`btn-delete-promo-${promo.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="font-bold text-foreground">Excluir promoção?</p>
                <p className="text-xs text-muted-foreground">Essa ação não pode ser desfeita.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
              <Button variant="destructive" className="flex-1" onClick={() => handleDelete(deleteConfirm)}>Excluir</Button>
            </div>
          </div>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={closeForm}>
          <div
            className="bg-white rounded-t-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="sticky top-0 bg-white rounded-t-3xl border-b border-border px-5 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="font-bold text-lg text-foreground">{editingId ? 'Editar Promoção' : 'Nova Promoção'}</h2>
                <p className="text-xs text-muted-foreground">Preencha os dados da promoção</p>
              </div>
              <button onClick={closeForm} className="p-2 rounded-xl hover:bg-muted transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-4 flex flex-col gap-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Título da promoção *</label>
                <input
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  placeholder="Ex: Super Desconto de Verão"
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  data-testid="input-promo-title"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Descrição <span className="font-normal text-muted-foreground">(opcional)</span></label>
                <textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Descreva a promoção brevemente..."
                  rows={2}
                  className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Tipo de promoção *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['percentage', 'fixed', 'buy_x_get_y', 'free_shipping'] as const).map(t => {
                    const icons = { percentage: <Percent className="w-4 h-4" />, fixed: <DollarSign className="w-4 h-4" />, buy_x_get_y: <ShoppingCart className="w-4 h-4" />, free_shipping: <Truck className="w-4 h-4" /> };
                    return (
                      <button
                        key={t}
                        onClick={() => set('type', t)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left ${
                          form.type === t
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border bg-background text-muted-foreground hover:border-primary/40'
                        }`}
                        data-testid={`btn-type-${t}`}
                      >
                        {icons[t]}
                        {TYPE_LABELS[t]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Value (depends on type) */}
              {form.type === 'percentage' && (
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Percentual de desconto *</label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={form.value}
                      onChange={e => set('value', e.target.value)}
                      placeholder="Ex: 15"
                      className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 pr-10"
                      data-testid="input-promo-value"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">%</span>
                  </div>
                </div>
              )}

              {form.type === 'fixed' && (
                <div>
                  <label className="block text-sm font-semibold text-foreground mb-1.5">Valor do desconto (R$) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">R$</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={form.value}
                      onChange={e => set('value', e.target.value)}
                      placeholder="0,00"
                      className="w-full border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
              )}

              {form.type === 'buy_x_get_y' && (
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-foreground mb-1.5">Leve (qtd)</label>
                    <input
                      type="number"
                      min="1"
                      value={form.buyQuantity}
                      onChange={e => set('buyQuantity', e.target.value)}
                      className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-semibold text-foreground mb-1.5">Pague (qtd)</label>
                    <input
                      type="number"
                      min="1"
                      value={form.getQuantity}
                      onChange={e => set('getQuantity', e.target.value)}
                      className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </div>
              )}

              {/* Period */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Período da promoção *</label>
                <div className="flex flex-col gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Início</p>
                    <input
                      type="datetime-local"
                      value={form.startsAt}
                      onChange={e => set('startsAt', e.target.value)}
                      className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      data-testid="input-starts-at"
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Término</p>
                    <input
                      type="datetime-local"
                      value={form.endsAt}
                      onChange={e => set('endsAt', e.target.value)}
                      className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                      data-testid="input-ends-at"
                    />
                  </div>
                </div>
              </div>

              {/* Apply to */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Aplicar em</label>
                <div className="flex flex-col gap-2">
                  {(['all', 'category', 'specific'] as const).map(v => (
                    <label key={v} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${form.applyTo === v ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
                      <input
                        type="radio"
                        name="applyTo"
                        value={v}
                        checked={form.applyTo === v}
                        onChange={() => set('applyTo', v)}
                        className="accent-primary"
                      />
                      <span className="text-sm font-medium text-foreground">{APPLY_LABELS[v]}</span>
                    </label>
                  ))}
                </div>

                {/* Category selector */}
                {form.applyTo === 'category' && (
                  <div className="mt-2">
                    <select
                      value={form.category}
                      onChange={e => set('category', e.target.value)}
                      className="w-full border border-border rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="">Selecione a categoria</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                )}

                {/* Product selector */}
                {form.applyTo === 'specific' && (
                  <div className="mt-2 border border-border rounded-xl overflow-hidden max-h-40 overflow-y-auto">
                    {storeProducts.length === 0 ? (
                      <p className="text-xs text-muted-foreground p-3 text-center">Nenhum produto cadastrado</p>
                    ) : storeProducts.map(p => (
                      <label key={p.id} className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors border-b border-border/50 last:border-0 ${form.productIds.includes(p.id) ? 'bg-primary/5' : 'hover:bg-muted/50'}`}>
                        <input
                          type="checkbox"
                          checked={form.productIds.includes(p.id)}
                          onChange={() => toggleProduct(p.id)}
                          className="accent-primary"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                          <p className="text-xs text-muted-foreground">R$ {Number(p.price).toFixed(2)}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Min order value */}
              <div>
                <label className="block text-sm font-semibold text-foreground mb-1.5">Valor mínimo do pedido <span className="font-normal text-muted-foreground">(opcional)</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-semibold text-sm">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.minOrderValue}
                    onChange={e => set('minOrderValue', e.target.value)}
                    placeholder="0,00 (sem mínimo)"
                    className="w-full border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between bg-muted rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Promoção ativa</p>
                  <p className="text-xs text-muted-foreground">Ative para que a promoção seja aplicada no período definido</p>
                </div>
                <button
                  onClick={() => set('isActive', !form.isActive)}
                  className="transition-colors"
                  data-testid="toggle-promo-active"
                >
                  {form.isActive
                    ? <ToggleRight className="w-8 h-8 text-primary" />
                    : <ToggleLeft className="w-8 h-8 text-muted-foreground" />
                  }
                </button>
              </div>
            </div>

            {/* Save button */}
            <div className="sticky bottom-0 bg-white border-t border-border px-5 py-4">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full h-12 text-base font-semibold"
                data-testid="btn-save-promo"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                ) : editingId ? 'Salvar alterações' : 'Criar promoção'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useMemo } from 'react';
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { useProfile } from '@/contexts/ProfileContext';
import { Order } from '@/lib/mockData';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import {
  ArrowLeft, TrendingUp, TrendingDown, Wallet, ChevronDown,
  ShoppingBag, Bike, Calendar, Receipt, AlertCircle,
} from 'lucide-react';

type Period = 'today' | '7d' | '30d' | '90d' | '1y' | 'custom';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoje',
  '7d': '7 dias',
  '30d': '30 dias',
  '90d': '90 dias',
  '1y': '1 ano',
  custom: 'Personalizado',
};

function getPeriodStart(period: Period, customStart: string): Date {
  const now = new Date();
  switch (period) {
    case 'today': { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; }
    case '7d': return new Date(now.getTime() - 7 * 86400000);
    case '30d': return new Date(now.getTime() - 30 * 86400000);
    case '90d': return new Date(now.getTime() - 90 * 86400000);
    case '1y': return new Date(now.getTime() - 365 * 86400000);
    case 'custom': return customStart ? new Date(customStart) : new Date(now.getTime() - 30 * 86400000);
    default: return new Date(now.getTime() - 30 * 86400000);
  }
}

function fmtMoney(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtShortDate(date: Date, period: Period): string {
  if (period === 'today') {
    return `${String(date.getHours()).padStart(2, '0')}h`;
  }
  if (period === '1y') {
    return date.toLocaleDateString('pt-BR', { month: 'short' });
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function fmtDateTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function groupByPeriod(orders: Order[], period: Period, startDate: Date, endDate: Date) {
  const result: Record<string, { entradas: number; saidas: number }> = {};

  let keyFn: (d: Date) => string;
  if (period === 'today') {
    const hours = [0, 4, 8, 12, 16, 20];
    hours.forEach(h => {
      const d = new Date(startDate);
      d.setHours(h);
      result[`${String(h).padStart(2, '0')}h`] = { entradas: 0, saidas: 0 };
    });
    keyFn = (d) => {
      const h = d.getHours();
      const bucket = [0, 4, 8, 12, 16, 20].reverse().find(b => h >= b) ?? 0;
      return `${String(bucket).padStart(2, '0')}h`;
    };
  } else if (period === '1y') {
    const cur = new Date(startDate);
    cur.setDate(1);
    while (cur <= endDate) {
      result[cur.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })] = { entradas: 0, saidas: 0 };
      cur.setMonth(cur.getMonth() + 1);
    }
    keyFn = (d) => d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
  } else {
    const cur = new Date(startDate);
    cur.setHours(0, 0, 0, 0);
    while (cur <= endDate) {
      result[cur.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })] = { entradas: 0, saidas: 0 };
      cur.setDate(cur.getDate() + 1);
    }
    keyFn = (d) => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  orders.forEach(o => {
    const d = new Date(o.createdAt);
    const key = keyFn(d);
    if (result[key] !== undefined) {
      if (o.status === 'delivered') {
        result[key].entradas += o.total;
        result[key].saidas += o.motoRideValue ?? 0;
      }
    }
  });

  return Object.entries(result).map(([label, v]) => ({
    label,
    Entradas: Math.round(v.entradas * 100) / 100,
    Saídas: Math.round(v.saidas * 100) / 100,
  }));
}

type TransactionType = 'entrada' | 'saida';
interface Transaction {
  id: string;
  type: TransactionType;
  label: string;
  sublabel: string;
  value: number;
  date: string;
  orderId: string;
  paymentStatus?: string;
}

function buildTransactions(orders: Order[]): Transaction[] {
  const txns: Transaction[] = [];
  orders.forEach(o => {
    if (o.status === 'delivered') {
      txns.push({
        id: `entrada-${o.id}`,
        type: 'entrada',
        label: `Pedido #${o.id.slice(-6)}`,
        sublabel: o.customerName || 'Cliente',
        value: o.total,
        date: o.createdAt,
        orderId: o.id,
        paymentStatus: o.paymentStatus,
      });
      if (o.motoRideValue && o.motoRideValue > 0) {
        txns.push({
          id: `saida-${o.id}`,
          type: 'saida',
          label: `Frete — Pedido #${o.id.slice(-6)}`,
          sublabel: 'Custo de entrega',
          value: o.motoRideValue,
          date: o.createdAt,
          orderId: o.id,
        });
      }
    }
  });
  return txns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-border rounded-xl shadow-lg p-3 text-xs">
        <p className="font-semibold text-foreground mb-1.5">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-semibold text-foreground">{fmtMoney(p.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function FinanceiroScreen({ onBack }: { onBack: () => void }) {
  const { sellerOrders } = useMarketplace();
  const { sellerProfile } = useProfile();
  const storeId = sellerProfile.storeId || 'store-1';

  const [period, setPeriod] = useState<Period>('30d');
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [txFilter, setTxFilter] = useState<'all' | 'entrada' | 'saida'>('all');
  const [chartExpanded, setChartExpanded] = useState(true);

  const endDate = period === 'custom' && customEnd ? new Date(customEnd) : new Date();
  const startDate = getPeriodStart(period, customStart);

  const storeOrders = useMemo(
    () => sellerOrders.filter(o => o.storeId === storeId),
    [sellerOrders, storeId],
  );

  const periodOrders = useMemo(
    () => storeOrders.filter(o => {
      const d = new Date(o.createdAt);
      return d >= startDate && d <= endDate;
    }),
    [storeOrders, startDate, endDate],
  );

  const deliveredOrders = useMemo(() => periodOrders.filter(o => o.status === 'delivered'), [periodOrders]);
  const cancelledOrders = useMemo(() => periodOrders.filter(o => o.status === 'cancelled'), [periodOrders]);

  const totalEntradas = useMemo(() => deliveredOrders.reduce((s, o) => s + o.total, 0), [deliveredOrders]);
  const totalSaidas = useMemo(() => deliveredOrders.reduce((s, o) => s + (o.motoRideValue ?? 0), 0), [deliveredOrders]);
  const lucroLiquido = totalEntradas - totalSaidas;
  const ticketMedio = deliveredOrders.length > 0 ? totalEntradas / deliveredOrders.length : 0;

  const chartData = useMemo(
    () => groupByPeriod(periodOrders, period, startDate, endDate),
    [periodOrders, period, startDate, endDate],
  );

  const transactions = useMemo(() => buildTransactions(periodOrders), [periodOrders]);

  const filteredTxns = useMemo(
    () => txFilter === 'all' ? transactions : transactions.filter(t => t.type === txFilter),
    [transactions, txFilter],
  );

  return (
    <div className="min-h-screen bg-[#F8F9FC] pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-lg text-foreground">Financeiro</h1>
          <p className="text-xs text-muted-foreground">Resumo financeiro da sua loja</p>
        </div>
        {/* Period selector */}
        <div className="relative">
          <button
            onClick={() => setShowPeriodMenu(v => !v)}
            className="flex items-center gap-1.5 bg-muted rounded-xl px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted/80 transition-colors"
            data-testid="btn-period-selector"
          >
            <Calendar className="w-3.5 h-3.5" />
            {PERIOD_LABELS[period]}
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {showPeriodMenu && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-border rounded-2xl shadow-xl overflow-hidden min-w-[140px]">
              {(Object.entries(PERIOD_LABELS) as [Period, string][]).map(([p, label]) => (
                <button
                  key={p}
                  onClick={() => { setPeriod(p); setShowPeriodMenu(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${period === p ? 'bg-primary/10 text-primary' : 'hover:bg-muted text-foreground'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Custom date range */}
      {period === 'custom' && (
        <div className="bg-white border-b border-border px-4 py-3 flex items-center gap-2">
          <div className="flex-1">
            <p className="text-[10px] text-muted-foreground mb-1">De</p>
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex-1">
            <p className="text-[10px] text-muted-foreground mb-1">Até</p>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="w-full border border-border rounded-xl px-3 py-2 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>
      )}

      <div className="px-4 pt-4 flex flex-col gap-4">
        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 bg-gradient-to-br from-primary to-blue-600 rounded-2xl p-4 text-white shadow-md">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 opacity-80" />
                <span className="text-sm font-medium opacity-90">Saldo Líquido</span>
              </div>
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-medium">{PERIOD_LABELS[period]}</span>
            </div>
            <p className="text-3xl font-black tracking-tight">{fmtMoney(lucroLiquido)}</p>
            <p className="text-xs mt-1 opacity-75">{deliveredOrders.length} pedido{deliveredOrders.length !== 1 ? 's' : ''} entregue{deliveredOrders.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-border shadow-sm" data-testid="card-entradas">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground">Entradas</span>
            </div>
            <p className="text-lg font-black text-emerald-600">{fmtMoney(totalEntradas)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{deliveredOrders.length} pedido{deliveredOrders.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-border shadow-sm" data-testid="card-saidas">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-500" />
              </div>
              <span className="text-xs font-semibold text-muted-foreground">Saídas</span>
            </div>
            <p className="text-lg font-black text-red-500">{fmtMoney(totalSaidas)}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Fretes pagos</p>
          </div>
        </div>

        {/* Extra stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white rounded-2xl p-3 border border-border shadow-sm text-center">
            <p className="text-xs text-muted-foreground mb-1">Ticket Médio</p>
            <p className="font-black text-sm text-foreground">{fmtMoney(ticketMedio)}</p>
          </div>
          <div className="bg-white rounded-2xl p-3 border border-border shadow-sm text-center">
            <p className="text-xs text-muted-foreground mb-1">Cancelados</p>
            <p className="font-black text-sm text-red-500">{cancelledOrders.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-3 border border-border shadow-sm text-center">
            <p className="text-xs text-muted-foreground mb-1">Total pedidos</p>
            <p className="font-black text-sm text-foreground">{periodOrders.length}</p>
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-3.5 text-left"
            onClick={() => setChartExpanded(v => !v)}
          >
            <span className="font-semibold text-sm text-foreground">Entradas vs Saídas</span>
            <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${chartExpanded ? 'rotate-180' : ''}`} />
          </button>
          {chartExpanded && (
            <div className="px-2 pb-4">
              {chartData.every(d => d.Entradas === 0 && d['Saídas'] === 0) ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <AlertCircle className="w-8 h-8 text-muted-foreground opacity-40 mb-2" />
                  <p className="text-sm text-muted-foreground">Sem dados no período</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: '#94A3B8' }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#94A3B8' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={v => `R$${v}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                    />
                    <Bar dataKey="Entradas" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={24} />
                    <Bar dataKey="Saídas" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}
        </div>

        {/* Transactions */}
        <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-4 pt-4 pb-3 flex items-center justify-between">
            <span className="font-semibold text-sm text-foreground flex items-center gap-2">
              <Receipt className="w-4 h-4 text-muted-foreground" />
              Movimentações
            </span>
            <span className="text-xs text-muted-foreground">{filteredTxns.length} item{filteredTxns.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Filter pills */}
          <div className="flex gap-2 px-4 pb-3">
            {(['all', 'entrada', 'saida'] as const).map(f => {
              const labels = { all: 'Todas', entrada: 'Entradas', saida: 'Saídas' };
              return (
                <button
                  key={f}
                  onClick={() => setTxFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    txFilter === f
                      ? f === 'entrada' ? 'bg-emerald-100 text-emerald-700'
                        : f === 'saida' ? 'bg-red-100 text-red-600'
                        : 'bg-primary text-white'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {labels[f]}
                </button>
              );
            })}
          </div>

          <div className="divide-y divide-border/60">
            {filteredTxns.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <ShoppingBag className="w-10 h-10 text-muted-foreground opacity-30 mb-3" />
                <p className="text-sm font-semibold text-foreground">Nenhuma movimentação</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {txFilter === 'all' ? 'Não há pedidos entregues no período selecionado.' : `Sem ${txFilter === 'entrada' ? 'entradas' : 'saídas'} no período.`}
                </p>
              </div>
            ) : (
              filteredTxns.map(txn => (
                <div
                  key={txn.id}
                  className="flex items-center gap-3 px-4 py-3"
                  data-testid={`txn-${txn.id}`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    txn.type === 'entrada' ? 'bg-emerald-100' : 'bg-red-100'
                  }`}>
                    {txn.type === 'entrada'
                      ? <ShoppingBag className="w-4 h-4 text-emerald-600" />
                      : <Bike className="w-4 h-4 text-red-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{txn.label}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-muted-foreground truncate">{txn.sublabel}</p>
                      {txn.paymentStatus && (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                          txn.paymentStatus === 'paid'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {txn.paymentStatus === 'paid' ? 'Pago' : 'Pendente'}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 mt-0.5">{fmtDateTime(txn.date)}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className={`text-sm font-bold ${txn.type === 'entrada' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {txn.type === 'entrada' ? '+' : '-'}{fmtMoney(txn.value)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

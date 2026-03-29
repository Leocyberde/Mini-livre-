import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import {
  Users, TrendingUp, ShoppingCart, DollarSign, AlertCircle, Bike, Clock, Package,
} from 'lucide-react';
import { Order } from '@/lib/mockData';
import { DispatchEntry } from '@/contexts/MarketplaceContext';

interface OverviewTabProps {
  totalSales: number;
  totalStores: number;
  totalOrdersCount: number;
  deliveredOrders: number;
  clientsCount: number;
  dispatchQueue: DispatchEntry[];
  readyForPickupOrders: Order[];
  allOrders: Order[];
  salesData: { name: string; vendas: number; pedidos: number }[];
  storePerformance: { name: string; vendas: number; pedidos: number }[];
}

export default function OverviewTab({
  totalSales,
  totalStores,
  totalOrdersCount,
  deliveredOrders,
  clientsCount,
  dispatchQueue,
  readyForPickupOrders,
  allOrders,
  salesData,
  storePerformance,
}: OverviewTabProps) {
  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Vendas Totais</p>
              <p className="text-3xl font-bold text-primary">R$ {totalSales.toFixed(2)}</p>
            </div>
            <DollarSign className="w-12 h-12 text-accent opacity-20" />
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Lojas Ativas</p>
              <p className="text-3xl font-bold text-primary">{totalStores}</p>
            </div>
            <ShoppingCart className="w-12 h-12 text-accent opacity-20" />
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Total de Pedidos</p>
              <p className="text-3xl font-bold text-primary">{totalOrdersCount}</p>
              <p className="text-xs text-muted-foreground mt-1">{deliveredOrders} entregues</p>
            </div>
            <Package className="w-12 h-12 text-accent opacity-20" />
          </div>
        </Card>

        <Card className="p-6 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Clientes</p>
              <p className="text-3xl font-bold text-primary">{clientsCount}</p>
              <p className="text-xs text-muted-foreground mt-1">compradores únicos</p>
            </div>
            <Users className="w-12 h-12 text-accent opacity-20" />
          </div>
        </Card>
      </div>

      {/* Motoboy dispatch queue */}
      {dispatchQueue.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Bike className="w-5 h-5 text-purple-600" />
            Fila de Despacho — Motoboy
          </h3>
          <div className="space-y-3">
            {dispatchQueue.map(entry => {
              const routeOrders = entry.orderIds
                .map(id => readyForPickupOrders.find(o => o.id === id) ?? allOrders.find(o => o.id === id))
                .filter(Boolean);
              const firstOrder = routeOrders[0];
              const cooldownRemaining = entry.lastRejectedAt
                ? Math.max(0, 60 - Math.floor((Date.now() - entry.lastRejectedAt) / 1000))
                : 0;
              return (
                <Card key={entry.routeId} className="p-4 border-l-4 border-purple-500">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="font-mono text-sm font-bold text-foreground">
                        Rota {entry.orderIds.length > 1 ? `Dupla` : `Simples`} — {entry.orderIds.map(id => `#${id.slice(-5).toUpperCase()}`).join(' + ')}
                      </p>
                      {firstOrder && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {routeOrders.map(o => o?.customerName).filter(Boolean).join(', ')} · Loja: {firstOrder.storeName || firstOrder.storeId}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {entry.rejectionCount > 0 && (
                        <Badge className="bg-red-100 text-red-800 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {entry.rejectionCount} recusa{entry.rejectionCount > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {cooldownRemaining > 0 ? (
                        <Badge className="bg-yellow-100 text-yellow-800 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Tentando em {cooldownRemaining}s
                        </Badge>
                      ) : (
                        <Badge className="bg-purple-100 text-purple-800 flex items-center gap-1">
                          <Bike className="w-3 h-3" />
                          Procurando motoboy
                        </Badge>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Vendas — Últimos 7 dias</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#6B7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6B7280" />
              <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }} />
              <Legend />
              <Line type="monotone" dataKey="vendas" name="Vendas (R$)" stroke="#1E40AF" strokeWidth={2} dot={{ fill: '#1E40AF' }} />
              <Line type="monotone" dataKey="pedidos" name="Pedidos" stroke="#FBBF24" strokeWidth={2} dot={{ fill: '#FBBF24' }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Performance das Lojas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={storePerformance}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#6B7280" angle={-20} textAnchor="end" height={60} tick={{ fontSize: 11 }} />
              <YAxis stroke="#6B7280" />
              <Tooltip contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }} />
              <Legend />
              <Bar dataKey="vendas" name="Vendas (R$)" fill="#1E40AF" radius={[8, 8, 0, 0]} />
              <Bar dataKey="pedidos" name="Pedidos" fill="#FBBF24" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

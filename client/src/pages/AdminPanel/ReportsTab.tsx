import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, CalendarClock, Clock, Bike, Store, CheckCircle, CreditCard, MapPin, User, Mail, Phone, KeyRound } from 'lucide-react';
import { Order, Store as StoreData } from '@/lib/mockData';
import { ActiveDeliveryRoute } from '@/contexts/MarketplaceContext';

interface ReportsTabProps {
  realStores: StoreData[];
  allOrders: Order[];
  totalSales: number;
  expandedOrders: Set<string>;
  toggleOrderExpand: (id: string) => void;
  statusLabel: (s: string) => string;
  statusIcon: (s: string) => React.ReactElement;
  getDoubleRouteLabel: (order: Order) => string | null;
  isDoubleRoute: (order: Order) => boolean;
  formatDate: (iso: string) => string;
  fmtDateTime: (ts: string | null | undefined) => string;
  getTimestampForStatus: (order: Order, status: string) => string | null;
}

export default function ReportsTab({
  realStores,
  allOrders,
  totalSales,
  expandedOrders,
  toggleOrderExpand,
  statusLabel,
  statusIcon,
  getDoubleRouteLabel,
  isDoubleRoute,
  formatDate,
  fmtDateTime,
  getTimestampForStatus,
}: ReportsTabProps) {
  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Relatório de Vendas por Loja</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 font-semibold text-foreground">Loja</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Pedidos</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Entregues</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Vendas Totais</th>
                <th className="text-left py-3 px-4 font-semibold text-foreground">Ticket Médio</th>
              </tr>
            </thead>
            <tbody>
              {realStores.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground text-sm">
                    Nenhuma loja cadastrada.
                  </td>
                </tr>
              ) : realStores.map(store => {
                const storeOrders = allOrders.filter(o => o.storeId === store.id);
                const storeSales = storeOrders.reduce((sum, o) => sum + o.total, 0);
                const deliveredCount = storeOrders.filter(o => o.status === 'delivered').length;
                const avgTicket = storeOrders.length > 0 ? storeSales / storeOrders.length : 0;

                return (
                  <tr key={store.id} className="border-b border-border hover:bg-secondary transition-colors">
                    <td className="py-3 px-4 text-foreground font-medium">{store.name}</td>
                    <td className="py-3 px-4 text-foreground">{storeOrders.length}</td>
                    <td className="py-3 px-4 text-green-700 font-medium">{deliveredCount}</td>
                    <td className="py-3 px-4 text-foreground font-semibold">R$ {storeSales.toFixed(2)}</td>
                    <td className="py-3 px-4 text-foreground">R$ {avgTicket.toFixed(2)}</td>
                  </tr>
                );
              })}
              <tr className="bg-secondary border-t-2 border-border">
                <td className="py-3 px-4 font-bold text-foreground" colSpan={3}>Total do Período</td>
                <td className="py-3 px-4 font-bold text-primary text-base">R$ {totalSales.toFixed(2)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* All Orders List — detailed cards */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">
          Todos os Pedidos ({allOrders.length})
        </h3>
        {allOrders.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhum pedido no sistema ainda.</p>
        ) : (
          <div className="space-y-4">
            {[...allOrders].reverse().map(order => {
              const isExpanded = expandedOrders.has(order.id);
              const statusBadgeCls =
                order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                order.status === 'pending'   ? 'bg-yellow-100 text-yellow-800' :
                'bg-blue-100 text-blue-800';
              return (
                <div key={order.id} className="border border-border rounded-xl overflow-hidden">
                  {/* Collapsed header — always visible */}
                  <button
                    className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-3 hover:bg-secondary transition-colors"
                    onClick={() => toggleOrderExpand(order.id)}
                  >
                    <span className="font-mono text-xs text-muted-foreground w-20 flex-shrink-0">#{order.id.slice(-6)}</span>
                    <span className="font-medium text-foreground flex-1 min-w-[120px]">{order.customerName}</span>
                    <span className="text-muted-foreground text-sm flex-1 min-w-[120px]">{order.storeName || order.storeId}</span>
                    <span className="font-semibold text-foreground">R$ {order.total.toFixed(2)}</span>
                    <Badge className={`${statusBadgeCls} flex items-center gap-1 flex-shrink-0`}>
                      {statusIcon(order.status)} {getDoubleRouteLabel(order) ?? statusLabel(order.status)}
                    </Badge>
                    {isDoubleRoute(order) && (
                      <Badge className="text-xs bg-purple-100 text-purple-800 flex-shrink-0">🔄 Rota dupla</Badge>
                    )}
                    <span className="text-xs text-muted-foreground flex-shrink-0">{formatDate(order.createdAt)}</span>
                    <span className="text-xs text-primary font-medium flex-shrink-0">{isExpanded ? '▲ Fechar' : '▼ Detalhes'}</span>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-border bg-secondary/30 px-4 py-4 space-y-5">

                      {/* ── Dados do cliente ── */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Dados do Cliente</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <span className="text-foreground font-medium">{order.customerName}</span>
                          </div>
                          {order.customerEmail && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-foreground">{order.customerEmail}</span>
                            </div>
                          )}
                          {order.customerPhone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                              <span className="text-foreground">{order.customerPhone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ── Tipo de entrega + endereço ── */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Entrega</p>
                        {order.isPickup ? (
                          <div className="flex items-center gap-2 text-sm text-teal-700">
                            <Store className="w-4 h-4" /> Retirada na loja
                          </div>
                        ) : (
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2 text-orange-700">
                              <Bike className="w-4 h-4" /> Entrega por motoboy
                            </div>
                            {order.deliveryAddress && (
                              <div className="flex items-start gap-2 text-muted-foreground">
                                <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span>
                                  {order.deliveryAddress.logradouro}, {order.deliveryAddress.numero} —{' '}
                                  {order.deliveryAddress.bairro}, {order.deliveryAddress.cidade}/{order.deliveryAddress.uf}
                                </span>
                              </div>
                            )}
                            {order.distanceKm != null && (
                              <p className="text-xs text-muted-foreground pl-6">Distância: {order.distanceKm.toFixed(1)} km</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* ── Pagamento ── */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pagamento</p>
                        <div className="flex items-center gap-2 text-sm">
                          <CreditCard className="w-4 h-4 text-muted-foreground" />
                          {order.paymentStatus === 'paid' ? (
                            <Badge className="bg-green-100 text-green-800">Pago</Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-800">Aguardando pagamento</Badge>
                          )}
                        </div>
                      </div>

                      {/* ── Linha do tempo de datas ── */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1">
                          <CalendarClock className="w-3.5 h-3.5" /> Linha do Tempo
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center flex-shrink-0">
                              <Clock className="w-4 h-4 text-yellow-600" />
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Pedido realizado</p>
                              <p className="text-sm font-semibold text-foreground">{fmtDateTime(order.createdAt)}</p>
                            </div>
                          </div>
                          {!order.isPickup ? (
                            <>
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/40 flex items-center justify-center flex-shrink-0">
                                  <Bike className="w-4 h-4 text-orange-600" />
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Motoboy coletou</p>
                                  <p className="text-sm font-semibold text-foreground">
                                    {fmtDateTime(getTimestampForStatus(order, 'on_the_way') ?? getTimestampForStatus(order, 'motoboy_at_store'))}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center flex-shrink-0">
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground">Entregue ao cliente</p>
                                  <p className="text-sm font-semibold text-foreground">
                                    {fmtDateTime(order.deliveredAt ?? getTimestampForStatus(order, 'delivered'))}
                                  </p>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0">
                                <Store className="w-4 h-4 text-teal-600" />
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Retirado pelo cliente</p>
                                <p className="text-sm font-semibold text-foreground">
                                  {fmtDateTime(order.deliveredAt ?? getTimestampForStatus(order, 'delivered'))}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* ── Histórico completo de status ── */}
                      {order.statusHistory && order.statusHistory.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Histórico Completo de Status</p>
                          <div className="space-y-2">
                            {order.statusHistory.map((entry, idx) => (
                              <div key={idx} className="flex items-start gap-3 text-sm">
                                <div className="flex flex-col items-center">
                                  <div className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${idx === order.statusHistory!.length - 1 ? 'bg-primary' : 'bg-border'}`} />
                                  {idx < order.statusHistory!.length - 1 && <div className="w-0.5 h-5 bg-border mt-0.5" />}
                                </div>
                                <div className="flex-1 pb-1 flex items-center gap-2">
                                  {statusIcon(entry.status)}
                                  <span className="font-medium text-foreground">{statusLabel(entry.status)}</span>
                                  <span className="text-muted-foreground text-xs ml-auto">
                                    {new Date(entry.timestamp).toLocaleDateString('pt-BR')} às{' '}
                                    {new Date(entry.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ── Itens do pedido ── */}
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Itens do Pedido</p>
                        <div className="space-y-1 text-sm">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-foreground">
                              <span>× {item.quantity} — prod. {item.productId.slice(-6)}</span>
                              <span className="font-medium">R$ {(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                          ))}
                          <div className="flex justify-between font-bold text-foreground border-t border-border pt-1 mt-1">
                            <span>Total</span>
                            <span>R$ {order.total.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      {/* ── Código de entrega ── */}
                      {order.deliveryCode && (
                        <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
                          <KeyRound className="w-4 h-4 text-primary flex-shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Código de Entrega</p>
                            <p className="font-mono font-bold text-lg tracking-widest text-primary">{order.deliveryCode}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

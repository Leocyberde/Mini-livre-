import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft, Navigation, MapPin, Phone, Bike, CalendarClock, Bell, Ban,
  ShieldOff, Wallet, Plus, Minus, Star, UserCheck, XCircle,
  CheckCircle, ChevronRight, Mail, User, CreditCard, KeyRound,
} from 'lucide-react';
import { Order } from '@/lib/mockData';
import { AdminMotoboy } from '../types';
import { CompletedRoute } from '@/contexts/MotoboyContext';

interface MbDetailViewProps {
  selectedMb: AdminMotoboy;
  setSelectedMbId: (id: string | null) => void;
  mbDetailTab: 'profile' | 'orders';
  setMbDetailTab: (t: 'profile' | 'orders') => void;
  setBalanceDialog: (v: { mbId: string; mbName: string } | null) => void;
  setBalanceType: (v: 'add' | 'deduct') => void;
  setRemoveRouteConfirm: (v: string | null) => void;
  handleMbUnblock: (mbId: string, mbName: string) => void;
  setBlockDialog: (v: { mbId: string; mbName: string } | null) => void;
  setNotifMbDialog: (v: { mbId: string; mbName: string } | null) => void;
  handleMbMarkDelivered: (orderId: string) => void;
  expandedOrders: Set<string>;
  toggleOrderExpand: (id: string) => void;
  motoboyCompletedRoutes: CompletedRoute[];
  allOrders: Order[];
  statusLabel: (s: string) => string;
  statusIcon: (s: string) => React.ReactElement;
  fmtDateTime: (ts: string | null | undefined) => string;
  formatDate: (iso: string) => string;
}

export default function MbDetailView({
  selectedMb,
  setSelectedMbId,
  mbDetailTab,
  setMbDetailTab,
  setBalanceDialog,
  setBalanceType,
  setRemoveRouteConfirm,
  handleMbUnblock,
  setBlockDialog,
  setNotifMbDialog,
  handleMbMarkDelivered,
  expandedOrders,
  toggleOrderExpand,
  motoboyCompletedRoutes,
  allOrders,
  statusLabel,
  statusIcon,
  fmtDateTime,
  formatDate,
}: MbDetailViewProps) {
  return (
    <div className="space-y-5">
      {/* Back + header */}
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="outline" size="sm" className="gap-2" onClick={() => { setSelectedMbId(null); setMbDetailTab('profile'); }} data-testid="btn-back-motoboy-list">
          <ArrowLeft className="w-4 h-4" /> Voltar à lista
        </Button>
        <div className="flex items-center gap-3 flex-1">
          <span className="text-3xl">{selectedMb.avatar}</span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-foreground">{selectedMb.name}</h3>
              {selectedMb.isContextMotoboy && <Badge className="bg-blue-100 text-blue-800 text-[10px]">Context</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">{selectedMb.vehicle} · {selectedMb.licensePlate}</p>
          </div>
        </div>
        <Badge className={
          selectedMb.status === 'available' ? 'bg-green-100 text-green-800' :
          selectedMb.status === 'on_route'  ? 'bg-blue-100 text-blue-800' :
          selectedMb.status === 'blocked'   ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-600'
        }>
          {selectedMb.status === 'available' ? '● Disponível' :
           selectedMb.status === 'on_route'  ? '🛵 Em rota' :
           selectedMb.status === 'blocked'   ? '🚫 Bloqueado' : '○ Indisponível'}
        </Badge>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-2 border-b border-border pb-1">
        {(['profile', 'orders'] as const).map(t => (
          <button
            key={t}
            onClick={() => setMbDetailTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${mbDetailTab === t ? 'bg-primary text-white' : 'text-muted-foreground hover:text-foreground'}`}
            data-testid={`tab-mb-${t}`}
          >
            {t === 'profile' ? 'Perfil & Ações' : 'Pedidos Vinculados'}
          </button>
        ))}
      </div>

      {mbDetailTab === 'profile' && (
        <div className="space-y-5">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Entregas hoje</p>
              <p className="text-2xl font-bold text-primary">{selectedMb.completedToday}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Total de entregas</p>
              <p className="text-2xl font-bold text-foreground">{selectedMb.completedTotal}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Recusas</p>
              <p className="text-2xl font-bold text-red-600">{selectedMb.rejectedTotal}</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Avaliação</p>
              <p className="text-2xl font-bold text-yellow-600 flex items-center justify-center gap-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-500" /> {selectedMb.rating.toFixed(1)}
              </p>
            </Card>
          </div>

          {/* Saldo */}
          <Card className="p-5 border-l-4 border-primary">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> Saldo / Bônus do Admin</p>
                <p className="text-2xl font-bold text-primary">R$ {selectedMb.balanceBonus.toFixed(2)}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="gap-2 bg-green-700 hover:bg-green-800 text-white"
                  onClick={() => { setBalanceDialog({ mbId: selectedMb.id, mbName: selectedMb.name }); setBalanceType('add'); }}
                  data-testid="btn-mb-credit-balance">
                  <Plus className="w-4 h-4" /> Creditar
                </Button>
                <Button size="sm" variant="outline" className="gap-2 text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => { setBalanceDialog({ mbId: selectedMb.id, mbName: selectedMb.name }); setBalanceType('deduct'); }}
                  data-testid="btn-mb-deduct-balance">
                  <Minus className="w-4 h-4" /> Debitar
                </Button>
              </div>
            </div>
          </Card>

          {/* Rota atual */}
          {selectedMb.currentRoute ? (
            <Card className="p-5 border-l-4 border-blue-500">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Navigation className="w-4 h-4 text-blue-600" /> Rota Atual
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span><span className="font-medium">De:</span> {selectedMb.currentRoute.from}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                      <span><span className="font-medium">Para:</span> {selectedMb.currentRoute.to}</span>
                    </div>
                    {selectedMb.currentRoute.orderId && (
                      <p className="text-xs text-muted-foreground pl-6">Pedido #{selectedMb.currentRoute.orderId.slice(-6).toUpperCase()}</p>
                    )}
                  </div>
                </div>
                <Button size="sm" variant="outline" className="gap-2 text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => setRemoveRouteConfirm(selectedMb.id)}
                  data-testid="btn-mb-remove-route">
                  <XCircle className="w-4 h-4" /> Retirar Rota
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-4 border border-dashed border-border">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Navigation className="w-4 h-4" /> Nenhuma rota ativa no momento.
              </p>
            </Card>
          )}

          {/* Bloqueio */}
          {selectedMb.status === 'blocked' && selectedMb.blockInfo ? (
            <Card className="p-5 border-l-4 border-red-500 bg-red-50 dark:bg-red-900/10">
              <div className="flex items-start justify-between flex-wrap gap-3">
                <div>
                  <h4 className="font-semibold text-red-800 dark:text-red-400 flex items-center gap-2 mb-1">
                    <Ban className="w-4 h-4" /> Motoboy Bloqueado
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Tipo: {selectedMb.blockInfo.type === 'permanent' ? 'Permanente' : selectedMb.blockInfo.type === 'hours' ? 'Por horas' : 'Por dias'}
                  </p>
                  {selectedMb.blockInfo.until && (
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Até: {selectedMb.blockInfo.until.toLocaleString('pt-BR')}
                    </p>
                  )}
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    Motivo: {selectedMb.blockInfo.reason}
                  </p>
                </div>
                <Button size="sm" className="gap-2 bg-green-700 hover:bg-green-800 text-white"
                  onClick={() => handleMbUnblock(selectedMb.id, selectedMb.name)}
                  data-testid="btn-mb-unblock">
                  <UserCheck className="w-4 h-4" /> Desbloquear
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h4 className="font-semibold text-foreground flex items-center gap-2 mb-1">
                    <ShieldOff className="w-4 h-4" /> Bloqueio de Acesso
                  </h4>
                  <p className="text-sm text-muted-foreground">Bloquear motoboy por tempo determinado ou permanentemente.</p>
                </div>
                <Button size="sm" variant="outline" className="gap-2 text-orange-700 border-orange-400 hover:bg-orange-50"
                  onClick={() => setBlockDialog({ mbId: selectedMb.id, mbName: selectedMb.name })}
                  data-testid="btn-mb-block">
                  <Ban className="w-4 h-4" /> Bloquear
                </Button>
              </div>
            </Card>
          )}

          {/* Info & Ações rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Informações</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4 flex-shrink-0" />
                  <span>{selectedMb.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Bike className="w-4 h-4 flex-shrink-0" />
                  <span>{selectedMb.vehicle} — {selectedMb.licensePlate}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarClock className="w-4 h-4 flex-shrink-0" />
                  <span>Cadastrado em {new Date(selectedMb.joinedAt).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>
            </Card>
            <Card className="p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Ações Rápidas</h4>
              <div className="flex flex-col gap-2">
                <Button size="sm" variant="outline" className="justify-start gap-2"
                  onClick={() => setNotifMbDialog({ mbId: selectedMb.id, mbName: selectedMb.name })}
                  data-testid="btn-mb-send-notif">
                  <Bell className="w-4 h-4" /> Enviar Notificação
                </Button>
                {selectedMb.currentRoute && (
                  <Button size="sm" variant="outline" className="justify-start gap-2 text-orange-700 border-orange-300"
                    onClick={() => setRemoveRouteConfirm(selectedMb.id)}
                    data-testid="btn-mb-remove-route-quick">
                    <XCircle className="w-4 h-4" /> Retirar Rota Atual
                  </Button>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {mbDetailTab === 'orders' && (
        <div className="space-y-4">
          {(() => {
            const mbActiveStatuses: Order['status'][] = ['motoboy_accepted', 'motoboy_at_store', 'on_the_way', 'motoboy_arrived'];
            const activeOrders = selectedMb.isContextMotoboy
              ? allOrders.filter(o => mbActiveStatuses.includes(o.status))
              : [];
            const finishedOrders = selectedMb.isContextMotoboy
              ? [...allOrders].filter(o => o.status === 'delivered').reverse()
              : [];
            const simRoutes = selectedMb.isContextMotoboy ? [] : motoboyCompletedRoutes.slice(0, selectedMb.completedTotal);

            return (
              <>
                {activeOrders.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-blue-600" /> Pedidos em Andamento ({activeOrders.length})
                    </h4>
                    <div className="space-y-2">
                      {activeOrders.map(order => (
                        <Card key={order.id} className="p-4 border-l-4 border-blue-400">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-mono text-xs text-muted-foreground">#{order.id.slice(-6).toUpperCase()}</p>
                              <p className="font-semibold text-foreground">{order.customerName}</p>
                              <p className="text-sm text-muted-foreground">{order.storeName || order.storeId}</p>
                              {order.deliveryAddress && (
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {order.deliveryAddress.logradouro}, {order.deliveryAddress.numero} — {order.deliveryAddress.bairro}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col gap-2 items-end">
                              <Badge className="bg-blue-100 text-blue-800">{statusLabel(order.status)}</Badge>
                              <p className="font-semibold text-foreground text-sm">R$ {order.total.toFixed(2)}</p>
                              <Button size="sm" className="gap-1 bg-green-700 hover:bg-green-800 text-white"
                                onClick={() => handleMbMarkDelivered(order.id)}
                                data-testid={`btn-mark-delivered-${order.id}`}>
                                <CheckCircle className="w-3.5 h-3.5" /> Marcar Entregue
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Delivered orders history */}
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    {selectedMb.isContextMotoboy
                      ? `Histórico de Entregas (${finishedOrders.length})`
                      : `Rotas Concluídas (${selectedMb.completedTotal})`}
                  </h4>
                  {selectedMb.isContextMotoboy ? (
                    finishedOrders.length === 0 ? (
                      <Card className="p-6 text-center text-muted-foreground">Nenhuma entrega concluída.</Card>
                    ) : (
                      <div className="space-y-2">
                        {finishedOrders.map(order => {
                          const isExpanded = expandedOrders.has(order.id);
                          return (
                            <div key={order.id} className="border border-border rounded-xl overflow-hidden">
                              <button
                                className="w-full text-left px-4 py-3 flex flex-wrap items-center gap-3 hover:bg-secondary transition-colors"
                                onClick={() => toggleOrderExpand(order.id)}
                                data-testid={`delivery-row-${order.id}`}
                              >
                                <span className="font-mono text-xs text-muted-foreground w-20">#{order.id.slice(-6)}</span>
                                <span className="font-medium text-foreground flex-1 min-w-[100px]">{order.customerName}</span>
                                <span className="text-muted-foreground text-sm flex-1 min-w-[100px]">{order.storeName || order.storeId}</span>
                                <span className="font-semibold text-foreground">R$ {order.total.toFixed(2)}</span>
                                <Badge className="bg-green-100 text-green-800 flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> Entregue
                                </Badge>
                                <span className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</span>
                                <span className="text-xs text-primary">{isExpanded ? '▲' : '▼'}</span>
                              </button>
                              {isExpanded && (
                                <div className="border-t border-border bg-secondary/30 px-4 py-4 space-y-4">
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                                    <div className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" />{order.customerName}</div>
                                    {order.customerEmail && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-muted-foreground" />{order.customerEmail}</div>}
                                    {order.customerPhone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground" />{order.customerPhone}</div>}
                                  </div>
                                  {order.deliveryAddress && (
                                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                                      <MapPin className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                      <span>{order.deliveryAddress.logradouro}, {order.deliveryAddress.numero} — {order.deliveryAddress.bairro}, {order.deliveryAddress.cidade}/{order.deliveryAddress.uf}
                                        {order.distanceKm != null && ` (${order.distanceKm.toFixed(1)} km)`}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center gap-2 text-sm">
                                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                                    {order.paymentStatus === 'paid'
                                      ? <Badge className="bg-green-100 text-green-800">Pago</Badge>
                                      : <Badge className="bg-amber-100 text-amber-800">Aguardando pagamento</Badge>}
                                  </div>
                                  {order.deliveryCode && (
                                    <div className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-lg px-4 py-3">
                                      <KeyRound className="w-4 h-4 text-primary flex-shrink-0" />
                                      <div>
                                        <p className="text-xs text-muted-foreground">Código de Entrega</p>
                                        <p className="font-mono font-bold text-lg tracking-widest text-primary">{order.deliveryCode}</p>
                                      </div>
                                    </div>
                                  )}
                                  {order.statusHistory && order.statusHistory.length > 0 && (
                                    <div>
                                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Histórico de Status</p>
                                      <div className="space-y-1">
                                        {order.statusHistory.map((entry, idx) => (
                                          <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                                            {statusIcon(entry.status)}
                                            <span className="text-foreground font-medium">{statusLabel(entry.status)}</span>
                                            <span className="ml-auto">{fmtDateTime(entry.timestamp)}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )
                  ) : (
                    simRoutes.length === 0 ? (
                      <Card className="p-6 text-center text-muted-foreground">Nenhuma rota registrada.</Card>
                    ) : (
                      <div className="space-y-2">
                        {simRoutes.map(route => (
                          <Card key={route.id} className="p-4 flex flex-wrap items-center gap-3 justify-between">
                            <div>
                              <div className="flex items-center gap-2 text-sm">
                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">{route.from}</span>
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                <span>{route.to}</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">{new Date(route.completedAt).toLocaleString('pt-BR')}</p>
                            </div>
                            <span className="font-semibold text-foreground">R$ {route.value.toFixed(2)}</span>
                          </Card>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}

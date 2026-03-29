import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft, Navigation, MapPin, Phone, Bike, CalendarClock, Bell, Ban,
  ShieldOff, Eye, Wallet, Plus, Minus, Star, UserCheck, UserX, XCircle,
  CheckCircle, ChevronRight, Mail, User, CreditCard, KeyRound, Send,
} from 'lucide-react';
import { Order } from '@/lib/mockData';
import { AdminMotoboy } from './types';
import { CompletedRoute } from '@/contexts/MotoboyContext';

interface MotoboyTabProps {
  mbListWithContext: AdminMotoboy[];
  selectedMbId: string | null;
  setSelectedMbId: (id: string | null) => void;
  selectedMb: AdminMotoboy | null;
  mbDetailTab: 'profile' | 'orders';
  setMbDetailTab: (t: 'profile' | 'orders') => void;
  balanceDialog: { mbId: string; mbName: string } | null;
  setBalanceDialog: (v: { mbId: string; mbName: string } | null) => void;
  balanceAmount: string;
  setBalanceAmount: (v: string) => void;
  balanceType: 'add' | 'deduct';
  setBalanceType: (v: 'add' | 'deduct') => void;
  blockDialog: { mbId: string; mbName: string } | null;
  setBlockDialog: (v: { mbId: string; mbName: string } | null) => void;
  blockType: 'permanent' | 'hours' | 'days';
  setBlockType: (v: 'permanent' | 'hours' | 'days') => void;
  blockDuration: string;
  setBlockDuration: (v: string) => void;
  blockReason: string;
  setBlockReason: (v: string) => void;
  notifMbDialog: { mbId: string; mbName: string } | null;
  setNotifMbDialog: (v: { mbId: string; mbName: string } | null) => void;
  notifMbTitle: string;
  setNotifMbTitle: (v: string) => void;
  notifMbBody: string;
  setNotifMbBody: (v: string) => void;
  removeRouteConfirm: string | null;
  setRemoveRouteConfirm: (v: string | null) => void;
  handleMbBalance: () => void;
  handleMbBlock: () => void;
  handleMbUnblock: (mbId: string, mbName: string) => void;
  handleMbRemoveRoute: (mbId: string) => void;
  handleMbSendNotif: () => void;
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

export default function MotoboyTab({
  mbListWithContext,
  selectedMbId,
  setSelectedMbId,
  selectedMb,
  mbDetailTab,
  setMbDetailTab,
  balanceDialog,
  setBalanceDialog,
  balanceAmount,
  setBalanceAmount,
  balanceType,
  setBalanceType,
  blockDialog,
  setBlockDialog,
  blockType,
  setBlockType,
  blockDuration,
  setBlockDuration,
  blockReason,
  setBlockReason,
  notifMbDialog,
  setNotifMbDialog,
  notifMbTitle,
  setNotifMbTitle,
  notifMbBody,
  setNotifMbBody,
  removeRouteConfirm,
  setRemoveRouteConfirm,
  handleMbBalance,
  handleMbBlock,
  handleMbUnblock,
  handleMbRemoveRoute,
  handleMbSendNotif,
  handleMbMarkDelivered,
  expandedOrders,
  toggleOrderExpand,
  motoboyCompletedRoutes,
  allOrders,
  statusLabel,
  statusIcon,
  fmtDateTime,
  formatDate,
}: MotoboyTabProps) {
  return (
    <div className="space-y-6">
      {/* ── Platform KPIs row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Motoboys ativos</p>
          <p className="text-2xl font-bold text-green-700">{mbListWithContext.filter(m => m.status === 'available' || m.status === 'on_route').length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Em rota agora</p>
          <p className="text-2xl font-bold text-blue-700">{mbListWithContext.filter(m => m.status === 'on_route').length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Bloqueados</p>
          <p className="text-2xl font-bold text-red-600">{mbListWithContext.filter(m => m.status === 'blocked').length}</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">Entregas hoje</p>
          <p className="text-2xl font-bold text-primary">{mbListWithContext.reduce((s, m) => s + m.completedToday, 0)}</p>
        </Card>
      </div>

      {selectedMbId && selectedMb ? (
        /* ── DETAIL VIEW ─────────────────────────────────────────────── */
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
      ) : (
        /* ── MOTOBOY LIST ─────────────────────────────────────────────── */
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Bike className="w-5 h-5" /> Todos os Motoboys ({mbListWithContext.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {mbListWithContext.map(mb => (
              <Card key={mb.id} className="p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{mb.avatar}</div>
                    <div>
                      <p className="font-semibold text-foreground">{mb.name}</p>
                      <p className="text-xs text-muted-foreground">{mb.vehicle}</p>
                    </div>
                  </div>
                  <Badge className={
                    mb.status === 'available' ? 'bg-green-100 text-green-800' :
                    mb.status === 'on_route'  ? 'bg-blue-100 text-blue-800' :
                    mb.status === 'blocked'   ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-600'
                  }>
                    {mb.status === 'available' ? 'Disponível' :
                     mb.status === 'on_route'  ? 'Em rota' :
                     mb.status === 'blocked'   ? 'Bloqueado' : 'Indisponível'}
                  </Badge>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-secondary rounded-lg py-2">
                    <p className="text-muted-foreground">Hoje</p>
                    <p className="font-bold text-foreground">{mb.completedToday}</p>
                  </div>
                  <div className="bg-secondary rounded-lg py-2">
                    <p className="text-muted-foreground">Total</p>
                    <p className="font-bold text-foreground">{mb.completedTotal}</p>
                  </div>
                  <div className="bg-secondary rounded-lg py-2">
                    <p className="text-muted-foreground">⭐ Rating</p>
                    <p className="font-bold text-yellow-600">{mb.rating.toFixed(1)}</p>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{mb.phone}</span>
                </div>

                {/* Current route */}
                {mb.currentRoute && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2 text-xs">
                    <p className="text-blue-700 dark:text-blue-300 font-medium flex items-center gap-1">
                      <Navigation className="w-3.5 h-3.5" /> Em rota
                    </p>
                    <p className="text-muted-foreground mt-0.5 truncate">{mb.currentRoute.from} → {mb.currentRoute.to}</p>
                  </div>
                )}

                {/* Block info */}
                {mb.blockInfo && (
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 text-xs text-red-700 dark:text-red-300">
                    <p className="font-medium">🚫 {mb.blockInfo.type === 'permanent' ? 'Bloqueado permanentemente' : `Bloqueado até ${mb.blockInfo.until?.toLocaleString('pt-BR') ?? '?'}`}</p>
                    <p className="text-muted-foreground mt-0.5">Motivo: {mb.blockInfo.reason}</p>
                  </div>
                )}

                {/* Saldo bonus */}
                {mb.balanceBonus > 0 && (
                  <div className="flex items-center gap-1 text-xs text-green-700">
                    <Wallet className="w-3.5 h-3.5" /> Bônus acumulado: R$ {mb.balanceBonus.toFixed(2)}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1 mt-auto">
                  <Button size="sm" className="flex-1 gap-1"
                    onClick={() => { setSelectedMbId(mb.id); setMbDetailTab('profile'); }}
                    data-testid={`btn-manage-mb-${mb.id}`}>
                    <Eye className="w-3.5 h-3.5" /> Gerenciar
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1"
                    onClick={() => setNotifMbDialog({ mbId: mb.id, mbName: mb.name })}
                    data-testid={`btn-notif-mb-${mb.id}`}>
                    <Bell className="w-3.5 h-3.5" />
                  </Button>
                  {mb.status === 'blocked' ? (
                    <Button size="sm" variant="outline" className="gap-1 text-green-700 border-green-400"
                      onClick={() => handleMbUnblock(mb.id, mb.name)}
                      data-testid={`btn-unblock-mb-${mb.id}`}>
                      <UserCheck className="w-3.5 h-3.5" />
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" className="gap-1 text-orange-600 border-orange-400"
                      onClick={() => setBlockDialog({ mbId: mb.id, mbName: mb.name })}
                      data-testid={`btn-block-mb-${mb.id}`}>
                      <Ban className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ── Motoboy Dialogs ───────────────────────────────────────────────── */}

      {/* Balance Dialog */}
      <Dialog open={!!balanceDialog} onOpenChange={open => { if (!open) { setBalanceDialog(null); setBalanceAmount(''); setBalanceType('add'); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" />
              {balanceType === 'add' ? 'Creditar' : 'Debitar'} Saldo — {balanceDialog?.mbName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-2">
              <Button size="sm" className={balanceType === 'add' ? 'bg-green-700 text-white' : 'bg-secondary text-foreground'}
                onClick={() => setBalanceType('add')}>
                <Plus className="w-4 h-4 mr-1" /> Creditar
              </Button>
              <Button size="sm" className={balanceType === 'deduct' ? 'bg-red-600 text-white' : 'bg-secondary text-foreground'}
                onClick={() => setBalanceType('deduct')}>
                <Minus className="w-4 h-4 mr-1" /> Debitar
              </Button>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Valor (R$)</label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0,00"
                value={balanceAmount}
                onChange={e => setBalanceAmount(e.target.value)}
                data-testid="input-balance-amount"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBalanceDialog(null)}>Cancelar</Button>
            <Button
              className={balanceType === 'add' ? 'bg-green-700 hover:bg-green-800 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
              onClick={handleMbBalance}
              data-testid="btn-confirm-balance">
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Dialog */}
      <Dialog open={!!blockDialog} onOpenChange={open => { if (!open) { setBlockDialog(null); setBlockReason(''); setBlockDuration(''); setBlockType('permanent'); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-600" />
              Bloquear Motoboy — {blockDialog?.mbName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Tipo de Bloqueio</label>
              <Select value={blockType} onValueChange={(v: 'permanent' | 'hours' | 'days') => setBlockType(v)}>
                <SelectTrigger data-testid="select-block-type"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">Permanente</SelectItem>
                  <SelectItem value="hours">Por horas</SelectItem>
                  <SelectItem value="days">Por dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {blockType !== 'permanent' && (
              <div>
                <label className="text-sm font-medium text-foreground block mb-1">
                  Duração ({blockType === 'hours' ? 'horas' : 'dias'})
                </label>
                <Input
                  type="number"
                  min="1"
                  placeholder={blockType === 'hours' ? 'Ex: 24' : 'Ex: 7'}
                  value={blockDuration}
                  onChange={e => setBlockDuration(e.target.value)}
                  data-testid="input-block-duration"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Motivo</label>
              <Textarea
                placeholder="Descreva o motivo do bloqueio..."
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
                rows={3}
                data-testid="input-block-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialog(null)}>Cancelar</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white gap-2" onClick={handleMbBlock} data-testid="btn-confirm-block">
              <Ban className="w-4 h-4" /> Bloquear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Route Confirm Dialog */}
      <Dialog open={!!removeRouteConfirm} onOpenChange={open => { if (!open) setRemoveRouteConfirm(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" /> Retirar Rota do Motoboy
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            Tem certeza que deseja retirar a rota atual deste motoboy? A entrega em andamento pode ser afetada.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveRouteConfirm(null)}>Cancelar</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={() => removeRouteConfirm && handleMbRemoveRoute(removeRouteConfirm)} data-testid="btn-confirm-remove-route">
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notification to Motoboy Dialog */}
      <Dialog open={!!notifMbDialog} onOpenChange={open => { if (!open) { setNotifMbDialog(null); setNotifMbTitle(''); setNotifMbBody(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" /> Enviar Notificação — {notifMbDialog?.mbName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Título</label>
              <Input
                placeholder="Ex: Atenção necessária"
                value={notifMbTitle}
                onChange={e => setNotifMbTitle(e.target.value)}
                data-testid="input-notif-mb-title"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">Mensagem</label>
              <Textarea
                placeholder="Escreva a mensagem..."
                value={notifMbBody}
                onChange={e => setNotifMbBody(e.target.value)}
                rows={4}
                data-testid="input-notif-mb-body"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifMbDialog(null)}>Cancelar</Button>
            <Button className="gap-2" onClick={handleMbSendNotif} data-testid="btn-confirm-send-notif">
              <Send className="w-4 h-4" /> Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

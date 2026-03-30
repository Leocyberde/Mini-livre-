import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import React from 'react';
import {
  ArrowLeft, Bell, ShieldOff, ShieldCheck, Trash2, Filter, Eye,
  User, Mail, Phone, MapPin, Bike, Store, CreditCard, KeyRound,
  Package, CalendarClock, Navigation, Send,
} from 'lucide-react';
import { Order, Store as StoreData } from '@/lib/mockData';

interface StoresTabProps {
  allOrders: Order[];
  activeStatuses: Order['status'][];
  visibleStores: StoreData[];
  selectedStore: StoreData | null;
  selectedStoreId: string | null;
  setSelectedStoreId: (id: string | null) => void;
  blockedStores: Set<string>;
  deleteConfirm: { storeId: string; storeName: string } | null;
  setDeleteConfirm: (v: { storeId: string; storeName: string } | null) => void;
  notifDialog: { storeId: string; storeName: string } | null;
  setNotifDialog: (v: { storeId: string; storeName: string } | null) => void;
  notifTitle: string;
  setNotifTitle: (v: string) => void;
  notifBody: string;
  setNotifBody: (v: string) => void;
  storeOrderFilter: 'all' | 'active' | 'delivered' | 'cancelled';
  setStoreOrderFilter: (v: 'all' | 'active' | 'delivered' | 'cancelled') => void;
  expandedOrders: Set<string>;
  setExpandedOrders: (fn: (prev: Set<string>) => Set<string>) => void;
  getStoreFilteredOrders: (storeId: string) => Order[];
  handleDeleteStore: () => void;
  handleToggleBlock: (storeId: string, storeName: string) => void;
  handleSendNotification: () => void;
  handleAdminOrderStatus: (orderId: string, status: Order['status']) => void;
  statusLabel: (s: string) => string;
  statusIcon: (s: string) => React.ReactElement;
  getDoubleRouteLabel: (order: Order) => string | null;
  isDoubleRoute: (order: Order) => boolean;
  formatDate: (iso: string) => string;
}

export default function StoresTab({
  allOrders,
  activeStatuses,
  visibleStores,
  selectedStore,
  selectedStoreId,
  setSelectedStoreId,
  blockedStores,
  deleteConfirm,
  setDeleteConfirm,
  notifDialog,
  setNotifDialog,
  notifTitle,
  setNotifTitle,
  notifBody,
  setNotifBody,
  storeOrderFilter,
  setStoreOrderFilter,
  expandedOrders,
  setExpandedOrders,
  getStoreFilteredOrders,
  handleDeleteStore,
  handleToggleBlock,
  handleSendNotification,
  handleAdminOrderStatus,
  statusLabel,
  statusIcon,
  getDoubleRouteLabel,
  isDoubleRoute,
  formatDate,
}: StoresTabProps) {
  return (
    <div className="space-y-6">

      {/* ── Store Detail View ── */}
      {selectedStore ? (
        <div className="space-y-6">
          {/* Back + Header */}
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => { setSelectedStoreId(null); setStoreOrderFilter('all'); }}>
              <ArrowLeft className="w-4 h-4" /> Voltar às Lojas
            </Button>
            <div className="flex items-center gap-3 flex-1">
              {selectedStore.logo && selectedStore.logo.startsWith('data:') ? (
                <img src={selectedStore.logo} alt={selectedStore.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <span className="text-3xl">{selectedStore.logo}</span>
              )}
              <div>
                <h3 className="text-xl font-bold text-foreground">{selectedStore.name}</h3>
                <p className="text-sm text-muted-foreground">{selectedStore.category} · {selectedStore.location}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant="outline" className="gap-2"
                onClick={() => setNotifDialog({ storeId: selectedStore.id, storeName: selectedStore.name })}>
                <Bell className="w-4 h-4" /> Notificação
              </Button>
              <Button size="sm" variant="outline"
                className={`gap-2 ${blockedStores.has(selectedStore.id) ? 'text-green-700 border-green-400' : 'text-orange-700 border-orange-400'}`}
                onClick={() => handleToggleBlock(selectedStore.id, selectedStore.name)}>
                {blockedStores.has(selectedStore.id) ? <><ShieldCheck className="w-4 h-4" /> Reativar</> : <><ShieldOff className="w-4 h-4" /> Bloquear</>}
              </Button>
              <Button size="sm" variant="outline" className="gap-2 text-red-600 border-red-300 hover:bg-red-50"
                onClick={() => setDeleteConfirm({ storeId: selectedStore.id, storeName: selectedStore.name })}>
                <Trash2 className="w-4 h-4" /> Excluir Loja
              </Button>
            </div>
          </div>

          {/* Store Stats Summary */}
          {(() => {
            const storeOrders = allOrders.filter(o => o.storeId === selectedStore.id);
            const storeSales = storeOrders.reduce((s, o) => s + o.total, 0);
            const deliveredCount = storeOrders.filter(o => o.status === 'delivered').length;
            const activeCount = storeOrders.filter(o => activeStatuses.includes(o.status)).length;
            return (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Total de Pedidos</p>
                  <p className="text-2xl font-bold text-foreground">{storeOrders.length}</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Em Andamento</p>
                  <p className="text-2xl font-bold text-orange-600">{activeCount}</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Entregues</p>
                  <p className="text-2xl font-bold text-green-700">{deliveredCount}</p>
                </Card>
                <Card className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Faturamento Total</p>
                  <p className="text-xl font-bold text-primary">R$ {storeSales.toFixed(2)}</p>
                </Card>
              </div>
            );
          })()}

          {/* Store Info */}
          <Card className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Descrição</p>
                <p className="text-foreground">{selectedStore.description}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Avaliação</p>
                <p className="text-foreground font-semibold">{selectedStore.rating} ⭐ ({selectedStore.reviews} avaliações)</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                {blockedStores.has(selectedStore.id)
                  ? <Badge className="bg-red-100 text-red-800">Bloqueada</Badge>
                  : <Badge className="bg-green-100 text-green-800">Ativa</Badge>}
              </div>
            </div>
          </Card>

          {/* Order Filter + List */}
          <div>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">Filtrar pedidos:</p>
              {(['all', 'active', 'delivered', 'cancelled'] as const).map(f => (
                <Button key={f} size="sm" variant={storeOrderFilter === f ? 'default' : 'outline'}
                  onClick={() => setStoreOrderFilter(f)}>
                  {f === 'all' ? 'Todos' : f === 'active' ? 'Em andamento' : f === 'delivered' ? 'Entregues' : 'Cancelados'}
                </Button>
              ))}
            </div>

            {(() => {
              const filteredOrders = getStoreFilteredOrders(selectedStore.id);
              if (filteredOrders.length === 0) {
                return (
                  <Card className="p-10 text-center">
                    <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                    <p className="text-muted-foreground">Nenhum pedido encontrado para este filtro.</p>
                  </Card>
                );
              }
              return (
                <div className="space-y-3">
                  {[...filteredOrders].reverse().map(order => {
                    const isExpanded = expandedOrders.has(`store-${order.id}`);
                    return (
                      <Card key={order.id} className={`overflow-hidden border-l-4 ${
                        order.status === 'delivered' ? 'border-green-500' :
                        order.status === 'cancelled' ? 'border-red-400' :
                        order.status === 'pending' ? 'border-yellow-400' :
                        'border-primary'
                      }`}>
                        {/* Order Header */}
                        <div className="px-4 py-3 flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2 min-w-[110px]">
                            {statusIcon(order.status)}
                            <span className="font-mono text-xs text-muted-foreground">#{order.id.slice(-6).toUpperCase()}</span>
                          </div>
                          <div className="flex-1 min-w-[120px]">
                            <p className="font-semibold text-foreground text-sm">{order.customerName}</p>
                            <p className="text-xs text-muted-foreground">{order.customerEmail}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge className={`text-xs ${
                              order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                              order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                              order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {getDoubleRouteLabel(order) ?? statusLabel(order.status)}
                            </Badge>
                            {isDoubleRoute(order) && (
                              <Badge className="text-xs bg-purple-100 text-purple-800">🔄 Rota dupla</Badge>
                            )}
                            <span className="text-sm font-bold text-foreground">R$ {order.total.toFixed(2)}</span>
                            <span className="text-xs text-muted-foreground">{formatDate(order.createdAt)}</span>
                          </div>

                          {/* Status change (only for non-final statuses) */}
                          {order.status !== 'delivered' && order.status !== 'cancelled' && (
                            <Select
                              value={order.status}
                              onValueChange={(val) => handleAdminOrderStatus(order.id, val as Order['status'])}
                            >
                              <SelectTrigger className="w-[180px] h-8 text-xs" data-testid={`status-select-${order.id}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pendente</SelectItem>
                                <SelectItem value="preparing">Preparando</SelectItem>
                                <SelectItem value="ready">Pronto (Entrega)</SelectItem>
                                <SelectItem value="ready_for_pickup">Pronto (Retirada)</SelectItem>
                                <SelectItem value="waiting_motoboy">Aguardando Motoboy</SelectItem>
                                <SelectItem value="motoboy_accepted">Motoboy a caminho</SelectItem>
                                <SelectItem value="motoboy_at_store">Motoboy na loja</SelectItem>
                                <SelectItem value="on_the_way">Saiu para entrega</SelectItem>
                                <SelectItem value="motoboy_arrived">Motoboy chegou na entrega</SelectItem>
                                <SelectItem value="delivered">Entregue</SelectItem>
                                <SelectItem value="cancelled">Cancelado</SelectItem>
                              </SelectContent>
                            </Select>
                          )}

                          <button
                            className="text-xs text-primary hover:underline flex-shrink-0"
                            onClick={() => {
                              const key = `store-${order.id}`;
                              setExpandedOrders(prev => {
                                const next = new Set(prev);
                                if (next.has(key)) next.delete(key); else next.add(key);
                                return next;
                              });
                            }}
                            data-testid={`expand-order-${order.id}`}
                          >
                            {isExpanded ? '▲ Fechar' : '▼ Detalhes'}
                          </button>
                        </div>

                        {/* Expanded order detail */}
                        {isExpanded && (
                          <div className="border-t border-border bg-secondary/30 px-4 py-4 space-y-5">

                            {/* Cliente */}
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

                            {/* Entrega */}
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
                                </div>
                              )}
                            </div>

                            {/* Pagamento */}
                            <div>
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pagamento</p>
                              <div className="flex items-center gap-2 text-sm">
                                <CreditCard className="w-4 h-4 text-muted-foreground" />
                                {order.paymentStatus === 'paid'
                                  ? <Badge className="bg-green-100 text-green-800">Pago</Badge>
                                  : <Badge className="bg-amber-100 text-amber-800">Aguardando pagamento</Badge>}
                              </div>
                            </div>

                            {/* Itens */}
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

                            {/* Histórico de status */}
                            {order.statusHistory && order.statusHistory.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1">
                                  <CalendarClock className="w-3.5 h-3.5" /> Histórico de Status
                                </p>
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

                            {/* Código de entrega */}
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
                      </Card>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>

      ) : (
        /* ── Store Grid ── */
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-sm text-muted-foreground">
              {visibleStores.length} loja{visibleStores.length !== 1 ? 's' : ''} cadastrada{visibleStores.length !== 1 ? 's' : ''} ·{' '}
              {visibleStores.filter(s => blockedStores.has(s.id)).length} bloqueada{visibleStores.filter(s => blockedStores.has(s.id)).length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {visibleStores.map(store => {
              const storeOrders = allOrders.filter(o => o.storeId === store.id);
              const storeSales = storeOrders.reduce((s, o) => s + o.total, 0);
              const deliveredCount = storeOrders.filter(o => o.status === 'delivered').length;
              const activeCount = storeOrders.filter(o => activeStatuses.includes(o.status)).length;
              const isBlocked = blockedStores.has(store.id);

              return (
                <Card key={store.id} className={`p-6 hover:shadow-lg transition-all ${isBlocked ? 'opacity-60 border-red-200' : ''}`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      {store.logo && store.logo.startsWith('data:') ? (
                        <img src={store.logo} alt={store.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <span className="text-4xl">{store.logo}</span>
                      )}
                      <div>
                        <h4 className="font-semibold text-foreground">{store.name}</h4>
                        <p className="text-sm text-muted-foreground">{store.category}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Navigation className="w-3 h-3" /> {store.location}
                        </p>
                      </div>
                    </div>
                    {isBlocked
                      ? <Badge className="bg-red-100 text-red-800">Bloqueada</Badge>
                      : <Badge className="bg-green-100 text-green-800">Ativa</Badge>}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4 text-center">
                    <div className="bg-secondary rounded-lg p-2">
                      <p className="text-xs text-muted-foreground">Avaliação</p>
                      <p className="font-semibold text-foreground">{store.rating} ⭐</p>
                    </div>
                    <div className="bg-secondary rounded-lg p-2">
                      <p className="text-xs text-muted-foreground">Avaliações</p>
                      <p className="font-semibold text-foreground">{store.reviews}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-4 text-center">
                    <div className="bg-secondary rounded-lg p-2">
                      <p className="text-xs text-muted-foreground">Pedidos</p>
                      <p className="font-bold text-foreground">{storeOrders.length}</p>
                    </div>
                    <div className="bg-secondary rounded-lg p-2">
                      <p className="text-xs text-muted-foreground">Ativos</p>
                      <p className="font-bold text-orange-600">{activeCount}</p>
                    </div>
                    <div className="bg-secondary rounded-lg p-2">
                      <p className="text-xs text-muted-foreground">Entregues</p>
                      <p className="font-bold text-green-700">{deliveredCount}</p>
                    </div>
                    <div className="bg-secondary rounded-lg p-2">
                      <p className="text-[10px] text-muted-foreground">Vendas</p>
                      <p className="font-bold text-primary text-xs">R$ {storeSales.toFixed(2)}</p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" className="gap-1.5 flex-1"
                      onClick={() => { setSelectedStoreId(store.id); setStoreOrderFilter('all'); }}
                      data-testid={`view-store-${store.id}`}>
                      <Eye className="w-3.5 h-3.5" /> Ver Pedidos
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5"
                      onClick={() => setNotifDialog({ storeId: store.id, storeName: store.name })}
                      data-testid={`notify-store-${store.id}`}>
                      <Bell className="w-3.5 h-3.5" /> Notificar
                    </Button>
                    <Button size="sm" variant="outline"
                      className={`gap-1.5 ${isBlocked ? 'text-green-700 border-green-300' : 'text-orange-700 border-orange-300'}`}
                      onClick={() => handleToggleBlock(store.id, store.name)}
                      data-testid={`block-store-${store.id}`}>
                      {isBlocked ? <><ShieldCheck className="w-3.5 h-3.5" /> Reativar</> : <><ShieldOff className="w-3.5 h-3.5" /> Bloquear</>}
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => setDeleteConfirm({ storeId: store.id, storeName: store.name })}
                      data-testid={`delete-store-${store.id}`}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="w-5 h-5" /> Excluir Loja
            </DialogTitle>
          </DialogHeader>
          <p className="text-foreground">
            Tem certeza que deseja excluir a loja <span className="font-bold">"{deleteConfirm?.storeName}"</span> da plataforma?
            Esta ação não pode ser desfeita.
          </p>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white gap-2" onClick={handleDeleteStore}>
              <Trash2 className="w-4 h-4" /> Confirmar Exclusão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Send Notification Dialog ── */}
      <Dialog open={!!notifDialog} onOpenChange={() => { setNotifDialog(null); setNotifTitle(''); setNotifBody(''); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Enviar Notificação — {notifDialog?.storeName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Título</label>
              <input
                type="text"
                value={notifTitle}
                onChange={e => setNotifTitle(e.target.value)}
                placeholder="Ex: Atenção — Atualização importante"
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
                data-testid="input-notif-title"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Mensagem</label>
              <textarea
                value={notifBody}
                onChange={e => setNotifBody(e.target.value)}
                placeholder="Digite a mensagem para a loja..."
                rows={4}
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                data-testid="input-notif-body"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => { setNotifDialog(null); setNotifTitle(''); setNotifBody(''); }}>Cancelar</Button>
            <Button
              className="gap-2"
              disabled={!notifTitle.trim() || !notifBody.trim()}
              onClick={handleSendNotification}
              data-testid="button-send-notif"
            >
              <Send className="w-4 h-4" /> Enviar Notificação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

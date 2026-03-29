import React from 'react';
import {
  Clock, ChefHat, Package, Store, Bike, Navigation, CheckCircle, AlertCircle,
} from 'lucide-react';
import { Order } from '@/lib/mockData';
import { ActiveDeliveryRoute } from '@/contexts/MarketplaceContext';

export function statusLabel(s: string): string {
  return ({
    pending: 'Pendente', preparing: 'Preparando', ready: 'Pronto',
    ready_for_pickup: 'Pronto para retirada', waiting_motoboy: 'Aguardando motoboy',
    motoboy_accepted: 'Motoboy a caminho', motoboy_at_store: 'Motoboy na loja',
    on_the_way: 'Motoboy saiu para entrega', motoboy_arrived: 'Motoboy chegou na entrega',
    delivered: 'Entregue', cancelled: 'Cancelado',
  } as Record<string, string>)[s] ?? s;
}

export function statusIcon(s: string): React.ReactElement {
  switch (s) {
    case 'pending': return <Clock className="w-3.5 h-3.5 text-yellow-600" />;
    case 'preparing': return <ChefHat className="w-3.5 h-3.5 text-orange-500" />;
    case 'ready': return <Package className="w-3.5 h-3.5 text-green-600" />;
    case 'ready_for_pickup': return <Store className="w-3.5 h-3.5 text-teal-600" />;
    case 'waiting_motoboy': return <Bike className="w-3.5 h-3.5 text-purple-600" />;
    case 'motoboy_accepted': return <Navigation className="w-3.5 h-3.5 text-indigo-600" />;
    case 'motoboy_at_store': return <Navigation className="w-3.5 h-3.5 text-teal-600" />;
    case 'on_the_way': return <Navigation className="w-3.5 h-3.5 text-green-600" />;
    case 'motoboy_arrived': return <Navigation className="w-3.5 h-3.5 text-orange-600" />;
    case 'delivered': return <CheckCircle className="w-3.5 h-3.5 text-blue-600" />;
    case 'cancelled': return <AlertCircle className="w-3.5 h-3.5 text-red-600" />;
    default: return <Package className="w-3.5 h-3.5 text-gray-600" />;
  }
}

export function fmtDateTime(ts: string | null | undefined): string {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

export function formatDate(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export function getTimestampForStatus(
  order: { statusHistory?: { status: string; timestamp: string }[] },
  status: string
): string | null {
  if (!order.statusHistory) return null;
  return order.statusHistory.find(e => e.status === status)?.timestamp ?? null;
}

export function getDoubleRouteLabel(
  order: Order,
  activeDeliveryRoutes: ActiveDeliveryRoute[],
  allOrders: Order[]
): string | null {
  if (order.status !== 'on_the_way') return null;
  const route = activeDeliveryRoutes.find(r => r.routeType === 'double' && r.orderIds.includes(order.id));
  if (!route) return null;
  const idx = route.orderIds.indexOf(order.id);
  const otherOrderId = route.orderIds.find(id => id !== order.id);
  const otherOrder = otherOrderId ? allOrders.find(o => o.id === otherOrderId) : undefined;
  if (idx === 0) return 'Indo para 1ª entrega de 2';
  return otherOrder?.status === 'delivered'
    ? 'Indo para 2ª entrega (1ª finalizada)'
    : 'Indo para 2ª entrega';
}

export function isDoubleRoute(order: Order, activeDeliveryRoutes: ActiveDeliveryRoute[]): boolean {
  return activeDeliveryRoutes.some(r => r.routeType === 'double' && r.orderIds.includes(order.id));
}

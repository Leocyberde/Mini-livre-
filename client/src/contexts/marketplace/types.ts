export type UserMode = 'client' | 'seller' | 'admin' | 'motoboy';

export interface DeliveryRoute {
  id: string;
  storeId: string;
  orderIds: string[];
  routeType: 'single' | 'double';
}

export interface ActiveDeliveryRoute {
  routeId: string;
  storeId: string;
  orderIds: string[];
  routeType: 'single' | 'double';
}

export interface GroupingSlot {
  orderId: string;
  storeId: string;
  readyPaidAt: number;
}

export interface DispatchEntry {
  routeId: string;
  orderIds: string[];
  rejectionCount: number;
  lastRejectedAt: number | null;
  rejectedByMotoboyIds: string[];
  cooldownByMotoboyId: Record<string, number>;
}

export interface PersistedDispatchEntry {
  routeId: string;
  storeId: string;
  orderIds: string[];
  routeType: 'single' | 'double';
  rejectionCount: number;
  lastRejectedAt: number | null;
  rejectedByMotoboyIds: string[];
  cooldownByMotoboyId: Record<string, number>;
}

export const GROUPING_WINDOW_MS = 10 * 60 * 1000;
export const MAX_DELIVERY_DISTANCE_KM = 5;

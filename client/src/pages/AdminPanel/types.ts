export interface AdminMotoboy {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  vehicle: string;
  licensePlate: string;
  status: 'available' | 'on_route' | 'unavailable' | 'blocked';
  blockInfo?: { type: 'permanent' | 'hours' | 'days'; until?: Date; reason: string };
  balanceBonus: number;
  completedToday: number;
  completedTotal: number;
  rejectedTotal: number;
  currentRoute?: { from: string; to: string; orderId?: string };
  joinedAt: string;
  rating: number;
  isContextMotoboy?: boolean;
}

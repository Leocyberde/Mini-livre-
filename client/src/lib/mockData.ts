/**
 * Data types and utility functions for Marketplace Regional
 */

export interface StoreAddress {
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  uf?: string;
}

export interface Store {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviews: number;
  location: string;
  address?: string;
  addressData?: StoreAddress;
  phone?: string;
  email?: string;
  description: string;
  logo?: string;
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  imageUrl?: string;
  imageUrls?: string[];
  category: string;
  stock: number;
  rating: number;
  reviews: number;
  description: string;
  frozen?: boolean;
}

export interface CartItem {
  productId: string;
  storeId: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  storeId: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'preparing' | 'ready' | 'ready_for_pickup' | 'waiting_motoboy' | 'motoboy_accepted' | 'motoboy_at_store' | 'on_the_way' | 'motoboy_arrived' | 'delivered' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  deliveryCode?: string;
  isPickup?: boolean;
  paymentStatus?: 'pending_payment' | 'paid';
  deliveryAddress?: {
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
  };
  deliveryCoords?: [number, number];
  distanceKm?: number;
  motoRideValue?: number;
  storeName?: string;
  storeAddress?: string;
  storeCoords?: [number, number];
  statusHistory?: { status: string; timestamp: string }[];
  deliveredAt?: string;
  motoboyId?: string;
}

export const mockStoreCoords: Record<string, [number, number]> = {};

const SP_BAIRRO_COORDS: Record<string, [number, number]> = {
  'centro': [-23.5505, -46.6333],
  'vila mariana': [-23.5929, -46.6373],
  'pinheiros': [-23.5676, -46.6927],
  'jardins': [-23.5700, -46.6597],
  'moema': [-23.6012, -46.6651],
  'itaim bibi': [-23.5858, -46.6789],
  'brooklin': [-23.6198, -46.6886],
  'campo belo': [-23.6188, -46.6644],
  'santana': [-23.5091, -46.6280],
  'tatuapé': [-23.5393, -46.5719],
  'morumbi': [-23.6134, -46.7213],
  'lapa': [-23.5219, -46.7033],
  'perdizes': [-23.5339, -46.6665],
  'higienópolis': [-23.5462, -46.6582],
  'consolação': [-23.5558, -46.6569],
  'bela vista': [-23.5587, -46.6447],
  'liberdade': [-23.5592, -46.6353],
  'aclimação': [-23.5702, -46.6311],
  'cambuci': [-23.5716, -46.6196],
  'ipiranga': [-23.5891, -46.6086],
  'saúde': [-23.5986, -46.6234],
  'jabaquara': [-23.6327, -46.6426],
  'santo amaro': [-23.6512, -46.7130],
  'campo limpo': [-23.6574, -46.7617],
  'vila leopoldina': [-23.5299, -46.7301],
  'barra funda': [-23.5275, -46.6751],
  'pompeia': [-23.5320, -46.6804],
  'sumaré': [-23.5434, -46.6752],
  'vila madalena': [-23.5558, -46.6936],
  'alto de pinheiros': [-23.5488, -46.7169],
  'butantã': [-23.5695, -46.7269],
  'raposo tavares': [-23.5724, -46.7652],
  'vila sônia': [-23.5902, -46.7442],
  'jardim paulista': [-23.5773, -46.6701],
  'jardim paulistano': [-23.5690, -46.6834],
  'mooca': [-23.5456, -46.6006],
  'belém': [-23.5248, -46.5778],
  'penha': [-23.5099, -46.5402],
  'guarulhos': [-23.4630, -46.5333],
  'osasco': [-23.5329, -46.7920],
  'são bernardo': [-23.6900, -46.5650],
  'são caetano': [-23.6200, -46.5500],
  'santo andré': [-23.6738, -46.5433],
};

export function getBairroCoords(bairro: string): [number, number] | null {
  const key = bairro.toLowerCase().trim();
  return SP_BAIRRO_COORDS[key] ?? null;
}

export type MotoboyStatus = 'available' | 'on_route' | 'unavailable' | 'blocked';

export interface Motoboy {
  id: string;
  name: string;
  avatar: string;
  phone: string;
  vehicle: string;
  licensePlate: string;
  status: MotoboyStatus;
  blockInfo?: { type: 'permanent' | 'hours' | 'days'; until?: string; reason: string };
  joinedAt: string;
  rating: number;
  completedTotal: number;
  rejectedTotal: number;
}


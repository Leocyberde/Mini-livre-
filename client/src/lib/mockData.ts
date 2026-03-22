/**
 * Mock Data for Marketplace Regional
 * Contains stores, products, orders, and categories
 */

export interface Store {
  id: string;
  name: string;
  category: string;
  rating: number;
  reviews: number;
  location: string;
  address?: string;
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
  imageUrl?: string; // URL da imagem enviada
  category: string;
  stock: number;
  rating: number;
  reviews: number;
  description: string;
  frozen?: boolean; // Produto congelado (não disponível)
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
  status: 'pending' | 'preparing' | 'ready' | 'ready_for_pickup' | 'waiting_motoboy' | 'motoboy_accepted' | 'motoboy_at_store' | 'on_the_way' | 'delivered' | 'cancelled';
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
}

export const mockStoreCoords: Record<string, [number, number]> = {
  'store-1': [-23.5505, -46.6333],
  'store-2': [-23.5929, -46.6556],
  'store-3': [-23.5475, -46.6188],
  'store-4': [-23.5614, -46.6559],
};

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

export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
}

// Mock Stores
export const mockStores: Store[] = [
  {
    id: 'store-1',
    name: 'TechHub Eletrônicos',
    category: 'Eletrônicos',
    rating: 4.8,
    reviews: 324,
    location: 'Centro - São Paulo',
    address: 'Rua Angelo Geromel, 123, Centro, São Paulo, SP',
    description: 'Loja especializada em eletrônicos de qualidade com melhor preço da região',
    logo: '📱',
  },
  {
    id: 'store-2',
    name: 'Papelaria Premium',
    category: 'Papelaria',
    rating: 4.6,
    reviews: 156,
    location: 'Vila Mariana - São Paulo',
    address: 'Rua Angelo Geromel, 456, Vila Mariana, São Paulo, SP',
    description: 'Artigos de papelaria e escritório para profissionais e estudantes',
    logo: '📝',
  },
  {
    id: 'store-3',
    name: 'Adega Regional',
    category: 'Bebidas',
    rating: 4.9,
    reviews: 287,
    location: 'Pinheiros - São Paulo',
    address: 'Rua Angelo Geromel, 789, Pinheiros, São Paulo, SP',
    description: 'Seleção premium de vinhos, cervejas artesanais e bebidas importadas',
    logo: '🍷',
  },
];

// Mock Products
export const mockProducts: Product[] = [
  // TechHub Eletrônicos
  {
    id: 'prod-1',
    storeId: 'store-1',
    name: 'Fone Bluetooth Premium',
    price: 189.90,
    originalPrice: 249.90,
    image: '🎧',
    category: 'Áudio',
    stock: 45,
    rating: 4.7,
    reviews: 89,
    description: 'Fone com cancelamento de ruído ativo e bateria de 30h',
  },
  {
    id: 'prod-2',
    storeId: 'store-1',
    name: 'Carregador Rápido 65W',
    price: 79.90,
    originalPrice: 119.90,
    image: '🔌',
    category: 'Acessórios',
    stock: 120,
    rating: 4.5,
    reviews: 234,
    description: 'Carregador USB-C com suporte a múltiplos dispositivos',
  },
  {
    id: 'prod-3',
    storeId: 'store-1',
    name: 'Webcam 4K',
    price: 349.90,
    originalPrice: 499.90,
    image: '📹',
    category: 'Periféricos',
    stock: 28,
    rating: 4.8,
    reviews: 156,
    description: 'Webcam 4K com microfone integrado para streaming',
  },
  {
    id: 'prod-4',
    storeId: 'store-1',
    name: 'Mouse Gamer RGB',
    price: 129.90,
    originalPrice: 199.90,
    image: '🖱️',
    category: 'Periféricos',
    stock: 67,
    rating: 4.6,
    reviews: 145,
    description: 'Mouse com 12000 DPI e iluminação RGB personalizável',
  },
  {
    id: 'prod-5',
    storeId: 'store-1',
    name: 'Teclado Mecânico',
    price: 299.90,
    originalPrice: 449.90,
    image: '⌨️',
    category: 'Periféricos',
    stock: 34,
    rating: 4.9,
    reviews: 267,
    description: 'Teclado mecânico com switches Cherry MX',
  },

  // Papelaria Premium
  {
    id: 'prod-6',
    storeId: 'store-2',
    name: 'Caderno Executivo 200 folhas',
    price: 34.90,
    originalPrice: 49.90,
    image: '📓',
    category: 'Cadernos',
    stock: 200,
    rating: 4.4,
    reviews: 78,
    description: 'Caderno premium com papel de qualidade superior',
  },
  {
    id: 'prod-7',
    storeId: 'store-2',
    name: 'Caneta Gel Premium (caixa 12)',
    price: 24.90,
    originalPrice: 34.90,
    image: '✏️',
    category: 'Canetas',
    stock: 150,
    rating: 4.5,
    reviews: 112,
    description: 'Canetas gel de secagem rápida com tinta premium',
  },
  {
    id: 'prod-8',
    storeId: 'store-2',
    name: 'Marcadores Coloridos (24 cores)',
    price: 39.90,
    originalPrice: 59.90,
    image: '🖍️',
    category: 'Marcadores',
    stock: 89,
    rating: 4.6,
    reviews: 95,
    description: 'Conjunto de marcadores com cores vibrantes',
  },
  {
    id: 'prod-9',
    storeId: 'store-2',
    name: 'Fichário Profissional',
    price: 89.90,
    originalPrice: 129.90,
    image: '📂',
    category: 'Organizadores',
    stock: 45,
    rating: 4.7,
    reviews: 67,
    description: 'Fichário com divisórias e fechadura',
  },
  {
    id: 'prod-10',
    storeId: 'store-2',
    name: 'Post-it Premium (bloco 100 folhas)',
    price: 12.90,
    originalPrice: 17.90,
    image: '📌',
    category: 'Adesivos',
    stock: 300,
    rating: 4.3,
    reviews: 156,
    description: 'Post-it com adesivo resistente e durável',
  },

  // Adega Regional
  {
    id: 'prod-11',
    storeId: 'store-3',
    name: 'Vinho Tinto Reserva',
    price: 89.90,
    originalPrice: 129.90,
    image: '🍷',
    category: 'Vinhos',
    stock: 78,
    rating: 4.8,
    reviews: 234,
    description: 'Vinho tinto de excelente qualidade com 12 anos de envelhecimento',
  },
  {
    id: 'prod-12',
    storeId: 'store-3',
    name: 'Cerveja Artesanal IPA (6 unidades)',
    price: 54.90,
    originalPrice: 74.90,
    image: '🍺',
    category: 'Cervejas',
    stock: 120,
    rating: 4.6,
    reviews: 189,
    description: 'Cerveja artesanal com lúpulo importado',
  },
  {
    id: 'prod-13',
    storeId: 'store-3',
    name: 'Espumante Premium',
    price: 119.90,
    originalPrice: 169.90,
    image: '🥂',
    category: 'Espumantes',
    stock: 56,
    rating: 4.9,
    reviews: 145,
    description: 'Espumante francês com bolhas finas',
  },
  {
    id: 'prod-14',
    storeId: 'store-3',
    name: 'Whisky Importado 750ml',
    price: 199.90,
    originalPrice: 279.90,
    image: '🥃',
    category: 'Destilados',
    stock: 34,
    rating: 4.7,
    reviews: 98,
    description: 'Whisky escocês de 12 anos de envelhecimento',
  },
  {
    id: 'prod-15',
    storeId: 'store-3',
    name: 'Suco Premium Natural (1L)',
    price: 19.90,
    originalPrice: 29.90,
    image: '🧃',
    category: 'Bebidas',
    stock: 200,
    rating: 4.5,
    reviews: 167,
    description: 'Suco natural sem conservantes',
  },
];

// Mock Categories
export const mockCategories: Category[] = [
  {
    id: 'cat-1',
    name: 'Eletrônicos',
    icon: '📱',
    description: 'Tecnologia e eletrônicos',
  },
  {
    id: 'cat-2',
    name: 'Papelaria',
    icon: '📝',
    description: 'Artigos de escritório',
  },
  {
    id: 'cat-3',
    name: 'Bebidas',
    icon: '🍷',
    description: 'Bebidas premium',
  },
  {
    id: 'cat-4',
    name: 'Alimentos',
    icon: '🍽️',
    description: 'Alimentos e bebidas',
  },
  {
    id: 'cat-5',
    name: 'Livros',
    icon: '📚',
    description: 'Livros e publicações',
  },
  {
    id: 'cat-6',
    name: 'Moda',
    icon: '👕',
    description: 'Roupas e acessórios',
  },
];

// Helper functions
export function getStoreById(storeId: string): Store | undefined {
  return mockStores.find(s => s.id === storeId);
}

export function getProductsByStore(storeId: string): Product[] {
  return mockProducts.filter(p => p.storeId === storeId);
}

export function getProductById(productId: string): Product | undefined {
  return mockProducts.find(p => p.id === productId);
}

export function searchProducts(query: string): Product[] {
  const lowerQuery = query.toLowerCase();
  return mockProducts.filter(p =>
    p.name.toLowerCase().includes(lowerQuery) ||
    p.description.toLowerCase().includes(lowerQuery) ||
    p.category.toLowerCase().includes(lowerQuery)
  );
}

export function getProductsByCategory(category: string): Product[] {
  return mockProducts.filter(p => p.category === category);
}

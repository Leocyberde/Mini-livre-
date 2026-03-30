import { useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useStores } from '@/contexts/StoresContext';
import { useProducts } from '@/contexts/ProductContext';
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useNotification } from '@/contexts/NotificationContext';
import { useReview } from '@/contexts/ReviewContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCep } from '@/hooks/useCep';
import {
  Search, Star, ShoppingCart as CartIcon,
  ChevronRight, Bell, Package, Headphones,
  ClipboardList, User, Check, X, Store, Bike, Loader2, Images,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ProductDetailModal from '@/components/ProductDetailModal';
import ProductPhotoGallery from '@/components/ProductPhotoGallery';
import { Product } from '@/lib/mockData';

const CATEGORY_EMOJI: Record<string, string> = {
  'Cadernos': '📓', 'Canetas': '🖊️', 'Acessórios': '🎒', 'Cervejas': '🍺',
  'Espumantes': '🍾', 'Organizadores': '🗂️', 'Áudio': '🎧', 'Marcadores': '🖍️',
  'Periféricos': '⌨️', 'Adesivos': '🏷️', 'Bebidas': '🥤', 'Vinhos': '🍷',
  'Destilados': '🥃', 'Alimentos': '🍱', 'Roupas': '👕', 'Eletrônicos': '📱',
  'Livros': '📚', 'Beleza': '💄', 'Saúde': '💊', 'Casa': '🏠', 'Brinquedos': '🧸',
};

function getCategoryEmoji(cat: string): string {
  return CATEGORY_EMOJI[cat] ?? '🏷️';
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
        >
          <Star className={`w-6 h-6 transition-colors ${star <= (hovered || value) ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
        </button>
      ))}
    </div>
  );
}

function ReviewRequestCard({
  notifId, orderId, storeId, storeName, productId, timestamp, read,
}: {
  notifId: string; orderId: string; storeId: string; storeName: string;
  productId: string; timestamp: string; read: boolean;
}) {
  const { addProductReview, addStoreReview, hasReviewedOrder } = useReview();
  const { markRead } = useNotification();
  const { products } = useProducts();
  const { user } = useAuth();
  const [storeRating, setStoreRating] = useState(0);
  const [productRating, setProductRating] = useState(0);
  const [storeMessage, setStoreMessage] = useState('');
  const [productMessage, setProductMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const alreadyReviewed = hasReviewedOrder(orderId);
  const product = products.find(p => p.id === productId);
  const clientName = user?.name || 'Cliente';

  const handleSubmit = () => {
    if (storeRating === 0) { toast.error('Por favor, avalie a loja antes de enviar.'); return; }
    addStoreReview({ storeId, storeName, orderId, rating: storeRating, message: storeMessage, clientName });
    if (productId && productRating > 0 && product) {
      addProductReview({ productId, productName: product.name, storeId, rating: productRating, message: productMessage, clientName });
    }
    markRead(notifId);
    setSubmitted(true);
    toast.success('Avaliação enviada! Obrigado pelo feedback.');
  };

  if (alreadyReviewed || submitted) {
    return (
      <div className="rounded-2xl border bg-green-50 border-green-100 p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
          <Check className="w-5 h-5 text-green-600" />
        </div>
        <div>
          <p className="font-semibold text-sm text-green-800">Avaliação enviada!</p>
          <p className="text-xs text-green-700 mt-0.5">Obrigado pelo seu feedback sobre {storeName}.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border transition-all ${read ? 'bg-card border-border' : 'bg-amber-50 border-amber-200'}`}>
      <div className="flex items-start gap-3 p-4">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <Star className="w-5 h-5 text-amber-500" />
        </div>
        <div className="flex-1">
          <p className={`font-semibold text-sm ${read ? 'text-foreground' : 'text-amber-800'}`}>
            Avalie sua experiência com {storeName}!
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Seu pedido foi concluído. Como foi?</p>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        {!read && <div className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0 mt-1" />}
      </div>

      <div className="px-4 pb-4 space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Loja <span className="text-primary">{storeName}</span></p>
          <StarPicker value={storeRating} onChange={setStoreRating} />
          <textarea
            className="w-full text-sm border border-border rounded-xl p-3 bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            rows={2}
            placeholder="Comentário sobre a loja (opcional)..."
            value={storeMessage}
            onChange={e => setStoreMessage(e.target.value)}
            data-testid={`input-store-review-${orderId}`}
          />
        </div>
        {product && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Produto <span className="text-primary">{product.name}</span></p>
            <StarPicker value={productRating} onChange={setProductRating} />
            <textarea
              className="w-full text-sm border border-border rounded-xl p-3 bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              rows={2}
              placeholder="Comentário sobre o produto (opcional)..."
              value={productMessage}
              onChange={e => setProductMessage(e.target.value)}
              data-testid={`input-product-review-${orderId}`}
            />
          </div>
        )}
        <button
          className="w-full bg-primary text-white text-sm font-semibold rounded-xl py-2.5 px-4 hover:bg-primary/90 transition-colors disabled:opacity-40"
          disabled={storeRating === 0}
          onClick={handleSubmit}
          data-testid={`btn-submit-review-${orderId}`}
        >
          Enviar avaliação
        </button>
      </div>
    </div>
  );
}

export default function ClientPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { addToCart } = useMarketplace();
  const { products } = useProducts();
  const { sellerProfile } = useProfile();
  const { getStoreById } = useStores();
  const { notifications, markAllRead, markRead, clientUnread } = useNotification();
  const [galleryProduct, setGalleryProduct] = useState<Product | null>(null);
  const [, navigate] = useLocation();
  const search = useSearch();
  const { user, addRole, hasRole } = useAuth();
  const { fetchCep, formatCep, loading: cepLoading } = useCep();

  const [showCreateStore, setShowCreateStore] = useState(false);
  const [showBecomeMotoboy, setShowBecomeMotoboy] = useState(false);
  const [storeLoading, setStoreLoading] = useState(false);
  const [motoboyLoading, setMotoboyLoading] = useState(false);
  const [storeForm, setStoreForm] = useState({
    cnpj: '', storeName: '', storeDescription: '', storeCategory: '',
    cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', uf: '',
    useExistingAddress: false,
  });
  const [motoboyForm, setMotoboyForm] = useState({ vehicle: '', licensePlate: '', agreed: false });

  const handleStoreCepBlur = async () => {
    if (storeForm.useExistingAddress) return;
    const clean = storeForm.cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    const addr = await fetchCep(clean);
    if (addr) {
      setStoreForm(prev => ({ ...prev, logradouro: addr.logradouro, bairro: addr.bairro, cidade: addr.localidade, uf: addr.uf }));
    }
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeForm.storeName.trim()) { toast.error('Nome da loja é obrigatório'); return; }
    setStoreLoading(true);
    const address = storeForm.useExistingAddress
      ? (user?.address ?? {})
      : { cep: storeForm.cep, logradouro: storeForm.logradouro, numero: storeForm.numero, complemento: storeForm.complemento, bairro: storeForm.bairro, cidade: storeForm.cidade, uf: storeForm.uf };
    const result = await addRole('seller', {
      storeData: {
        cnpj: storeForm.cnpj,
        storeName: storeForm.storeName,
        storeDescription: storeForm.storeDescription,
        storeCategory: storeForm.storeCategory,
        address,
      },
    });
    setStoreLoading(false);
    if (!result.success) { toast.error(result.error || 'Erro ao criar loja'); return; }
    toast.success('Loja criada com sucesso! Acesse o painel de Lojista.');
    setShowCreateStore(false);
  };

  const handleBecomeMotoboy = async () => {
    if (!motoboyForm.agreed) { toast.error('Você precisa aceitar as regras'); return; }
    setMotoboyLoading(true);
    const result = await addRole('motoboy', {
      motoboyData: { vehicle: motoboyForm.vehicle, licensePlate: motoboyForm.licensePlate },
    });
    setMotoboyLoading(false);
    if (!result.success) { toast.error(result.error || 'Erro ao se cadastrar como entregador'); return; }
    toast.success('Cadastro como entregador realizado! Acesse o painel de Motoboy.');
    setShowBecomeMotoboy(false);
  };

  const bottomTab = new URLSearchParams(search).get('tab') || 'home';

  const activeProducts = products.filter(p => !p.frozen);

  let displayProducts = activeProducts;
  if (searchQuery) {
    displayProducts = activeProducts.filter(p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  } else if (selectedCategory) {
    displayProducts = activeProducts.filter(p => p.category === selectedCategory);
  }

  const handleAddToCart = (e: React.MouseEvent, productId: string, storeId: string, price: number) => {
    e.stopPropagation();
    addToCart({ productId, storeId, quantity: 1, price });
    toast.success('Adicionado ao carrinho!');
  };

  const handleAddToCartModal = (productId: string, storeId: string, price: number) => {
    addToCart({ productId, storeId, quantity: 1, price });
    toast.success('Adicionado ao carrinho!');
  };

  const handleBuyNow = (productId: string, storeId: string, price: number) => {
    addToCart({ productId, storeId, quantity: 1, price });
    toast.success('Produto adicionado! Redirecionando para o carrinho...');
    navigate('/cart');
  };

  const handleOpenProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  const categories = Array.from(new Set(activeProducts.map(p => p.category)));
  const clientNotifications = [...notifications].filter(n => n.target === 'client').reverse();

  return (
    <div className="min-h-screen bg-[#F8F9FC]">

      {/* ── HOME TAB ── */}
      {bottomTab === 'home' && (
        <>
          {/* Hero compacto */}
          <div className="bg-gradient-to-br from-[#1E40AF] to-[#3B82F6] px-4 pt-6 pb-8">
            <div className="mb-5">
              <p className="text-blue-200 text-sm font-medium">
                Olá{user?.name ? `, ${user.name.split(' ')[0]}` : ''}! 👋
              </p>
              <h2 className="text-white text-2xl font-bold mt-0.5 leading-tight">
                Marketplace Regional
              </h2>
              <p className="text-blue-200 text-sm mt-1">Encontre os melhores produtos locais</p>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Buscar produtos..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSelectedCategory(null); }}
                className="w-full pl-11 pr-4 py-3.5 bg-white rounded-2xl text-sm text-foreground placeholder:text-muted-foreground shadow-lg focus:outline-none focus:ring-2 focus:ring-white/40"
                data-testid="input-search-products"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Categories — horizontal scroll */}
          <div className="px-4 pt-5 pb-2">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none" style={{ scrollbarWidth: 'none' }}>
              <button
                onClick={() => { setSelectedCategory(null); setSearchQuery(''); }}
                className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                  selectedCategory === null && !searchQuery
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-white text-foreground border border-border hover:border-primary/30'
                }`}
                data-testid="btn-category-all"
              >
                <span>✨</span> Todos
              </button>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => { setSelectedCategory(cat); setSearchQuery(''); }}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    selectedCategory === cat
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-white text-foreground border border-border hover:border-primary/30'
                  }`}
                  data-testid={`btn-category-${cat}`}
                >
                  <span>{getCategoryEmoji(cat)}</span> {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Products */}
          <div className="px-4 pt-3 pb-6">
            {displayProducts.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Search className="w-7 h-7 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">Nada encontrado</h3>
                <p className="text-muted-foreground text-sm">Tente outro termo ou categoria</p>
              </div>
            ) : (
              <>
                <h3 className="text-base font-bold text-foreground mb-3">
                  {searchQuery ? `Resultados para "${searchQuery}"` : selectedCategory ? selectedCategory : '⭐ Em Destaque'}
                </h3>
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {displayProducts.map(product => {
                    const store = getStoreById(product.storeId);
                    const price = Number(product.price) || 0;
                    const origPrice = product.originalPrice ? Number(product.originalPrice) : 0;
                    const discount = origPrice > price ? Math.round(((origPrice - price) / origPrice) * 100) : 0;

                    return (
                      <div
                        key={product.id}
                        data-testid={`card-product-${product.id}`}
                        onClick={() => handleOpenProduct(product)}
                        className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer active:scale-[0.98] flex flex-col"
                      >
                        {/* Image */}
                        <div className="relative h-20 bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center text-2xl overflow-hidden">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{product.image}</span>
                          )}
                          {discount > 0 && (
                            <span className="absolute top-1 left-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                              -{discount}%
                            </span>
                          )}
                          {product.stock === 0 && (
                            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                              <span className="text-white text-[10px] font-semibold bg-black/50 px-1.5 py-0.5 rounded-full">Esgotado</span>
                            </div>
                          )}
                          {(product.imageUrls?.length ?? 0) > 1 && (
                            <span className="absolute bottom-1 right-1 bg-black/50 text-white text-[9px] font-semibold px-1 py-0.5 rounded-full flex items-center gap-0.5">
                              <Images className="w-2 h-2" />
                              {product.imageUrls!.length}
                            </span>
                          )}
                        </div>

                        {/* Info */}
                        <div className="p-2 flex flex-col flex-1">
                          <p className="text-[10px] text-muted-foreground mb-0.5 truncate">{store?.name ?? ''}</p>
                          <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight mb-1 flex-1">{product.name}</p>

                          {product.description && (
                            <p className="text-[10px] text-muted-foreground line-clamp-1 leading-snug mb-1">{product.description}</p>
                          )}

                          {(product.imageUrls?.length ?? 0) > 0 && (
                            <button
                              onClick={e => { e.stopPropagation(); setGalleryProduct(product); }}
                              className="text-[10px] text-primary font-medium flex items-center gap-0.5 mb-1 hover:underline w-fit"
                              data-testid={`btn-ver-fotos-${product.id}`}
                            >
                              <Images className="w-2.5 h-2.5" />
                              Ver fotos
                            </button>
                          )}

                          <div className="flex items-center gap-0.5 mb-1.5">
                            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                            <span className="text-[10px] font-medium text-foreground">{product.rating}</span>
                            <span className="text-[10px] text-muted-foreground">({product.reviews})</span>
                          </div>

                          <div className="flex items-end justify-between mt-auto">
                            <div>
                              <p className="text-sm font-bold text-primary leading-none">R$ {price.toFixed(2)}</p>
                              {origPrice > price && (
                                <p className="text-[10px] text-muted-foreground line-through">R$ {origPrice.toFixed(2)}</p>
                              )}
                            </div>
                            <button
                              onClick={e => handleAddToCart(e, product.id, product.storeId, product.price)}
                              disabled={product.stock === 0 || product.frozen}
                              data-testid={`btn-add-cart-${product.id}`}
                              className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-40 flex-shrink-0"
                            >
                              <CartIcon className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* ── CATEGORIES TAB ── */}
      {bottomTab === 'categories' && (
        <div className="px-4 py-6">
          <h2 className="text-xl font-bold text-foreground mb-4">Categorias</h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => { setSelectedCategory(null); setSearchQuery(''); navigate('/app'); }}
              className="flex items-center gap-3 bg-primary text-white rounded-2xl p-4 hover:bg-primary/90 transition-all shadow-sm"
              data-testid="btn-cat-all"
            >
              <span className="text-2xl">✨</span>
              <span className="font-semibold text-sm">Todos os produtos</span>
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => { setSelectedCategory(cat); setSearchQuery(''); navigate('/app'); }}
                className="flex items-center gap-3 bg-white border border-border rounded-2xl p-4 hover:border-primary/40 hover:bg-blue-50/50 transition-all shadow-sm"
                data-testid={`btn-cat-${cat}`}
              >
                <span className="text-2xl">{getCategoryEmoji(cat)}</span>
                <div className="text-left">
                  <p className="font-semibold text-sm text-foreground">{cat}</p>
                  <p className="text-xs text-muted-foreground">
                    {activeProducts.filter(p => p.category === cat).length} produtos
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── MAIS TAB ── */}
      {bottomTab === 'mais' && (
        <div className="px-4 py-6 max-w-md mx-auto">
          {/* Profile card */}
          <div className="bg-gradient-to-r from-primary to-[#3B82F6] rounded-2xl p-5 mb-5 text-white flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <User className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-lg leading-tight truncate">
                {user?.name || 'Cliente'}
              </p>
              <p className="text-blue-200 text-sm truncate">{user?.email || 'Bem-vindo!'}</p>
            </div>
            <button
              onClick={() => navigate('/perfil')}
              className="bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-3 py-1.5 rounded-full transition-all flex-shrink-0"
              data-testid="btn-ver-perfil"
            >
              Ver perfil
            </button>
          </div>

          {/* Actions grid */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => navigate('/pedidos')}
              className="bg-white rounded-2xl p-4 flex flex-col items-start gap-3 hover:shadow-md transition-all border border-border active:scale-[0.98]"
              data-testid="btn-meus-pedidos"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <ClipboardList className="w-5 h-5 text-primary" />
              </div>
              <p className="font-semibold text-sm text-foreground">Meus Pedidos</p>
            </button>

            <button
              onClick={() => navigate('/cart')}
              className="bg-white rounded-2xl p-4 flex flex-col items-start gap-3 hover:shadow-md transition-all border border-border active:scale-[0.98]"
              data-testid="btn-carrinho-mais"
            >
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <CartIcon className="w-5 h-5 text-green-600" />
              </div>
              <p className="font-semibold text-sm text-foreground">Carrinho</p>
            </button>

            <button
              onClick={() => { markAllRead('client'); navigate('/app?tab=notificacoes'); }}
              className="bg-white rounded-2xl p-4 flex flex-col items-start gap-3 hover:shadow-md transition-all border border-border active:scale-[0.98] relative"
              data-testid="btn-notifications-client"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center relative">
                <Bell className="w-5 h-5 text-amber-600" />
                {clientUnread > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {clientUnread > 9 ? '9+' : clientUnread}
                  </span>
                )}
              </div>
              <p className="font-semibold text-sm text-foreground">Notificações</p>
            </button>

            <button
              onClick={() => navigate('/app?tab=suporte')}
              className="bg-white rounded-2xl p-4 flex flex-col items-start gap-3 hover:shadow-md transition-all border border-border active:scale-[0.98]"
              data-testid="btn-suporte"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Headphones className="w-5 h-5 text-purple-600" />
              </div>
              <p className="font-semibold text-sm text-foreground">Suporte</p>
            </button>
          </div>

          {/* Expand roles section */}
          <div className="mt-5 border-t border-border pt-5 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">Expandir acesso</p>
            {!hasRole('seller') && (
              <button
                data-testid="btn-criar-loja"
                onClick={() => setShowCreateStore(true)}
                className="w-full flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-4 hover:bg-emerald-100 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <Store className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm text-emerald-800">Criar minha loja</p>
                    <p className="text-xs text-emerald-600">Venda seus produtos na plataforma</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-emerald-500" />
              </button>
            )}
            {!hasRole('motoboy') && (
              <button
                data-testid="btn-virar-motoboy"
                onClick={() => setShowBecomeMotoboy(true)}
                className="w-full flex items-center justify-between bg-orange-50 border border-orange-200 rounded-2xl px-4 py-4 hover:bg-orange-100 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                    <Bike className="w-5 h-5 text-orange-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-sm text-orange-800">Quero ser entregador</p>
                    <p className="text-xs text-orange-600">Faça entregas e ganhe dinheiro</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-orange-400" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── MODAL: Criar Loja ── */}
      {showCreateStore && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-2 sticky top-0 bg-white">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            <div className="flex items-center justify-between px-5 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Store className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Criar minha loja</h3>
                  <p className="text-xs text-muted-foreground">Preencha os dados da sua loja</p>
                </div>
              </div>
              <button onClick={() => setShowCreateStore(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-muted-foreground hover:bg-gray-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateStore} className="p-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="store-name">Nome da loja *</Label>
                <Input id="store-name" placeholder="Ex: Padaria do João" value={storeForm.storeName} onChange={e => setStoreForm(p => ({ ...p, storeName: e.target.value }))} required data-testid="input-store-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-cnpj">CNPJ</Label>
                <Input id="store-cnpj" placeholder="00.000.000/0000-00" value={storeForm.cnpj} onChange={e => setStoreForm(p => ({ ...p, cnpj: e.target.value }))} data-testid="input-store-cnpj" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-category">Categoria</Label>
                <Input id="store-category" placeholder="Ex: Alimentos, Eletrônicos..." value={storeForm.storeCategory} onChange={e => setStoreForm(p => ({ ...p, storeCategory: e.target.value }))} data-testid="input-store-category" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="store-description">Descrição</Label>
                <Input id="store-description" placeholder="Descreva sua loja brevemente" value={storeForm.storeDescription} onChange={e => setStoreForm(p => ({ ...p, storeDescription: e.target.value }))} data-testid="input-store-description" />
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-sm font-semibold text-foreground mb-3">Endereço da loja</p>
                {user?.address?.logradouro && (
                  <label className="flex items-center gap-2 mb-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={storeForm.useExistingAddress}
                      onChange={e => setStoreForm(p => ({ ...p, useExistingAddress: e.target.checked }))}
                      data-testid="checkbox-use-existing-address"
                    />
                    <span className="text-sm text-foreground">Usar meu endereço cadastrado</span>
                  </label>
                )}
                {!storeForm.useExistingAddress && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <Label htmlFor="store-cep">CEP</Label>
                      <Input id="store-cep" placeholder="00000-000" value={storeForm.cep} onChange={e => setStoreForm(p => ({ ...p, cep: formatCep(e.target.value) }))} onBlur={handleStoreCepBlur} maxLength={9} data-testid="input-store-cep" />
                      {cepLoading && <p className="text-xs text-muted-foreground">Buscando...</p>}
                    </div>
                    <div className="space-y-1 col-span-2 sm:col-span-1">
                      <Label htmlFor="store-numero">Número</Label>
                      <Input id="store-numero" placeholder="123" value={storeForm.numero} onChange={e => setStoreForm(p => ({ ...p, numero: e.target.value }))} data-testid="input-store-numero" />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <Label htmlFor="store-logradouro">Rua</Label>
                      <Input id="store-logradouro" placeholder="Rua..." value={storeForm.logradouro} onChange={e => setStoreForm(p => ({ ...p, logradouro: e.target.value }))} data-testid="input-store-logradouro" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="store-bairro">Bairro</Label>
                      <Input id="store-bairro" placeholder="Centro" value={storeForm.bairro} onChange={e => setStoreForm(p => ({ ...p, bairro: e.target.value }))} data-testid="input-store-bairro" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="store-cidade">Cidade</Label>
                      <Input id="store-cidade" placeholder="São Paulo" value={storeForm.cidade} onChange={e => setStoreForm(p => ({ ...p, cidade: e.target.value }))} data-testid="input-store-cidade" />
                    </div>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" disabled={storeLoading} data-testid="btn-confirm-create-store">
                {storeLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {storeLoading ? 'Criando loja...' : 'Criar loja'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Virar Motoboy ── */}
      {showBecomeMotoboy && (
        <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-end justify-center">
          <div className="w-full max-w-lg bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-center pt-3 pb-2 sticky top-0 bg-white">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            <div className="flex items-center justify-between px-5 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Bike className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground">Quero ser entregador</h3>
                  <p className="text-xs text-muted-foreground">Leia as regras antes de continuar</p>
                </div>
              </div>
              <button onClick={() => setShowBecomeMotoboy(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-muted-foreground hover:bg-gray-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Suas informações</p>
                <div className="space-y-2">
                  <Label htmlFor="motoboy-vehicle">Veículo</Label>
                  <Input id="motoboy-vehicle" placeholder="Ex: Moto Honda CG 160" value={motoboyForm.vehicle} onChange={e => setMotoboyForm(p => ({ ...p, vehicle: e.target.value }))} data-testid="input-motoboy-vehicle" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="motoboy-plate">Placa</Label>
                  <Input id="motoboy-plate" placeholder="ABC-1234" value={motoboyForm.licensePlate} onChange={e => setMotoboyForm(p => ({ ...p, licensePlate: e.target.value }))} data-testid="input-motoboy-plate" />
                </div>
              </div>
              <div className="bg-muted rounded-xl p-4 text-sm text-muted-foreground space-y-1">
                <p>• Você deve ter CNH válida</p>
                <p>• O veículo deve estar regularizado</p>
                <p>• Entregas no raio de até 3 km da loja</p>
                <p>• Pagamento calculado pela distância percorrida</p>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={motoboyForm.agreed}
                  onChange={e => setMotoboyForm(p => ({ ...p, agreed: e.target.checked }))}
                  className="mt-0.5"
                  data-testid="checkbox-motoboy-agree"
                />
                <span className="text-sm text-foreground">Li e aceito as regras e condições para ser um entregador parceiro.</span>
              </label>
              <Button
                onClick={handleBecomeMotoboy}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                disabled={motoboyLoading || !motoboyForm.agreed}
                data-testid="btn-confirm-become-motoboy"
              >
                {motoboyLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                {motoboyLoading ? 'Cadastrando...' : 'Quero ser entregador'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUPORTE TAB ── */}
      {bottomTab === 'suporte' && (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mb-4">
            <Headphones className="w-10 h-10 text-purple-500" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Suporte</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            Esta seção está em construção. Em breve você poderá falar com nossa equipe de suporte.
          </p>
        </div>
      )}

      {/* ── NOTIFICAÇÕES TAB ── */}
      {bottomTab === 'notificacoes' && (
        <div className="px-4 py-6 max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-foreground">Notificações</h2>
            {clientUnread > 0 && (
              <button
                onClick={() => markAllRead('client')}
                className="text-xs text-primary font-semibold hover:underline"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {clientNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="font-semibold text-foreground">Tudo em dia!</p>
              <p className="text-sm text-muted-foreground mt-1">Nenhuma notificação por enquanto.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {clientNotifications.map(notif => {
                if (notif.type === 'review_request' && notif.metadata) {
                  const m = notif.metadata as { orderId?: string; storeId?: string; storeName?: string; productId?: string };
                  return (
                    <ReviewRequestCard
                      key={notif.id}
                      notifId={notif.id}
                      orderId={m.orderId ?? ''}
                      storeId={m.storeId ?? ''}
                      storeName={m.storeName ?? ''}
                      productId={m.productId ?? ''}
                      timestamp={notif.timestamp}
                      read={notif.read}
                    />
                  );
                }
                return (
                  <div
                    key={notif.id}
                    onClick={() => markRead(notif.id)}
                    className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                      notif.read ? 'bg-white border-border' : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      notif.read ? 'bg-gray-100' : 'bg-blue-100'
                    }`}>
                      <span className="text-lg">{notif.icon || '🔔'}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${notif.read ? 'text-foreground' : 'text-blue-900'}`}>{notif.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.body}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notif.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {!notif.read && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Photo Gallery */}
      {galleryProduct && (
        <ProductPhotoGallery
          images={galleryProduct.imageUrls ?? (galleryProduct.imageUrl ? [galleryProduct.imageUrl] : [])}
          productName={galleryProduct.name}
          isOpen={!!galleryProduct}
          onClose={() => setGalleryProduct(null)}
        />
      )}

      {/* Product Modal */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          isOpen={isModalOpen}
          onClose={() => { setIsModalOpen(false); setSelectedProduct(null); }}
          onAddToCart={handleAddToCartModal}
          onBuyNow={handleBuyNow}
          storeAddress={getStoreById(selectedProduct.storeId)?.address}
        />
      )}
    </div>
  );
}

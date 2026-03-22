/**
 * Client Panel - Main shopping interface
 * Features: Product browsing, search, categories, product detail modal
 * Navigation is handled by the global ClientBottomNav in App.tsx
 */
import { useState } from 'react';
import { useLocation } from 'wouter';
import { mockStores } from '@/lib/mockData';
import { useProducts } from '@/contexts/ProductContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useNotification } from '@/contexts/NotificationContext';
import { useReview } from '@/contexts/ReviewContext';
import {
  Search, Star, ShoppingCart as CartIcon,
  LayoutGrid, ClipboardList, User, Headphones, ChevronRight, Bell,
} from 'lucide-react';
import { toast } from 'sonner';
import ProductDetailModal from '@/components/ProductDetailModal';
import { Product } from '@/lib/mockData';

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          className="focus:outline-none"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
        >
          <Star
            className={`w-6 h-6 transition-colors ${
              star <= (hovered || value) ? 'fill-accent text-accent' : 'text-muted-foreground'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewRequestCard({
  notifId,
  orderId,
  storeId,
  storeName,
  productId,
  timestamp,
  read,
}: {
  notifId: string;
  orderId: string;
  storeId: string;
  storeName: string;
  productId: string;
  timestamp: string;
  read: boolean;
}) {
  const { addProductReview, addStoreReview, hasReviewedOrder } = useReview();
  const { markRead } = useNotification();
  const { products } = useProducts();
  const [storeRating, setStoreRating] = useState(0);
  const [productRating, setProductRating] = useState(0);
  const [storeMessage, setStoreMessage] = useState('');
  const [productMessage, setProductMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const alreadyReviewed = hasReviewedOrder(orderId);
  const product = products.find(p => p.id === productId);

  const handleSubmit = () => {
    if (storeRating === 0) {
      toast.error('Por favor, avalie a loja antes de enviar.');
      return;
    }
    addStoreReview({
      storeId,
      storeName,
      orderId,
      rating: storeRating,
      message: storeMessage,
      clientName: 'Cliente',
    });
    if (productId && productRating > 0 && product) {
      addProductReview({
        productId,
        productName: product.name,
        storeId,
        rating: productRating,
        message: productMessage,
        clientName: 'Cliente',
      });
    }
    markRead(notifId);
    setSubmitted(true);
    toast.success('Avaliação enviada! Obrigado pelo feedback.');
  };

  if (alreadyReviewed || submitted) {
    return (
      <div className={`rounded-2xl border p-4 ${read ? 'bg-card border-border opacity-60' : 'bg-primary/5 border-primary/20'}`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">⭐</span>
          <div>
            <p className="font-semibold text-sm text-foreground">Avaliação enviada!</p>
            <p className="text-xs text-muted-foreground mt-0.5">Obrigado pelo seu feedback sobre {storeName}.</p>
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border transition-all ${read ? 'bg-card border-border opacity-70' : 'bg-primary/5 border-primary/20'}`}>
      <div className="flex items-start gap-3 p-4">
        <span className="text-2xl">⭐</span>
        <div className="flex-1">
          <p className={`font-semibold text-sm ${read ? 'text-foreground' : 'text-primary'}`}>
            Avalie sua experiência com {storeName}!
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Seu pedido foi concluído. Diga-nos como foi!</p>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        {!read && <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-1" />}
      </div>

      <div className="px-4 pb-4 space-y-4">
        {/* Store rating */}
        <div className="space-y-2">
          <p className="text-sm font-semibold text-foreground">Avalie a loja <span className="text-primary">{storeName}</span></p>
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

        {/* Product rating */}
        {product && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">Avalie o produto <span className="text-primary">{product.name}</span></p>
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
          className="w-full bg-accent text-accent-foreground text-sm font-semibold rounded-xl py-2.5 px-4 hover:bg-accent/90 transition-colors disabled:opacity-50"
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
  const { notifications, markAllRead, markRead, clientUnread } = useNotification();
  const [, navigate] = useLocation();

  const params = new URLSearchParams(window.location.search);
  const bottomTab = params.get('tab') || 'home';

  const getStoreAddressForProduct = (storeId: string): string | undefined => {
    if (storeId === sellerProfile.storeId && sellerProfile.address) {
      return [sellerProfile.address.logradouro, sellerProfile.address.numero, sellerProfile.address.bairro, sellerProfile.address.cidade, sellerProfile.address.uf].filter(Boolean).join(', ');
    }
    return undefined;
  };

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

  const handleAddToCart = (productId: string, storeId: string, price: number) => {
    addToCart({ productId, storeId, quantity: 1, price });
    toast.success('Produto adicionado ao carrinho!');
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
    <div className="min-h-screen bg-background">

      {/* ── HOME TAB ── */}
      {bottomTab === 'home' && (
        <>
          <section className="bg-gradient-to-r from-primary to-primary/80 text-white py-12">
            <div className="container mx-auto px-4">
              <h2 className="text-4xl font-display font-bold mb-4">Bem-vindo ao Marketplace Regional</h2>
              <p className="text-lg opacity-90 mb-8">Descubra os melhores produtos de pequenos comércios locais</p>
              <div className="relative max-w-2xl">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  type="text"
                  placeholder="Buscar produtos..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setSelectedCategory(null); }}
                  className="pl-12 py-3 text-base bg-white text-foreground"
                />
              </div>
            </div>
          </section>

          <section className="bg-secondary py-8 border-b border-border">
            <div className="container mx-auto px-4">
              <h3 className="text-lg font-display font-semibold mb-4 text-foreground">Categorias</h3>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant={selectedCategory === null ? 'default' : 'outline'}
                  onClick={() => { setSelectedCategory(null); setSearchQuery(''); }}
                >
                  Todos
                </Button>
                {categories.map(category => (
                  <Button
                    key={category}
                    variant={selectedCategory === category ? 'default' : 'outline'}
                    onClick={() => { setSelectedCategory(category); setSearchQuery(''); }}
                    className="gap-2"
                  >
                    {category}
                  </Button>
                ))}
              </div>
            </div>
          </section>

          <section className="py-12">
            <div className="container mx-auto px-4">
              {displayProducts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Nenhum produto encontrado</h3>
                  <p className="text-muted-foreground">Tente buscar por outro termo ou categoria</p>
                </div>
              ) : (
                <>
                  <h3 className="text-2xl font-display font-bold mb-8 text-foreground">
                    {searchQuery ? `Resultados para "${searchQuery}"` : selectedCategory ? selectedCategory : 'Produtos em Destaque'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {displayProducts.map(product => {
                      const store = mockStores.find(s => s.id === product.storeId);
                      const price = Number(product.price) || 0;
                      const origPrice = product.originalPrice ? Number(product.originalPrice) : 0;
                      const discount = origPrice > price ? Math.round(((origPrice - price) / origPrice) * 100) : 0;
                      const savings = origPrice > price ? (origPrice - price) : 0;

                      return (
                        <Card
                          key={product.id}
                          className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105 flex flex-col cursor-pointer group"
                          onClick={() => handleOpenProduct(product)}
                        >
                          <div className="bg-gradient-to-br from-accent/20 to-primary/20 h-40 flex items-center justify-center text-6xl relative overflow-hidden">
                            {product.imageUrl ? (
                              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                            ) : product.image}
                            {discount > 0 && (
                              <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground font-bold text-sm px-2 py-1">
                                -{discount}%
                              </Badge>
                            )}
                            <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-all duration-300 flex items-center justify-center">
                              <span className="opacity-0 group-hover:opacity-100 text-white text-sm font-semibold bg-primary/80 px-3 py-1 rounded-full transition-all duration-300">
                                Ver detalhes
                              </span>
                            </div>
                          </div>
                          <div className="p-4 flex-1 flex flex-col">
                            <h4 className="font-semibold text-foreground line-clamp-2 mb-2">{product.name}</h4>
                            <p className="text-sm text-muted-foreground mb-3">{store?.name}</p>
                            <div className="flex items-center gap-1 mb-3">
                              <Star className="w-4 h-4 fill-accent text-accent" />
                              <span className="text-sm font-medium text-foreground">{product.rating}</span>
                              <span className="text-xs text-muted-foreground">({product.reviews})</span>
                            </div>
                            <div className="mb-4 flex-1">
                              <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-primary">R$ {price.toFixed(2)}</span>
                                {origPrice > 0 && (
                                  <span className="text-sm text-muted-foreground line-through">R$ {origPrice.toFixed(2)}</span>
                                )}
                              </div>
                              {savings > 0 && <p className="text-xs text-green-600 font-medium mt-1">Economiza R$ {savings.toFixed(2)}</p>}
                              {product.stock < 10 && product.stock > 0 && <p className="text-xs text-destructive mt-1">Apenas {product.stock} em estoque</p>}
                              {product.stock === 0 && <p className="text-xs text-destructive mt-1">Fora de estoque</p>}
                            </div>
                            <Button
                              onClick={(e) => { e.stopPropagation(); handleAddToCart(product.id, product.storeId, product.price); }}
                              disabled={product.stock === 0 || product.frozen}
                              className="w-full gap-2 bg-primary hover:bg-primary/90 text-white"
                            >
                              <CartIcon className="w-4 h-4" />
                              Adicionar
                            </Button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </section>
        </>
      )}

      {/* ── CATEGORIES TAB ── */}
      {bottomTab === 'categories' && (
        <div className="container mx-auto px-4 py-8">
          <h2 className="text-2xl font-display font-bold text-foreground mb-6">Categorias</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <button
              onClick={() => { setSelectedCategory(null); setSearchQuery(''); navigate('/'); }}
              className="flex flex-col items-center justify-center gap-3 bg-primary text-white rounded-2xl p-6 hover:bg-primary/90 transition-all shadow-sm"
            >
              <LayoutGrid className="w-8 h-8" />
              <span className="font-semibold text-sm">Todos</span>
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => { setSelectedCategory(category); setSearchQuery(''); navigate('/'); }}
                className="flex flex-col items-center justify-center gap-3 bg-secondary border border-border rounded-2xl p-6 hover:bg-accent/10 transition-all shadow-sm"
              >
                <span className="text-3xl">🏷️</span>
                <span className="font-semibold text-sm text-foreground text-center">{category}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── MAIS TAB ── */}
      {bottomTab === 'mais' && (
        <div className="container mx-auto px-4 py-8 max-w-md">
          <h2 className="text-2xl font-display font-bold text-foreground mb-6">Menu</h2>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/pedidos')}
              className="w-full flex items-center justify-between bg-card border border-border rounded-2xl px-5 py-4 hover:bg-secondary transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-primary" />
                </div>
                <span className="font-semibold text-foreground">Meus Pedidos</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            <button
              onClick={() => navigate('/perfil')}
              className="w-full flex items-center justify-between bg-card border border-border rounded-2xl px-5 py-4 hover:bg-secondary transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <span className="font-semibold text-foreground">Perfil</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            <button
              onClick={() => navigate('/cart')}
              className="w-full flex items-center justify-between bg-card border border-border rounded-2xl px-5 py-4 hover:bg-secondary transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <CartIcon className="w-5 h-5 text-primary" />
                </div>
                <span className="font-semibold text-foreground">Carrinho</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            <button
              onClick={() => { markAllRead('client'); navigate('/?tab=notificacoes'); }}
              className="w-full flex items-center justify-between bg-card border border-border rounded-2xl px-5 py-4 hover:bg-secondary transition-all"
              data-testid="btn-notifications-client"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center relative">
                  <Bell className="w-5 h-5 text-primary" />
                  {clientUnread > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {clientUnread > 9 ? '9+' : clientUnread}
                    </span>
                  )}
                </div>
                <span className="font-semibold text-foreground">Notificações</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            <button
              onClick={() => navigate('/?tab=suporte')}
              className="w-full flex items-center justify-between bg-card border border-border rounded-2xl px-5 py-4 hover:bg-secondary transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Headphones className="w-5 h-5 text-primary" />
                </div>
                <span className="font-semibold text-foreground">Suporte</span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* ── SUPORTE TAB ── */}
      {bottomTab === 'suporte' && (
        <div className="container mx-auto px-4 py-8 max-w-md">
          <h2 className="text-2xl font-display font-bold text-foreground mb-6">Suporte</h2>
          <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
            <Headphones className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-lg font-medium">Em breve</p>
            <p className="text-sm mt-1">Esta seção está em construção.</p>
          </div>
        </div>
      )}

      {/* ── NOTIFICAÇÕES TAB ── */}
      {bottomTab === 'notificacoes' && (
        <div className="container mx-auto px-4 py-8 max-w-md">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-display font-bold text-foreground">Notificações</h2>
            {clientNotifications.length > 0 && (
              <button
                onClick={() => markAllRead('client')}
                className="text-sm text-primary font-medium hover:underline"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {clientNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
              <Bell className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">Nenhuma notificação</p>
              <p className="text-sm mt-1">Você será avisado sobre seus pedidos aqui.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {clientNotifications.map(n => {
                if (n.type === 'review_request') {
                  return (
                    <ReviewRequestCard
                      key={n.id}
                      notifId={n.id}
                      orderId={n.metadata?.orderId ?? ''}
                      storeId={n.metadata?.storeId ?? ''}
                      storeName={n.metadata?.storeName ?? 'Loja'}
                      productId={n.metadata?.productId ?? ''}
                      timestamp={n.timestamp}
                      read={n.read}
                    />
                  );
                }

                if (n.type === 'question_answer') {
                  return (
                    <div
                      key={n.id}
                      data-testid={`notif-client-${n.id}`}
                      className={`rounded-2xl border transition-all ${n.read ? 'bg-card border-border opacity-60' : 'bg-primary/5 border-primary/20'}`}
                    >
                      <div className="flex items-start gap-4 p-4">
                        <div className="text-2xl mt-0.5 flex-shrink-0">{n.icon}</div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm ${n.read ? 'text-foreground' : 'text-primary'}`}>{n.title}</p>
                          <div className="bg-secondary rounded-lg p-2 mt-2">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">Resposta do lojista:</p>
                            <p className="text-sm text-foreground leading-snug">{n.body}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2 italic">💬 Chat encerrado pelo lojista</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(n.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {!n.read && (
                          <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={n.id}
                    data-testid={`notif-client-${n.id}`}
                    className={`flex items-start gap-4 p-4 rounded-2xl border transition-all ${n.read ? 'bg-card border-border opacity-60' : 'bg-primary/5 border-primary/20'}`}
                  >
                    <div className="text-2xl mt-0.5 flex-shrink-0">{n.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${n.read ? 'text-foreground' : 'text-primary'}`}>{n.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5 leading-snug">{n.body}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(n.timestamp).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    {!n.read && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <ProductDetailModal
        product={selectedProduct}
        storeName={selectedProduct ? mockStores.find(s => s.id === selectedProduct.storeId)?.name : undefined}
        storeAddress={selectedProduct ? getStoreAddressForProduct(selectedProduct.storeId) : undefined}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
      />
    </div>
  );
}

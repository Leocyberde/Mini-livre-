/**
 * Store Detail Page - Página de detalhes da loja
 * Features: Informações da loja, produtos, avaliações
 */
import { useLocation, useSearch } from 'wouter';
import { useStores } from '@/contexts/StoresContext';
import { useProducts } from '@/contexts/ProductContext';
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MapPin, Phone, Mail, Star, ShoppingCart as CartIcon } from 'lucide-react';
import { Link } from 'wouter';
import { useState } from 'react';
import { toast } from 'sonner';
import ProductDetailModal from '@/components/ProductDetailModal';
import { Product } from '@/lib/mockData';

export default function StoreDetailPage() {
  const search = useSearch();
  const storeId = new URLSearchParams(search).get('id') || '';
  const { getStoreById, isLoading: storesLoading } = useStores();
  const store = getStoreById(storeId);
  const { products } = useProducts();
  const { addToCart } = useMarketplace();
  const [, navigate] = useLocation();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (storesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="container mx-auto px-4">
          <Link href="/">
            <Button variant="ghost" className="gap-2 mb-8">
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </Link>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">❌</div>
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">Loja não encontrada</h2>
          </div>
        </div>
      </div>
    );
  }

  const storeProducts = products.filter(p => p.storeId === storeId);

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

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <Link href="/">
          <Button variant="ghost" className="gap-2 mb-8">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
        </Link>

        {/* Store Info Card */}
        <Card className="p-8 mb-12 bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Logo and Name */}
            <div className="md:col-span-1">
              <div className="text-8xl mb-4">{store.logo}</div>
              <h1 className="text-3xl font-display font-bold text-foreground mb-2">{store.name}</h1>
              <Badge className="bg-primary/10 text-primary mb-4">{store.category}</Badge>
            </div>

            {/* Info */}
            <div className="md:col-span-2 space-y-4">
              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <= Math.round(store.rating)
                          ? 'fill-accent text-accent'
                          : 'text-muted-foreground'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-lg font-semibold text-foreground">{store.rating}</span>
                <span className="text-sm text-muted-foreground">({store.reviews} avaliações)</span>
              </div>

              {/* Description */}
              <p className="text-foreground leading-relaxed">{store.description}</p>

              {/* Contact Info */}
              <div className="space-y-2 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>{store.location}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Products Section */}
        <div>
          <h2 className="text-3xl font-display font-bold text-foreground mb-8">
            Produtos ({storeProducts.length})
          </h2>

          {storeProducts.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="text-6xl mb-4">📦</div>
              <p className="text-muted-foreground text-lg">Esta loja ainda não tem produtos cadastrados</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {storeProducts.map(product => {
                const discount = product.originalPrice
                  ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
                  : 0;
                const savings = product.originalPrice ? (product.originalPrice - product.price) : 0;

                return (
                  <Card
                    key={product.id}
                    className="overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105 flex flex-col cursor-pointer group"
                    onClick={() => handleOpenProduct(product)}
                  >
                    {/* Product Image */}
                    <div className="bg-gradient-to-br from-accent/20 to-primary/20 h-40 flex items-center justify-center text-6xl relative overflow-hidden">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        product.image
                      )}

                      {/* Discount Badge */}
                      {discount > 0 && (
                        <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground font-bold text-sm px-2 py-1">
                          -{discount}%
                        </Badge>
                      )}

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-all duration-300 flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 text-white text-sm font-semibold bg-primary/80 px-3 py-1 rounded-full transition-all duration-300">
                          Ver detalhes
                        </span>
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="p-4 flex-1 flex flex-col">
                      <h4 className="font-semibold text-foreground line-clamp-2 mb-2">
                        {product.name}
                      </h4>
                      <div className="flex items-center gap-1 mb-3">
                        <Star className="w-4 h-4 fill-accent text-accent" />
                        <span className="text-sm font-medium text-foreground">{product.rating}</span>
                        <span className="text-xs text-muted-foreground">({product.reviews})</span>
                      </div>
                      <div className="mb-4 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl font-bold text-primary">
                            R$ {product.price.toFixed(2)}
                          </span>
                          {product.originalPrice && (
                            <span className="text-sm text-muted-foreground line-through">
                              R$ {product.originalPrice.toFixed(2)}
                            </span>
                          )}
                        </div>
                        {savings > 0 && (
                          <p className="text-xs text-green-600 font-medium mt-1">
                            Economiza R$ {savings.toFixed(2)}
                          </p>
                        )}
                        {product.stock < 10 && product.stock > 0 && (
                          <p className="text-xs text-destructive mt-1">
                            Apenas {product.stock} em estoque
                          </p>
                        )}
                        {product.stock === 0 && (
                          <p className="text-xs text-destructive mt-1">Fora de estoque</p>
                        )}
                      </div>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToCart(product.id, product.storeId, product.price);
                        }}
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
          )}
        </div>
      </div>

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        storeName={store.name}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAddToCart={handleAddToCart}
        onBuyNow={handleBuyNow}
      />
    </div>
  );
}

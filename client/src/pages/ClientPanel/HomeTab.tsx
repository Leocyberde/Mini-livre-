import { Search, Star, ShoppingCart as CartIcon, X, Images } from 'lucide-react';
import { getCategoryEmoji } from './helpers';
import { Product } from '@/lib/mockData';

interface Store {
  name: string;
  address?: unknown;
}

interface HomeTabProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectedCategory: string | null;
  setSelectedCategory: (cat: string | null) => void;
  displayProducts: Product[];
  categories: string[];
  userName?: string;
  getStoreById: (id: string) => Store | undefined;
  handleAddToCart: (e: React.MouseEvent, productId: string, storeId: string, price: number) => void;
  handleOpenProduct: (product: Product) => void;
  setGalleryProduct: (product: Product | null) => void;
}

export default function HomeTab({
  searchQuery, setSearchQuery, selectedCategory, setSelectedCategory,
  displayProducts, categories, userName, getStoreById,
  handleAddToCart, handleOpenProduct, setGalleryProduct,
}: HomeTabProps) {
  return (
    <>
      {/* Hero compacto */}
      <div className="bg-gradient-to-br from-[#1E40AF] to-[#3B82F6] px-4 pt-6 pb-8">
        <div className="mb-5">
          <p className="text-blue-200 text-sm font-medium">
            Olá{userName ? `, ${userName.split(' ')[0]}` : ''}! 👋
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
  );
}

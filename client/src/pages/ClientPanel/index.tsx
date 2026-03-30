import { useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useStores } from '@/contexts/StoresContext';
import { useProducts } from '@/contexts/ProductContext';
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useNotification } from '@/contexts/NotificationContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCep } from '@/hooks/useCep';
import { toast } from 'sonner';
import ProductDetailModal from '@/components/ProductDetailModal';
import ProductPhotoGallery from '@/components/ProductPhotoGallery';
import { Product } from '@/lib/mockData';
import HomeTab from './HomeTab';
import CategoriesTab from './CategoriesTab';
import MaisTab from './MaisTab';
import NotificacoesTab from './NotificacoesTab';
import SuporteTab from './SuporteTab';

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

      {bottomTab === 'home' && (
        <HomeTab
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          displayProducts={displayProducts}
          categories={categories}
          userName={user?.name}
          getStoreById={getStoreById}
          handleAddToCart={handleAddToCart}
          handleOpenProduct={handleOpenProduct}
          setGalleryProduct={setGalleryProduct}
        />
      )}

      {bottomTab === 'categories' && (
        <CategoriesTab
          categories={categories}
          activeProducts={activeProducts}
          setSelectedCategory={setSelectedCategory}
          setSearchQuery={setSearchQuery}
          navigate={navigate}
        />
      )}

      {bottomTab === 'mais' && (
        <MaisTab
          user={user}
          hasRole={hasRole}
          clientUnread={clientUnread}
          markAllRead={markAllRead}
          navigate={navigate}
          showCreateStore={showCreateStore}
          setShowCreateStore={setShowCreateStore}
          showBecomeMotoboy={showBecomeMotoboy}
          setShowBecomeMotoboy={setShowBecomeMotoboy}
          storeLoading={storeLoading}
          storeForm={storeForm}
          setStoreForm={setStoreForm}
          handleCreateStore={handleCreateStore}
          handleStoreCepBlur={handleStoreCepBlur}
          cepLoading={cepLoading}
          formatCep={formatCep}
          motoboyLoading={motoboyLoading}
          motoboyForm={motoboyForm}
          setMotoboyForm={setMotoboyForm}
          handleBecomeMotoboy={handleBecomeMotoboy}
        />
      )}

      {bottomTab === 'suporte' && <SuporteTab />}

      {bottomTab === 'notificacoes' && (
        <NotificacoesTab
          clientNotifications={clientNotifications}
          clientUnread={clientUnread}
          markAllRead={markAllRead}
          markRead={markRead}
        />
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

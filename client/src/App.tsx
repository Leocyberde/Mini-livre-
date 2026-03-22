import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { MarketplaceProvider } from "./contexts/MarketplaceContext";
import { ProductProvider } from "./contexts/ProductContext";
import { ProfileProvider } from "./contexts/ProfileContext";
import { MotoboyProvider } from "./contexts/MotoboyContext";
import { MotoboyClientChatProvider } from "./contexts/MotoboyClientChatContext";
import { SupportProvider } from "./contexts/SupportContext";
import { ProductQAProvider } from "./contexts/ProductQAContext";
import { ReviewProvider } from "./contexts/ReviewContext";
import Header from "./components/Header";
import ClientPanel from "./pages/ClientPanel";
import CartPage from "./pages/CartPage";
import SellerPanel from "./pages/SellerPanel";
import AdminPanel from "./pages/AdminPanel";
import MotoboyPanel from "./pages/MotoboyPanel";
import ClientProfilePage from "./pages/ClientProfilePage";
import ClientOrdersPage from "./pages/ClientOrdersPage";
import StoreDetailPage from "./pages/StoreDetailPage";
import { useMarketplace } from "./contexts/MarketplaceContext";
import { Home, LayoutGrid, ShoppingCart as CartIcon, MoreHorizontal } from "lucide-react";

function Router() {
  return (
    <Switch>
      <Route path="/" component={ClientPanel} />
      <Route path="/cart" component={CartPage} />
      <Route path="/perfil" component={ClientProfilePage} />
      <Route path="/pedidos" component={ClientOrdersPage} />
      <Route path="/loja" component={StoreDetailPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ClientBottomNav() {
  const { cart } = useMarketplace();
  const [location, navigate] = useLocation();
  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const params = new URLSearchParams(window.location.search);
  const tab = params.get('tab');

  const isHome = location === '/' && !tab;
  const isCategories = location === '/' && tab === 'categories';
  const isCart = location === '/cart';
  const isMais = (location === '/' && (tab === 'mais' || tab === 'suporte' || tab === 'notificacoes'))
    || location === '/pedidos'
    || location === '/perfil';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-card border-t border-border shadow-lg">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        <button
          onClick={() => navigate('/')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${isHome ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <Home className="w-6 h-6" />
          <span className="text-xs font-medium">Início</span>
        </button>

        <button
          onClick={() => navigate('/?tab=categories')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${isCategories ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <LayoutGrid className="w-6 h-6" />
          <span className="text-xs font-medium">Categorias</span>
        </button>

        <button
          onClick={() => navigate('/cart')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all relative ${isCart ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <div className="relative">
            <CartIcon className="w-6 h-6" />
            {totalCartItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {totalCartItems}
              </span>
            )}
          </div>
          <span className="text-xs font-medium">Carrinho</span>
        </button>

        <button
          onClick={() => navigate('/?tab=mais')}
          className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${isMais ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          <MoreHorizontal className="w-6 h-6" />
          <span className="text-xs font-medium">Mais</span>
        </button>
      </div>
    </nav>
  );
}

function AppContent() {
  const { mode } = useMarketplace();

  return (
    <div className="min-h-screen bg-background pb-16">
      <Header />
      {mode === 'client' && <Router />}
      {mode === 'seller' && <SellerPanel />}
      {mode === 'admin' && <AdminPanel />}
      {mode === 'motoboy' && <MotoboyPanel />}
      {mode === 'client' && <ClientBottomNav />}
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <ProductProvider>
          <NotificationProvider>
            <MarketplaceProvider>
              <ProfileProvider>
                <MotoboyProvider>
                  <MotoboyClientChatProvider>
                  <SupportProvider>
                    <ProductQAProvider>
                      <ReviewProvider>
                        <TooltipProvider>
                          <Toaster />
                          <AppContent />
                        </TooltipProvider>
                      </ReviewProvider>
                    </ProductQAProvider>
                  </SupportProvider>
                  </MotoboyClientChatProvider>
                </MotoboyProvider>
              </ProfileProvider>
            </MarketplaceProvider>
          </NotificationProvider>
        </ProductProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

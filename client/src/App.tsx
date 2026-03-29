import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation, useSearch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { MarketplaceProvider } from "./contexts/MarketplaceContext";
import { ProductProvider } from "./contexts/ProductContext";
import { ProfileProvider } from "./contexts/ProfileContext";
import { MotoboyProvider } from "./contexts/MotoboyContext";
import { MotoboyRegistryProvider } from "./contexts/MotoboyRegistryContext";
import { MotoboyClientChatProvider } from "./contexts/MotoboyClientChatContext";
import { SupportProvider } from "./contexts/SupportContext";
import { ProductQAProvider } from "./contexts/ProductQAContext";
import { ReviewProvider } from "./contexts/ReviewContext";
import { PromotionsProvider } from "./contexts/PromotionsContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { StoresProvider } from "./contexts/StoresContext";
import Header from "./components/Header";
import ClientPanel from "./pages/ClientPanel";
import CartPage from "./pages/CartPage";
import SellerPanel from "./pages/SellerPanel";
import AdminPanel from "./pages/AdminPanel";
import MotoboyPanel from "./pages/MotoboyPanel";
import ClientProfilePage from "./pages/ClientProfilePage";
import ClientOrdersPage from "./pages/ClientOrdersPage";
import StoreDetailPage from "./pages/StoreDetailPage";
import Home from "./pages/Home";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import RoleSelector from "./pages/RoleSelector";
import { useMarketplace } from "./contexts/MarketplaceContext";
import { Home as HomeIcon, LayoutGrid, ShoppingCart as CartIcon, MoreHorizontal } from "lucide-react";

function ClientRouter() {
  return (
    <Switch>
      <Route path="/app" component={ClientPanel} />
      <Route path="/cart" component={CartPage} />
      <Route path="/perfil" component={ClientProfilePage} />
      <Route path="/pedidos" component={ClientOrdersPage} />
      <Route path="/loja" component={StoreDetailPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function ClientBottomNav() {
  const { cart } = useMarketplace();
  const [location, navigate] = useLocation();
  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const search = useSearch();
  const tab = new URLSearchParams(search).get('tab');

  const isHome = location === '/app' && !tab;
  const isCategories = location === '/app' && tab === 'categories';
  const isCart = location === '/cart';
  const isMais = (location === '/app' && (tab === 'mais' || tab === 'suporte' || tab === 'notificacoes'))
    || location === '/pedidos'
    || location === '/perfil';

  const navItem = (active: boolean, onClick: () => void, icon: JSX.Element, label: string, testId?: string) => (
    <button
      onClick={onClick}
      data-testid={testId}
      className={`flex flex-col items-center gap-1 flex-1 py-2 transition-all relative ${active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
    >
      <div className={`flex items-center justify-center w-10 h-7 rounded-full transition-all ${active ? 'bg-primary/10' : ''}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-semibold ${active ? 'text-primary' : 'text-muted-foreground'}`}>{label}</span>
      {active && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full" />}
    </button>
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
      <div className="flex items-center max-w-lg mx-auto px-2 h-[60px]">
        {navItem(isHome, () => navigate('/app'), <HomeIcon className="w-5 h-5" />, 'Início', 'btn-nav-home')}
        {navItem(isCategories, () => navigate('/app?tab=categories'), <LayoutGrid className="w-5 h-5" />, 'Categorias', 'btn-nav-categories')}

        <button
          onClick={() => navigate('/cart')}
          data-testid="btn-nav-cart"
          className="flex flex-col items-center gap-1 flex-1 py-2 relative"
        >
          <div className={`relative flex items-center justify-center w-12 h-8 rounded-full transition-all ${isCart ? 'bg-primary' : 'bg-primary/10 hover:bg-primary/20'}`}>
            <CartIcon className={`w-5 h-5 ${isCart ? 'text-white' : 'text-primary'}`} />
            {totalCartItems > 0 && (
              <span className="absolute -top-1.5 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {totalCartItems > 9 ? '9+' : totalCartItems}
              </span>
            )}
          </div>
          <span className={`text-[10px] font-semibold ${isCart ? 'text-primary' : 'text-muted-foreground'}`}>Carrinho</span>
          {isCart && <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-primary rounded-full" />}
        </button>

        {navItem(isMais, () => navigate('/app?tab=mais'), <MoreHorizontal className="w-5 h-5" />, 'Mais', 'btn-nav-mais')}
      </div>
    </nav>
  );
}

function ProtectedApp() {
  const { user, isLoading } = useAuth();
  const { mode } = useMarketplace();
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/entrar" />;
  }

  if (!user.roles.includes(mode)) {
    const firstRole = user.roles[0];
    if (firstRole) {
      return <Redirect to="/selecionar-papel" />;
    }
    return <Redirect to="/entrar" />;
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <Header />
      {mode === 'client' && (
        <>
          <ClientRouter />
          <ClientBottomNav />
        </>
      )}
      {mode === 'seller' && <SellerPanel />}
      {mode === 'admin' && <AdminPanel />}
      {mode === 'motoboy' && <MotoboyPanel />}
    </div>
  );
}

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/entrar" component={LoginPage} />
      <Route path="/cadastro" component={RegisterPage} />
      <Route path="/selecionar-papel" component={RoleSelector} />
      <Route path="/app">
        <ProtectedApp />
      </Route>
      <Route path="/cart">
        {user ? <ProtectedApp /> : <Redirect to="/entrar" />}
      </Route>
      <Route path="/perfil">
        {user ? <ProtectedApp /> : <Redirect to="/entrar" />}
      </Route>
      <Route path="/pedidos">
        {user ? <ProtectedApp /> : <Redirect to="/entrar" />}
      </Route>
      <Route path="/loja">
        {user ? <ProtectedApp /> : <Redirect to="/entrar" />}
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <StoresProvider>
          <ProductProvider>
            <NotificationProvider>
              <MarketplaceProvider>
                <ProfileProvider>
                  <MotoboyRegistryProvider>
                    <MotoboyProvider>
                      <MotoboyClientChatProvider>
                        <SupportProvider>
                          <ProductQAProvider>
                            <ReviewProvider>
                              <PromotionsProvider>
                              <TooltipProvider>
                                <Toaster />
                                <AppRoutes />
                              </TooltipProvider>
                              </PromotionsProvider>
                            </ReviewProvider>
                          </ProductQAProvider>
                        </SupportProvider>
                      </MotoboyClientChatProvider>
                    </MotoboyProvider>
                  </MotoboyRegistryProvider>
                </ProfileProvider>
              </MarketplaceProvider>
            </NotificationProvider>
          </ProductProvider>
          </StoresProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

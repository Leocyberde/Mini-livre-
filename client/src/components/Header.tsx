/**
 * Header Component - Navigation and Mode Switcher
 * Displays marketplace logo, mode switcher, cart icon, orders and client profile link
 */
import { useMarketplace } from '@/contexts/MarketplaceContext';
import { useNotification } from '@/contexts/NotificationContext';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Store, BarChart3, Bike, Bell } from 'lucide-react';
import { Link, useLocation } from 'wouter';

export default function Header() {
  const { mode, setMode } = useMarketplace();
  const { clientUnread, sellerUnread, markAllRead, requestSellerNotif } = useNotification();
  const [, navigate] = useLocation();

  const handleBellClick = () => {
    if (mode === 'client') {
      markAllRead('client');
      navigate('/?tab=notificacoes');
    } else if (mode === 'seller') {
      markAllRead('seller');
      requestSellerNotif();
    }
  };

  const showBell = mode === 'client' || mode === 'seller';
  const unreadCount = mode === 'client' ? clientUnread : sellerUnread;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="text-2xl font-display font-bold text-primary">🏪</div>
            <div className="flex flex-col">
              <h1 className="text-xl font-display font-bold text-foreground">Marketplace</h1>
              <p className="text-xs text-muted-foreground">Regional</p>
            </div>
          </div>
        </Link>

        {/* Mode Switcher */}
        <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
          <Button
            variant={mode === 'client' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('client')}
            data-testid="btn-mode-client"
            className={`gap-2 transition-all ${
              mode === 'client'
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span className="hidden sm:inline">Cliente</span>
          </Button>
          <Button
            variant={mode === 'seller' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('seller')}
            data-testid="btn-mode-seller"
            className={`gap-2 transition-all ${
              mode === 'seller'
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            <Store className="w-4 h-4" />
            <span className="hidden sm:inline">Lojista</span>
          </Button>
          <Button
            variant={mode === 'admin' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('admin')}
            data-testid="btn-mode-admin"
            className={`gap-2 transition-all ${
              mode === 'admin'
                ? 'bg-primary text-primary-foreground'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">ADM</span>
          </Button>
          <Button
            variant={mode === 'motoboy' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setMode('motoboy')}
            data-testid="btn-mode-motoboy"
            className={`gap-2 transition-all ${
              mode === 'motoboy'
                ? 'bg-orange-500 text-white hover:bg-orange-600'
                : 'text-foreground hover:bg-muted'
            }`}
          >
            <Bike className="w-4 h-4" />
            <span className="hidden sm:inline">Motoboy</span>
          </Button>
        </div>

        {/* Notification Bell (client & seller only) */}
        {showBell ? (
          <button
            onClick={handleBellClick}
            data-testid="btn-notification-bell"
            className="relative p-2 rounded-full hover:bg-secondary transition-colors"
            aria-label="Notificações"
          >
            <Bell className="w-6 h-6 text-foreground" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 animate-pulse">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>
    </header>
  );
}

import { useMarketplace } from '@/contexts/MarketplaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotification } from '@/contexts/NotificationContext';
import { Bell, LogOut, User, ChevronDown } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export default function Header() {
  const { mode } = useMarketplace();
  const { user, logout } = useAuth();
  const { clientUnread, sellerUnread, markAllRead, requestSellerNotif } = useNotification();
  const [, navigate] = useLocation();

  const handleBellClick = () => {
    if (mode === 'client') {
      markAllRead('client');
      navigate('/app?tab=notificacoes');
    } else if (mode === 'seller') {
      markAllRead('seller');
      requestSellerNotif();
    }
  };

  const showBell = mode === 'client' || mode === 'seller';
  const unreadCount = mode === 'client' ? clientUnread : sellerUnread;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const availableRoles = user?.roles ?? [];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href={user ? '/app' : '/'}>
          <div className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity">
            <div className="text-2xl font-display font-bold text-primary">🏪</div>
            <div className="flex flex-col">
              <h1 className="text-xl font-display font-bold text-foreground">Marketplace</h1>
              <p className="text-xs text-muted-foreground">Regional</p>
            </div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          {user && showBell && (
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
          )}

          {/* User menu or login buttons */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-testid="btn-user-menu"
                  className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-secondary transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <span className="hidden sm:block text-sm font-medium text-foreground max-w-[120px] truncate">
                    {user.name.split(' ')[0]}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-3 py-2">
                  <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                {availableRoles.length > 1 && (
                  <>
                    <DropdownMenuItem onClick={() => navigate('/selecionar-papel')} data-testid="btn-change-role">
                      <ChevronDown className="w-4 h-4 mr-2" />
                      Trocar papel
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleLogout} data-testid="btn-logout" className="text-red-600 focus:text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/entrar">
                <Button variant="ghost" size="sm" data-testid="btn-header-login">Entrar</Button>
              </Link>
              <Link href="/cadastro">
                <Button size="sm" data-testid="btn-header-register">Cadastrar</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

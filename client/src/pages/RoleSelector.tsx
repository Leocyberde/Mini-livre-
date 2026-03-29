import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { useMarketplace, type UserMode } from '@/contexts/MarketplaceContext';
import { ShoppingCart, Store, BarChart3, Bike, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ROLE_CONFIG: Record<UserMode, { label: string; description: string; icon: React.ReactNode; color: string; bg: string }> = {
  client: {
    label: 'Entrar como Cliente',
    description: 'Compre produtos das lojas da região',
    icon: <ShoppingCart className="w-8 h-8" />,
    color: 'text-primary',
    bg: 'bg-primary/10 hover:bg-primary/20 border-primary/20',
  },
  seller: {
    label: 'Entrar como Lojista',
    description: 'Gerencie sua loja e pedidos',
    icon: <Store className="w-8 h-8" />,
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
  },
  motoboy: {
    label: 'Entrar como Entregador',
    description: 'Realize entregas e ganhe dinheiro',
    icon: <Bike className="w-8 h-8" />,
    color: 'text-orange-600',
    bg: 'bg-orange-50 hover:bg-orange-100 border-orange-200',
  },
  admin: {
    label: 'Entrar como Admin',
    description: 'Administre a plataforma',
    icon: <BarChart3 className="w-8 h-8" />,
    color: 'text-purple-600',
    bg: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
  },
};

export default function RoleSelector() {
  const { user, logout } = useAuth();
  const { setMode } = useMarketplace();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!user) {
      navigate('/entrar');
      return;
    }
    if (user.roles.length === 1) {
      setMode(user.roles[0]);
      navigate('/app');
    }
  }, [user]);

  if (!user || user.roles.length <= 1) return null;

  const handleSelectRole = (role: UserMode) => {
    setMode(role);
    navigate('/app');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl border border-border/50 overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-primary/80 p-8 text-white text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">👋</span>
            </div>
            <h1 className="text-2xl font-bold">Olá, {user.name.split(' ')[0]}!</h1>
            <p className="text-white/70 mt-2 text-sm">Como você quer acessar o marketplace hoje?</p>
          </div>

          <div className="p-8 space-y-3">
            {user.roles.map(role => {
              const config = ROLE_CONFIG[role];
              if (!config) return null;
              return (
                <button
                  key={role}
                  onClick={() => handleSelectRole(role)}
                  data-testid={`btn-select-role-${role}`}
                  className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all text-left ${config.bg}`}
                >
                  <div className={`flex-shrink-0 ${config.color}`}>{config.icon}</div>
                  <div>
                    <p className={`font-bold text-base ${config.color}`}>{config.label}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{config.description}</p>
                  </div>
                </button>
              );
            })}

            <div className="pt-4 border-t border-border">
              <Button variant="ghost" className="w-full text-muted-foreground" onClick={handleLogout} data-testid="btn-logout-role-selector">
                <LogOut className="w-4 h-4 mr-2" />
                Sair da conta
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

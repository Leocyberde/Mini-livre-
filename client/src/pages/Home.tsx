import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ShoppingBag, Store, Bike, Star, MapPin, Shield, Zap, ChevronRight, ArrowRight } from 'lucide-react';

const features = [
  {
    icon: <ShoppingBag className="w-7 h-7 text-primary" />,
    title: 'Comprar',
    description: 'Encontre produtos de lojas locais da sua cidade. Entrega rápida ou retire na loja.',
    color: 'bg-primary/10',
    steps: ['Navegue por categorias', 'Adicione ao carrinho', 'Receba em casa'],
  },
  {
    icon: <Store className="w-7 h-7 text-emerald-600" />,
    title: 'Vender',
    description: 'Cadastre sua loja, gerencie produtos e pedidos com painel completo.',
    color: 'bg-emerald-50',
    steps: ['Crie sua loja', 'Cadastre produtos', 'Gerencie pedidos'],
  },
  {
    icon: <Bike className="w-7 h-7 text-orange-500" />,
    title: 'Entregar',
    description: 'Seja um entregador parceiro e ganhe dinheiro fazendo entregas na sua região.',
    color: 'bg-orange-50',
    steps: ['Cadastre-se', 'Aceite corridas', 'Receba pelo app'],
  },
];

const stats = [
  { value: '100+', label: 'Produtos disponíveis' },
  { value: '10+', label: 'Categorias' },
  { value: '5 km', label: 'Raio de entrega' },
  { value: '24/7', label: 'Suporte ativo' },
];

export default function Home() {
  const { user } = useAuth();
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🏪</span>
            <div>
              <h1 className="text-xl font-bold text-foreground leading-none">Marketplace</h1>
              <p className="text-xs text-muted-foreground">Regional</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Button onClick={() => navigate('/selecionar-papel')} data-testid="btn-go-to-app">
                Acessar painel
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <>
                <Link href="/entrar">
                  <Button variant="ghost" className="hidden sm:flex" data-testid="btn-header-login">
                    Entrar
                  </Button>
                </Link>
                <Link href="/cadastro">
                  <Button data-testid="btn-header-register">
                    Cadastrar-se
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djZoNnYtNmgtNnptNiA2djZoNnYtNmgtNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
        <div className="container mx-auto px-4 py-20 lg:py-28 relative">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-4 py-2 text-sm font-medium mb-6">
              <MapPin className="w-4 h-4" />
              <span>Marketplace da sua região</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold leading-tight mb-6">
              Compre local,<br />
              <span className="text-yellow-300">apoie quem é daqui</span>
            </h2>
            <p className="text-white/80 text-lg mb-8 leading-relaxed">
              Conectamos clientes, lojistas e entregadores da sua cidade em uma plataforma simples, rápida e completa.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              {user ? (
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 font-bold"
                  onClick={() => navigate('/selecionar-papel')}
                  data-testid="btn-hero-access"
                >
                  Acessar meu painel
                  <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              ) : (
                <>
                  <Link href="/cadastro">
                    <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-bold w-full sm:w-auto" data-testid="btn-hero-register">
                      Começar agora
                      <ChevronRight className="w-5 h-5 ml-1" />
                    </Button>
                  </Link>
                  <Link href="/entrar">
                    <Button size="lg" variant="outline" className="border-white/40 text-white hover:bg-white/10 w-full sm:w-auto" data-testid="btn-hero-login">
                      Já tenho conta
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Floating cards */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-4">
          {['🛍️ Novo pedido!', '⭐ 5 estrelas', '🚀 Entrega em 30min'].map((text, i) => (
            <div key={i} className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-lg">
              {text}
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="bg-foreground text-background">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl font-extrabold text-primary">{s.value}</p>
                <p className="text-sm text-background/60 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-14">
          <h3 className="text-3xl font-extrabold text-foreground">Como funciona</h3>
          <p className="text-muted-foreground mt-3 max-w-md mx-auto">
            Uma plataforma, três formas de participar
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((f, i) => (
            <div key={i} className="bg-white border border-border rounded-3xl p-8 hover:shadow-lg transition-shadow">
              <div className={`w-14 h-14 rounded-2xl ${f.color} flex items-center justify-center mb-5`}>
                {f.icon}
              </div>
              <h4 className="text-xl font-bold text-foreground mb-2">{f.title}</h4>
              <p className="text-muted-foreground text-sm leading-relaxed mb-5">{f.description}</p>
              <div className="space-y-2">
                {f.steps.map((step, j) => (
                  <div key={j} className="flex items-center gap-3 text-sm">
                    <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-foreground flex-shrink-0">{j + 1}</span>
                    <span className="text-foreground">{step}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Trust section */}
      <section className="bg-secondary/30">
        <div className="container mx-auto px-4 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <Shield className="w-6 h-6 text-primary" />, title: 'Seguro e confiável', desc: 'Seus dados e pagamentos protegidos em todos os momentos.' },
              { icon: <Zap className="w-6 h-6 text-amber-500" />, title: 'Entrega rápida', desc: 'Rede de entregadores locais prontos para atender no menor tempo.' },
              { icon: <Star className="w-6 h-6 text-emerald-500" />, title: 'Avaliações reais', desc: 'Compre com confiança lendo avaliações de clientes verificados.' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                  {item.icon}
                </div>
                <div>
                  <h5 className="font-bold text-foreground">{item.title}</h5>
                  <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      {!user && (
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-xl mx-auto">
            <h3 className="text-3xl font-extrabold text-foreground mb-4">
              Pronto para começar?
            </h3>
            <p className="text-muted-foreground mb-8">
              Junte-se ao marketplace regional. Cadastre-se gratuitamente e comece a comprar, vender ou entregar hoje mesmo.
            </p>
            <Link href="/cadastro">
              <Button size="lg" className="font-bold px-10" data-testid="btn-cta-register">
                Criar minha conta grátis
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <p className="text-sm text-muted-foreground mt-4">
              Já tem conta?{' '}
              <Link href="/entrar">
                <span className="text-primary font-semibold hover:underline cursor-pointer">Entrar</span>
              </Link>
            </p>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-border bg-white">
        <div className="container mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏪</span>
            <span className="font-bold text-foreground">Marketplace Regional</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2025 Marketplace Regional. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

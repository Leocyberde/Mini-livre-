import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth, type RegisterData } from '@/contexts/AuthContext';
import { useCep } from '@/hooks/useCep';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';

function formatCPF(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function formatPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function RegisterPage() {
  const { register } = useAuth();
  const { fetchCep, formatCep, loading: cepLoading } = useCep();
  const [, navigate] = useLocation();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    cpf: '',
    name: '',
    email: '',
    whatsapp: '',
    password: '',
    confirmPassword: '',
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleCepBlur = async () => {
    const clean = form.cep.replace(/\D/g, '');
    if (clean.length !== 8) return;
    const addr = await fetchCep(clean);
    if (addr) {
      setForm(prev => ({
        ...prev,
        logradouro: addr.logradouro,
        bairro: addr.bairro,
        cidade: addr.localidade,
        uf: addr.uf,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    if (form.password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    setLoading(true);
    const data: RegisterData = {
      cpf: form.cpf,
      name: form.name,
      email: form.email,
      whatsapp: form.whatsapp,
      password: form.password,
      cep: form.cep,
      logradouro: form.logradouro,
      numero: form.numero,
      complemento: form.complemento,
      bairro: form.bairro,
      cidade: form.cidade,
      uf: form.uf,
    };
    const result = await register(data);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error || 'Erro ao cadastrar');
      return;
    }
    toast.success('Cadastro realizado com sucesso!');
    navigate('/selecionar-papel');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/20 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="bg-white rounded-3xl shadow-xl border border-border/50 overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-primary/80 p-8 text-white">
            <Link href="/entrar">
              <button className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors" data-testid="btn-back-login">
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Voltar ao login</span>
              </button>
            </Link>
            <div className="text-3xl mb-2">🏪</div>
            <h1 className="text-2xl font-bold">Criar conta</h1>
            <p className="text-white/70 mt-1 text-sm">Cadastre-se no Marketplace Regional</p>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-5">
            <div className="grid grid-cols-1 gap-5">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo *</Label>
                <Input id="name" placeholder="Seu nome completo" value={form.name} onChange={set('name')} required data-testid="input-name" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={form.cpf}
                  onChange={e => setForm(prev => ({ ...prev, cpf: formatCPF(e.target.value) }))}
                  maxLength={14}
                  required
                  data-testid="input-cpf"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input id="email" type="email" placeholder="seu@email.com" value={form.email} onChange={set('email')} required data-testid="input-email" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input
                  id="whatsapp"
                  placeholder="(11) 99999-9999"
                  value={form.whatsapp}
                  onChange={e => setForm(prev => ({ ...prev, whatsapp: formatPhone(e.target.value) }))}
                  maxLength={16}
                  data-testid="input-whatsapp"
                />
              </div>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-sm font-semibold text-foreground mb-4">Endereço</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    placeholder="00000-000"
                    value={form.cep}
                    onChange={e => setForm(prev => ({ ...prev, cep: formatCep(e.target.value) }))}
                    onBlur={handleCepBlur}
                    maxLength={9}
                    data-testid="input-cep"
                  />
                  {cepLoading && <p className="text-xs text-muted-foreground">Buscando CEP...</p>}
                </div>
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label htmlFor="numero">Número</Label>
                  <Input id="numero" placeholder="123" value={form.numero} onChange={set('numero')} data-testid="input-numero" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="logradouro">Rua / Logradouro</Label>
                  <Input id="logradouro" placeholder="Rua das Flores" value={form.logradouro} onChange={set('logradouro')} data-testid="input-logradouro" />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input id="complemento" placeholder="Apto, sala, bloco..." value={form.complemento} onChange={set('complemento')} data-testid="input-complemento" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input id="bairro" placeholder="Centro" value={form.bairro} onChange={set('bairro')} data-testid="input-bairro" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input id="cidade" placeholder="São Paulo" value={form.cidade} onChange={set('cidade')} data-testid="input-cidade" />
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-4 space-y-4">
              <p className="text-sm font-semibold text-foreground">Senha</p>
              <div className="space-y-2">
                <Label htmlFor="password">Senha *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={form.password}
                    onChange={set('password')}
                    className="pr-10"
                    required
                    minLength={6}
                    data-testid="input-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar senha *</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Repita a senha"
                  value={form.confirmPassword}
                  onChange={set('confirmPassword')}
                  required
                  data-testid="input-confirm-password"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading} data-testid="btn-register">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {loading ? 'Cadastrando...' : 'Criar conta'}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              Já tem conta?{' '}
              <Link href="/entrar">
                <span className="text-primary font-semibold hover:underline cursor-pointer" data-testid="link-login">
                  Entrar
                </span>
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

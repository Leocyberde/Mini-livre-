import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, ArrowLeft, Loader2, Mail, Lock } from 'lucide-react';

type Step = 'login' | 'forgot-email' | 'forgot-code' | 'forgot-new-password';

export default function LoginPage() {
  const { login } = useAuth();
  const [, navigate] = useLocation();

  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);
    if (!result.success) {
      toast.error(result.error || 'Erro ao entrar');
      return;
    }
    navigate('/selecionar-papel');
  };

  const handleForgotEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim() }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); setLoading(false); return; }
      setStep('forgot-code');
      toast.success('Código enviado! Verifique seu e-mail.');
    } catch {
      toast.error('Erro ao processar solicitação');
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmNewPassword) { toast.error('As senhas não coincidem'); return; }
    if (newPassword.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail.trim(), code: resetCode, newPassword }),
      });
      const data = await res.json();
      if (data.error) { toast.error(data.error); setLoading(false); return; }
      toast.success('Senha alterada com sucesso! Faça o login.');
      setStep('login');
      setEmail(resetEmail);
    } catch {
      toast.error('Erro ao redefinir senha');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl border border-border/50 overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-primary/80 p-8 text-white">
            <Link href="/">
              <button className="flex items-center gap-2 text-white/80 hover:text-white mb-6 transition-colors" data-testid="btn-back-home">
                <ArrowLeft className="w-4 h-4" />
                <span className="text-sm">Voltar</span>
              </button>
            </Link>
            <div className="text-3xl mb-2">🏪</div>
            <h1 className="text-2xl font-bold">
              {step === 'login' && 'Entrar'}
              {step === 'forgot-email' && 'Esqueci minha senha'}
              {step === 'forgot-code' && 'Verificar código'}
              {step === 'forgot-new-password' && 'Nova senha'}
            </h1>
            <p className="text-white/70 mt-1 text-sm">
              {step === 'login' && 'Acesse sua conta no Marketplace Regional'}
              {step === 'forgot-email' && 'Informe seu e-mail para recuperar o acesso'}
              {step === 'forgot-code' && 'Digite o código de verificação'}
              {step === 'forgot-new-password' && 'Crie uma nova senha segura'}
            </p>
          </div>

          <div className="p-8">
            {step === 'login' && (
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      data-testid="input-email"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      data-testid="input-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('forgot-email')}
                  className="text-sm text-primary hover:underline"
                  data-testid="btn-forgot-password"
                >
                  Esqueci minha senha
                </button>
                <Button type="submit" className="w-full" disabled={loading} data-testid="btn-login">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Entrar'}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  Não tem conta?{' '}
                  <Link href="/cadastro">
                    <span className="text-primary font-semibold hover:underline cursor-pointer" data-testid="link-register">
                      Cadastre-se
                    </span>
                  </Link>
                </p>
              </form>
            )}

            {step === 'forgot-email' && (
              <form onSubmit={handleForgotEmail} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">E-mail cadastrado</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="seu@email.com"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      className="pl-10"
                      required
                      data-testid="input-reset-email"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading} data-testid="btn-send-reset-code">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar código'}
                </Button>
                <button type="button" onClick={() => setStep('login')} className="w-full text-sm text-muted-foreground hover:text-foreground">
                  ← Voltar ao login
                </button>
              </form>
            )}

            {step === 'forgot-code' && (
              <form onSubmit={(e) => { e.preventDefault(); setStep('forgot-new-password'); }} className="space-y-5">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
                  <p className="text-blue-800 font-semibold">Verifique seu e-mail</p>
                  <p className="text-blue-700 text-xs mt-1">Um código de 6 dígitos foi enviado para <strong>{resetEmail}</strong>. Digite-o abaixo para continuar.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reset-code">Código de verificação</Label>
                  <Input
                    id="reset-code"
                    type="text"
                    placeholder="000000"
                    value={resetCode}
                    onChange={e => setResetCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="text-center text-2xl tracking-widest font-mono"
                    required
                    data-testid="input-reset-code"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={resetCode.length !== 6} data-testid="btn-verify-code">
                  Verificar código
                </Button>
                <button type="button" onClick={() => setStep('forgot-email')} className="w-full text-sm text-muted-foreground hover:text-foreground">
                  ← Reenviar código
                </button>
              </form>
            )}

            {step === 'forgot-new-password' && (
              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      placeholder="Mínimo 6 caracteres"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      minLength={6}
                      data-testid="input-new-password"
                    />
                    <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password">Confirmar nova senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="confirm-new-password"
                      type="password"
                      placeholder="Repita a senha"
                      value={confirmNewPassword}
                      onChange={e => setConfirmNewPassword(e.target.value)}
                      className="pl-10"
                      required
                      data-testid="input-confirm-new-password"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading} data-testid="btn-reset-password">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar nova senha'}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

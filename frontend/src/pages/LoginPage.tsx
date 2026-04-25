import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { PublicLayout } from '@/layouts/PublicLayout';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/auth-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [loginOrEmail, setLoginOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const startSocialLogin = (provider: 'vk' | 'yandex') => {
    window.location.href = authService.getOAuthLoginUrl(provider);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!loginOrEmail || !password) { setError('Заполните все поля'); return; }
    setError('');
    setLoading(true);
    try {
      await login(loginOrEmail, password);
      toast.success('Добро пожаловать');
      navigate('/');
    } catch (loginError: any) {
      setError(loginError?.message || 'Не удалось выполнить вход');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PublicLayout>
      <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden px-4 py-12">
        {/* Warm background glow */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[hsl(var(--warm-cream))] via-background to-[hsl(var(--golden-light)/0.2)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,hsl(var(--terracotta)/0.07),transparent)]" />

        <div className="relative w-full max-w-[420px]">
          <Link to="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary">
            <ArrowLeft className="h-4 w-4" />
            На главную
          </Link>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lifted">
            {/* Card header */}
            <div className="border-b border-border bg-gradient-to-br from-[hsl(var(--warm-cream)/0.6)] to-card px-8 py-7 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[hsl(var(--terracotta-dark))] shadow-md">
                <span className="font-heading text-2xl font-bold text-primary-foreground">К</span>
              </div>
              <h1 className="font-heading text-2xl text-foreground">Добро пожаловать</h1>
              <p className="mt-1.5 text-sm text-muted-foreground">Войдите в свой аккаунт</p>
            </div>

            <div className="px-8 py-6">
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-1.5">
                  <Label htmlFor="loginOrEmail">Логин или email</Label>
                  <Input
                    id="loginOrEmail"
                    type="text"
                    value={loginOrEmail}
                    onChange={(e) => setLoginOrEmail(e.target.value)}
                    placeholder="ivan.petrov или ivan@mail.com"
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Пароль</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <p className="rounded-lg bg-destructive/8 px-3 py-2 text-sm text-destructive">{error}</p>
                )}

                <Button className="w-full shadow-sm shadow-primary/20" type="submit" disabled={loading}>
                  {loading ? 'Вход…' : 'Войти'}
                </Button>
              </form>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-card px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">или войдите через</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 transition-colors hover:border-[#0077ff]/30 hover:bg-[#0077ff]/5 hover:text-[#0077ff]"
                  onClick={() => startSocialLogin('vk')}
                >
                  <span className="font-bold">VK</span>
                  Войти через VK ID
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 transition-colors hover:border-[#fc3f1d]/30 hover:bg-[#fc3f1d]/5 hover:text-[#fc3f1d]"
                  onClick={() => startSocialLogin('yandex')}
                >
                  <span className="font-bold">Я</span>
                  Войти через Яндекс ID
                </Button>
              </div>

              <p className="mt-6 text-center text-sm text-muted-foreground">
                Нет аккаунта?{' '}
                <Link to="/register" className="font-semibold text-primary hover:underline">
                  Зарегистрироваться
                </Link>
              </p>
            </div>
          </div>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Культурные события малых городов России
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}

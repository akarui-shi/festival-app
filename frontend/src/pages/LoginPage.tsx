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

  const startSocialLogin = (provider: 'google' | 'yandex') => {
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
                  className="w-full gap-2 transition-colors hover:border-[#4285F4]/30 hover:bg-[#4285F4]/5"
                  onClick={() => startSocialLogin('google')}
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Войти через Google
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

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, MailWarning, Sparkles, XCircle } from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Button } from '@/components/ui/button';
import { authService } from '@/services/auth-service';

type VerifyState = 'loading' | 'success' | 'error';

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const [state, setState] = useState<VerifyState>('loading');
  const [message, setMessage] = useState('Проверяем ссылку подтверждения...');

  useEffect(() => {
    const token = searchParams.get('token')?.trim();
    if (!token) {
      setState('error');
      setMessage('Ссылка подтверждения некорректна. Попробуйте открыть письмо заново.');
      return;
    }
    authService.verifyEmail(token)
      .then((response) => { setState('success'); setMessage(response.message || 'Email успешно подтверждён. Теперь можно войти в аккаунт.'); })
      .catch((error: any) => { setState('error'); setMessage(error?.message || 'Не удалось подтвердить email. Запросите новое письмо и попробуйте снова.'); });
  }, [searchParams]);

  const iconBg = state === 'success' ? 'bg-[hsl(var(--success)/0.1)]' : state === 'error' ? 'bg-destructive/10' : 'bg-primary/10';
  const iconColor = state === 'success' ? 'text-[hsl(var(--success))]' : state === 'error' ? 'text-destructive' : 'text-primary';

  return (
    <PublicLayout>
      <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden px-4 py-12">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[hsl(var(--warm-cream))] via-background to-[hsl(var(--golden-light)/0.2)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,hsl(var(--terracotta)/0.07),transparent)]" />

        <div className="relative w-full max-w-[420px]">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lifted">
            <div className="border-b border-border bg-gradient-to-br from-[hsl(var(--warm-cream)/0.6)] to-card px-8 py-7 text-center">
              <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${iconBg}`}>
                {state === 'loading' && <Loader2 className={`h-7 w-7 animate-spin ${iconColor}`} />}
                {state === 'success' && <CheckCircle2 className={`h-7 w-7 ${iconColor}`} />}
                {state === 'error' && <XCircle className={`h-7 w-7 ${iconColor}`} />}
              </div>
              <h1 className="font-heading text-2xl text-foreground">
                {state === 'loading' && 'Подтверждение email'}
                {state === 'success' && 'Email подтверждён'}
                {state === 'error' && 'Не удалось подтвердить'}
              </h1>
            </div>

            <div className="px-8 py-6 text-center">
              <p className="text-sm leading-relaxed text-muted-foreground">{message}</p>

              <div className="mt-6 flex justify-center gap-2">
                <Button asChild className="shadow-sm shadow-primary/20">
                  <Link to="/login">Войти в аккаунт</Link>
                </Button>
                {state === 'error' && (
                  <Button asChild variant="outline">
                    <Link to="/register" className="inline-flex items-center gap-1.5">
                      <MailWarning className="h-4 w-4" />
                      К регистрации
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" />
            Культурные события малых городов России
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}

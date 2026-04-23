import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, MailWarning, XCircle } from 'lucide-react';
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
      .then((response) => {
        setState('success');
        setMessage(response.message || 'Email успешно подтвержден. Теперь можно войти в аккаунт.');
      })
      .catch((error: any) => {
        setState('error');
        setMessage(error?.message || 'Не удалось подтвердить email. Запросите новое письмо и попробуйте снова.');
      });
  }, [searchParams]);

  return (
    <PublicLayout>
      <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          {state === 'loading' && (
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
          )}
          {state === 'success' && (
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-7 w-7" />
            </div>
          )}
          {state === 'error' && (
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <XCircle className="h-7 w-7" />
            </div>
          )}

          <h1 className="font-heading text-2xl text-foreground">
            {state === 'loading' && 'Подтверждение email'}
            {state === 'success' && 'Email подтвержден'}
            {state === 'error' && 'Не удалось подтвердить email'}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">{message}</p>

          <div className="mt-6 flex justify-center gap-2">
            <Button asChild>
              <Link to="/login">Войти</Link>
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
    </PublicLayout>
  );
}

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PublicLayout } from '@/layouts/PublicLayout';
import { useAuth } from '@/contexts/AuthContext';

function resolveErrorMessage(errorCode: string | null): string {
  switch (errorCode) {
    case 'oauth_access_denied':
      return 'Вы отменили вход через соцсеть';
    case 'oauth_session_expired':
      return 'Сессия авторизации истекла. Повторите вход еще раз';
    case 'oauth_provider_error':
      return 'Провайдер авторизации вернул ошибку. Проверьте настройки приложения OAuth';
    case 'social_login_failed':
      return 'Не удалось войти через соцсеть';
    case 'oauth_authentication_failed':
      return 'Ошибка авторизации через соцсеть';
    default:
      return 'Не удалось завершить вход через соцсеть';
  }
}

export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();
  const [searchParams] = useSearchParams();
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    const errorCode = searchParams.get('error');
    const providerError = searchParams.get('provider_error');
    const providerErrorDescription = searchParams.get('provider_error_description');

    if (errorCode) {
      const messageParts = [resolveErrorMessage(errorCode)];
      if (providerError) {
        messageParts.push(`Код провайдера: ${providerError}`);
      }
      if (providerErrorDescription) {
        messageParts.push(providerErrorDescription);
      }
      const message = messageParts.join('. ');
      setErrorText(message);
      toast.error(message);
      return;
    }

    if (!token) {
      const message = 'Не получен токен авторизации';
      setErrorText(message);
      toast.error(message);
      return;
    }

    loginWithToken(token)
      .then(() => {
        toast.success('Вход выполнен');
        navigate('/', { replace: true });
      })
      .catch((error: any) => {
        const message = error?.message || 'Не удалось выполнить вход через соцсеть';
        setErrorText(message);
        toast.error(message);
      });
  }, [loginWithToken, navigate, searchParams]);

  return (
    <PublicLayout>
      <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          <h1 className="font-heading text-2xl text-foreground">Социальный вход</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {errorText || 'Завершаем авторизацию, пожалуйста подождите…'}
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}

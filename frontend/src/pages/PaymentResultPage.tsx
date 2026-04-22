import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Button } from '@/components/ui/button';
import { registrationService } from '@/services/registration-service';

type ResultState = 'loading' | 'success' | 'pending' | 'error';

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const paymentId = searchParams.get('paymentId') || undefined;
  const statusFromQuery = (searchParams.get('status') || '').toLowerCase();

  const [resultState, setResultState] = useState<ResultState>('loading');
  const hasOrderId = useMemo(() => Boolean(orderId && Number.isFinite(Number(orderId))), [orderId]);

  useEffect(() => {
    if (!hasOrderId || !orderId) {
      setResultState(statusFromQuery === 'success' ? 'success' : 'error');
      return;
    }

    let cancelled = false;
    setResultState('loading');
    registrationService.confirmPayment(orderId, paymentId)
      .then((order) => {
        if (cancelled) return;
        const orderStatus = String(order.status || '').toLowerCase();
        const paymentStatus = String(order.paymentStatus || '').toLowerCase();

        if (orderStatus === 'оплачен' || paymentStatus === 'succeeded' || paymentStatus === 'paid') {
          setResultState('success');
          return;
        }

        if (orderStatus === 'ожидает_оплаты' || paymentStatus === 'pending' || paymentStatus === 'waiting_for_capture') {
          setResultState('pending');
          return;
        }

        setResultState('error');
      })
      .catch(() => {
        if (!cancelled) {
          setResultState('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hasOrderId, orderId, paymentId, statusFromQuery]);

  const success = resultState === 'success';
  const pending = resultState === 'pending';
  const loading = resultState === 'loading';

  return (
    <PublicLayout>
      <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          {loading ? (
            <Loader2 className="mx-auto h-14 w-14 animate-spin text-primary" />
          ) : success ? (
            <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
          ) : (
            <XCircle className="mx-auto h-14 w-14 text-destructive" />
          )}
          <h1 className="mt-4 font-heading text-2xl text-foreground">
            {loading
              ? 'Проверяем статус оплаты'
              : success
                ? 'Оплата прошла успешно'
                : pending
                  ? 'Оплата еще обрабатывается'
                  : 'Оплата не завершена'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {loading
              ? 'Подождите несколько секунд, проверяем платёж у провайдера.'
              : success
              ? 'Билет сформирован и отправлен вам на почту. Он доступен в разделе «Мои билеты».'
              : pending
                ? 'Средства могут зачисляться с задержкой. Вы можете обновить страницу или проверить заказ в разделе «Мои билеты».'
                : 'Вы можете попробовать оплатить заказ повторно из раздела «Мои билеты».'}
          </p>

          <div className="mt-6 space-y-3">
            <Button asChild className="w-full">
              <Link to="/tickets">Мои билеты</Link>
            </Button>
            <Button asChild className="w-full" variant="outline">
              <Link to="/events">К афише</Link>
            </Button>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

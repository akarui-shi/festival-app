import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
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
          setResultState('success'); return;
        }
        if (orderStatus === 'ожидает_оплаты' || paymentStatus === 'pending' || paymentStatus === 'waiting_for_capture') {
          setResultState('pending'); return;
        }
        setResultState('error');
      })
      .catch(() => { if (!cancelled) setResultState('error'); });

    return () => { cancelled = true; };
  }, [hasOrderId, orderId, paymentId, statusFromQuery]);

  const success = resultState === 'success';
  const pending = resultState === 'pending';
  const loading = resultState === 'loading';

  const iconBg = success ? 'bg-[hsl(var(--success)/0.1)]' : pending ? 'bg-[hsl(var(--warning)/0.1)]' : loading ? 'bg-primary/10' : 'bg-destructive/10';
  const iconColor = success ? 'text-[hsl(var(--success))]' : pending ? 'text-[hsl(var(--warning))]' : loading ? 'text-primary' : 'text-destructive';

  return (
    <PublicLayout>
      <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden px-4 py-12">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[hsl(var(--warm-cream))] via-background to-[hsl(var(--golden-light)/0.2)]" />

        <div className="relative w-full max-w-[420px]">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lifted">
            <div className="border-b border-border bg-gradient-to-br from-[hsl(var(--warm-cream)/0.6)] to-card px-8 py-8 text-center">
              <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${iconBg}`}>
                {loading && <Loader2 className={`h-8 w-8 animate-spin ${iconColor}`} />}
                {success && <CheckCircle2 className={`h-8 w-8 ${iconColor}`} />}
                {pending && <Clock className={`h-8 w-8 ${iconColor}`} />}
                {!loading && !success && !pending && <XCircle className={`h-8 w-8 ${iconColor}`} />}
              </div>
              <h1 className="font-heading text-2xl text-foreground">
                {loading ? 'Проверяем статус оплаты'
                  : success ? 'Оплата прошла успешно'
                  : pending ? 'Платёж обрабатывается'
                  : 'Оплата не завершена'}
              </h1>
            </div>

            <div className="px-8 py-6 text-center">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {loading ? 'Подождите несколько секунд, проверяем платёж у провайдера.'
                  : success ? 'Билет сформирован и отправлен вам на почту. Он доступен в разделе «Мои билеты».'
                  : pending ? 'Средства могут зачисляться с задержкой. Проверьте заказ в разделе «Мои билеты».'
                  : 'Вы можете попробовать оплатить заказ повторно из раздела «Мои билеты».'}
              </p>

              {!loading && (
                <div className="mt-6 space-y-2.5">
                  <Button asChild className="w-full shadow-sm shadow-primary/20">
                    <Link to="/tickets">Мои билеты</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full">
                    <Link to="/events">К афише</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

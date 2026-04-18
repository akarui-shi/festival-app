import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard, Loader2 } from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Button } from '@/components/ui/button';
import { registrationService } from '@/services/registration-service';

function decodeUrl(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export default function PaymentCheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('orderId');
  const paymentId = searchParams.get('paymentId') || undefined;
  const provider = searchParams.get('provider') || 'yookassa';
  const successUrl = decodeUrl(searchParams.get('successUrl'), '/payment/result?status=success');
  const cancelUrl = decodeUrl(searchParams.get('cancelUrl'), '/payment/result?status=cancel');
  const [processing, setProcessing] = useState(false);

  const isValid = useMemo(() => orderId && Number.isFinite(Number(orderId)), [orderId]);

  const confirm = async () => {
    if (!isValid || !orderId) return;
    setProcessing(true);
    try {
      await registrationService.confirmPayment(orderId, paymentId);
      window.location.assign(successUrl);
    } catch {
      navigate('/payment/result?status=error');
    } finally {
      setProcessing(false);
    }
  };

  if (!isValid) {
    return (
      <PublicLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <p className="text-muted-foreground">Некорректные параметры оплаты.</p>
          <Button asChild className="mt-4"><Link to="/events">Вернуться к афише</Link></Button>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-card">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <h1 className="font-heading text-2xl text-foreground">Оплата заказа</h1>
            <p className="mt-1 text-sm text-muted-foreground">Провайдер: {provider.toUpperCase()}</p>
            <p className="mt-1 text-sm text-muted-foreground">Заказ #{orderId}</p>
          </div>

          <div className="mt-6 space-y-3">
            <Button className="w-full" onClick={confirm} disabled={processing}>
              {processing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Подтверждение…</> : 'Оплатить'}
            </Button>
            <Button className="w-full" variant="outline" onClick={() => window.location.assign(cancelUrl)} disabled={processing}>
              Отменить
            </Button>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

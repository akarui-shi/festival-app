import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CreditCard, Loader2, ShieldCheck } from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Button } from '@/components/ui/button';
import { registrationService } from '@/services/registration-service';

function decodeUrl(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  try { return decodeURIComponent(raw); } catch { return raw; }
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
      <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden px-4 py-12">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[hsl(var(--warm-cream))] via-background to-[hsl(var(--golden-light)/0.2)]" />

        <div className="relative w-full max-w-[420px]">
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lifted">
            <div className="border-b border-border bg-gradient-to-br from-[hsl(var(--warm-cream)/0.6)] to-card px-8 py-7 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <CreditCard className="h-7 w-7 text-primary" />
              </div>
              <h1 className="font-heading text-2xl text-foreground">Оплата заказа</h1>
              <p className="mt-1 text-sm text-muted-foreground">Провайдер: {provider.toUpperCase()}</p>
            </div>

            <div className="px-8 py-6">
              <div className="mb-5 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                Заказ <span className="font-semibold text-foreground">#{orderId}</span>
              </div>

              <div className="space-y-2.5">
                <Button className="w-full gap-2 shadow-sm shadow-primary/20" onClick={confirm} disabled={processing}>
                  {processing ? <><Loader2 className="h-4 w-4 animate-spin" />Подтверждение…</> : 'Оплатить'}
                </Button>
                <Button className="w-full" variant="outline" onClick={() => window.location.assign(cancelUrl)} disabled={processing}>
                  Отменить
                </Button>
              </div>

              <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="h-3.5 w-3.5" />
                Безопасная оплата
              </p>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

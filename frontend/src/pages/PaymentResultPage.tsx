import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Button } from '@/components/ui/button';

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();
  const status = searchParams.get('status');
  const success = status === 'success';

  return (
    <PublicLayout>
      <div className="container mx-auto flex min-h-[70vh] items-center justify-center px-4 py-8">
        <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-card">
          {success ? (
            <CheckCircle2 className="mx-auto h-14 w-14 text-primary" />
          ) : (
            <XCircle className="mx-auto h-14 w-14 text-destructive" />
          )}
          <h1 className="mt-4 font-heading text-2xl text-foreground">
            {success ? 'Оплата прошла успешно' : 'Оплата не завершена'}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {success
              ? 'Билет сформирован и отправлен вам на почту. Он доступен в разделе «Мои билеты».'
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

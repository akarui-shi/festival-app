import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Clock, CreditCard, MapPin, X } from 'lucide-react';
import { toast } from 'sonner';
import { PublicLayout } from '@/layouts/PublicLayout';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/StateDisplays';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { registrationService } from '@/services/registration-service';
import { getRegistrationStatusBadge, isRegistrationActive } from '@/lib/statuses';
import type { Id, Ticket } from '@/types';

export default function RegistrationsPage() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    registrationService
      .getMyRegistrations(user.id)
      .then((response) => setTickets(response))
      .finally(() => setLoading(false));
  }, [user]);

  const cancelRegistration = async (orderId: Id) => {
    await registrationService.cancelRegistration(orderId);
    setTickets((prev) => prev.filter((ticket) => String(ticket.orderId) !== String(orderId)));
    toast.success('Заказ отменён');
  };

  if (loading) {
    return (
      <PublicLayout>
        <LoadingState />
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="font-heading text-3xl text-foreground sm:text-4xl">Мои билеты</h1>
        <p className="mt-1 text-muted-foreground">Ваши активные и завершённые заказы</p>

        {tickets.length === 0 ? (
          <>
            <EmptyState
              icon={CalendarDays}
              title="Нет билетов"
              description="Оформите билет на мероприятие, чтобы он появился здесь"
            />
            <div className="text-center">
              <Button asChild>
                <Link to="/events">Смотреть афишу</Link>
              </Button>
            </div>
          </>
        ) : (
          <div className="mt-8 space-y-4">
            {tickets.map((ticket) => {
              const status = getRegistrationStatusBadge(ticket.status);

              return (
                <div
                  key={ticket.ticketId}
                  className="rounded-xl border border-border bg-card p-5 shadow-soft"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <Link
                        to={ticket.eventId ? `/events/${ticket.eventId}` : '/events'}
                        className="font-heading text-lg text-foreground hover:text-primary"
                      >
                        {ticket.eventTitle || 'Мероприятие'}
                      </Link>

                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 text-primary/70" />
                          {ticket.issuedAt ? new Date(ticket.issuedAt).toLocaleDateString('ru-RU') : 'Дата уточняется'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-primary/70" />
                          {ticket.sessionTitle || 'Сеанс'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-primary/70" />
                          {ticket.qrToken ? `QR: ${ticket.qrToken}` : 'QR будет доступен после оформления'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge className={status.className}>{status.label}</Badge>

                      {ticket.orderId && isRegistrationActive(ticket.status) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => cancelRegistration(ticket.orderId!)}
                        >
                          <X className="mr-1 h-4 w-4" />
                          Отменить заказ
                        </Button>
                      )}
                      {ticket.requiresPayment && ticket.paymentUrl && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => window.location.assign(ticket.paymentUrl!)}
                        >
                          <CreditCard className="mr-1 h-4 w-4" />
                          Оплатить
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PublicLayout>
  );
}

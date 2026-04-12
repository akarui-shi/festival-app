import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Clock, MapPin, X } from 'lucide-react';
import { toast } from 'sonner';
import { PublicLayout } from '@/layouts/PublicLayout';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/StateDisplays';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { registrationService } from '@/services/registration-service';
import type { Registration } from '@/types';

const statusLabels: Record<string, { label: string; className: string }> = {
  CONFIRMED: { label: 'Подтверждено', className: 'bg-primary/10 text-primary' },
  ATTENDED: { label: 'Посещено', className: 'bg-info/10 text-info' },
  CANCELLED: { label: 'Отменено', className: 'bg-destructive/10 text-destructive' },
};

export default function RegistrationsPage() {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    registrationService
      .getMyRegistrations(user.id)
      .then((response) => setRegistrations(response))
      .finally(() => setLoading(false));
  }, [user]);

  const cancelRegistration = async (registrationId: string) => {
    await registrationService.cancelRegistration(registrationId);
    setRegistrations((prev) => prev.filter((registration) => registration.id !== registrationId));
    toast.success('Запись отменена');
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
        <h1 className="font-heading text-3xl text-foreground sm:text-4xl">Мои записи</h1>
        <p className="mt-1 text-muted-foreground">Ваши регистрации на мероприятия</p>

        {registrations.length === 0 ? (
          <>
            <EmptyState
              icon={CalendarDays}
              title="Нет записей"
              description="Запишитесь на мероприятие, чтобы оно появилось здесь"
            />
            <div className="text-center">
              <Button asChild>
                <Link to="/events">Смотреть афишу</Link>
              </Button>
            </div>
          </>
        ) : (
          <div className="mt-8 space-y-4">
            {registrations.map((registration) => {
              const status = statusLabels[registration.status];

              return (
                <div
                  key={registration.id}
                  className="rounded-xl border border-border bg-card p-5 shadow-soft"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex-1">
                      <Link
                        to={`/events/${registration.eventId}`}
                        className="font-heading text-lg text-foreground hover:text-primary"
                      >
                        {registration.event?.title || 'Мероприятие'}
                      </Link>

                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="h-3.5 w-3.5 text-primary/70" />
                          {registration.session?.date || 'Дата уточняется'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-primary/70" />
                          {registration.session?.startTime || '--:--'} - {registration.session?.endTime || '--:--'}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-primary/70" />
                          {registration.event?.venue?.name || 'Площадка уточняется'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge className={status.className}>{status.label}</Badge>

                      {registration.status === 'CONFIRMED' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => cancelRegistration(registration.id)}
                        >
                          <X className="mr-1 h-4 w-4" />
                          Отменить
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

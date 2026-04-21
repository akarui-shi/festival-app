import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, Calendar, Edit, Eye, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog';
import { useAuth } from '@/contexts/AuthContext';
import { eventService } from '@/services/event-service';
import { LoadingState } from '@/components/StateDisplays';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getEventStatusBadge } from '@/lib/statuses';
import type { Event, Id } from '@/types';

export default function OrganizerEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    eventService.getOrganizerEvents(user.id)
      .then((response) => {
        setEvents(response);
        setError(null);
      })
      .catch((err: any) => {
        setEvents([]);
        setError(err?.message || 'Не удалось загрузить мероприятия организации');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);

  const del = async (id: Id) => {
    await eventService.deleteEvent(id);
    setEvents((prev) => prev.filter((event) => String(event.id) !== String(id)));
    toast.success('Мероприятие удалено');
    setEventToDelete(null);
  };

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h1 className="font-heading text-2xl text-foreground">Доступ к мероприятиям недоступен</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl text-foreground sm:text-4xl">Мероприятия организации</h1>
          <p className="mt-1 text-muted-foreground">Создавайте, редактируйте и отслеживайте события вашей организации</p>
        </div>
        <Button asChild>
          <Link to="/organizer/events/create" className="gap-1.5">
            <Plus className="h-4 w-4" />
            Создать
          </Link>
        </Button>
      </div>

      <ConfirmActionDialog
        open={Boolean(eventToDelete)}
        onOpenChange={(open) => {
          if (!open) setEventToDelete(null);
        }}
        title="Удалить мероприятие?"
        description={eventToDelete
          ? `Мероприятие «${eventToDelete.title}» будет удалено без возможности восстановления.`
          : ''}
        confirmLabel="Удалить"
        onConfirm={() => {
          if (eventToDelete) {
            return del(eventToDelete.id);
          }
        }}
      />

      {events.length === 0 ? (
        <div className="space-y-4">
          <EmptyState icon={Calendar} title="Нет мероприятий" description="Создайте своё первое мероприятие" />
          <div className="text-center">
            <Button asChild>
              <Link to="/organizer/events/create">Создать мероприятие</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => {
            const status = getEventStatusBadge(event.status);
            const categoryLabel = event.categories?.[0]?.name || event.category?.name || 'Категория не указана';
            const cityLabel = event.cityName || event.city?.name || 'Город не указан';
            const sessionsCount = Number(event.sessionsCount ?? event.sessionDates?.length ?? 0);
            const registrationsCount = Number(event.registrationsCount ?? 0);
            return (
              <div
                key={event.id}
                className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-soft md:flex-row md:items-center md:justify-between"
              >
                <div className="flex-1 min-w-0">
                  <div className="mb-1 flex items-center gap-2">
                    <h3 className="truncate font-medium text-foreground">{event.title}</h3>
                    <Badge className={`${status.className} border-0 text-xs`}>{status.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {categoryLabel} · {cityLabel} · {sessionsCount} сеансов · {registrationsCount} записей
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" asChild>
                    <Link to={`/events/${event.id}`}>
                      <span className="sr-only">Открыть страницу мероприятия</span>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" asChild>
                    <Link to={`/organizer/events/${event.id}/edit`}>
                      <span className="sr-only">Редактировать мероприятие</span>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" asChild>
                    <Link to={`/organizer/events/${event.id}/stats`}>
                      <span className="sr-only">Открыть статистику</span>
                      <BarChart3 className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setEventToDelete(event)}
                    className="text-destructive"
                    aria-label="Удалить мероприятие"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

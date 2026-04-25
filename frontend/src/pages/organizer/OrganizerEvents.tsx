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
import { imageSrc } from '@/lib/image';
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
      .then((response) => { setEvents(response); setError(null); })
      .catch((err: any) => { setEvents([]); setError(err?.message || 'Не удалось загрузить мероприятия'); })
      .finally(() => setLoading(false));
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
      <div className="surface-panel">
        <h1 className="page-title">Ошибка загрузки</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Мероприятия</h1>
          <p className="mt-1 text-muted-foreground">Управляйте событиями вашей организации</p>
        </div>
        <Button asChild className="gap-1.5 shadow-sm shadow-primary/20">
          <Link to="/organizer/events/create">
            <Plus className="h-4 w-4" />
            Создать
          </Link>
        </Button>
      </div>

      <ConfirmActionDialog
        open={Boolean(eventToDelete)}
        onOpenChange={(open) => { if (!open) setEventToDelete(null); }}
        title="Удалить мероприятие?"
        description={eventToDelete ? `Мероприятие «${eventToDelete.title}» будет удалено без возможности восстановления.` : ''}
        confirmLabel="Удалить"
        onConfirm={() => { if (eventToDelete) return del(eventToDelete.id); }}
      />

      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <EmptyState icon={Calendar} title="Нет мероприятий" description="Создайте своё первое мероприятие" />
          <Button asChild className="gap-1.5">
            <Link to="/organizer/events/create">
              <Plus className="h-4 w-4" />
              Создать мероприятие
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {events.map((event) => {
            const status = getEventStatusBadge(event.status);
            const categoryLabel = event.categories?.[0]?.name || event.category?.name || null;
            const cityLabel = event.cityName || event.city?.name || null;
            const sessionsCount = Number(event.sessionsCount ?? event.sessionDates?.length ?? 0);
            const registrationsCount = Number(event.registrationsCount ?? 0);
            const thumbnail = imageSrc(event.coverImageId == null ? null : Number(event.coverImageId), '/placeholder-event.svg');

            return (
              <div
                key={event.id}
                className="flex items-center gap-4 rounded-2xl border border-border bg-card p-3 shadow-soft transition-all duration-200 hover:border-primary/15 hover:shadow-card"
              >
                {/* Thumbnail */}
                <div className="relative hidden h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-muted sm:block">
                  <img
                    src={thumbnail}
                    alt={event.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/placeholder-event.svg'; }}
                  />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold text-foreground">{event.title}</h3>
                    <Badge className={`${status.className} border-0 text-[11px] px-2 py-0`}>{status.label}</Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {[categoryLabel, cityLabel].filter(Boolean).join(' · ')}
                    {(categoryLabel || cityLabel) && (sessionsCount > 0 || registrationsCount > 0) ? ' · ' : ''}
                    {sessionsCount > 0 ? `${sessionsCount} сеанс${sessionsCount === 1 ? '' : 'а'}` : ''}
                    {sessionsCount > 0 && registrationsCount > 0 ? ' · ' : ''}
                    {registrationsCount > 0 ? `${registrationsCount} записей` : ''}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Открыть страницу"
                    asChild
                  >
                    <Link to={`/events/${event.id}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Редактировать"
                    asChild
                  >
                    <Link to={`/organizer/events/${event.id}/edit`}>
                      <Edit className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Статистика"
                    asChild
                  >
                    <Link to={`/organizer/events/${event.id}/stats`}>
                      <BarChart3 className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    title="Удалить"
                    onClick={() => setEventToDelete(event)}
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

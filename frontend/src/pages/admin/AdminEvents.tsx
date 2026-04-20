import { useEffect, useState } from 'react';
import { Calendar, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { eventService } from '@/services/event-service';
import { LoadingState } from '@/components/StateDisplays';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getEventStatusBadge } from '@/lib/statuses';
import type { Event, EventStatus } from '@/types';

export default function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    eventService.getAllEvents().then((response) => {
      setEvents(response);
      setLoading(false);
    });
  }, []);

  const changeStatus = async (id: string, status: EventStatus) => {
    await eventService.updateEvent(id, { status });
    setEvents((prev) => prev.map((event) => (String(event.id) === String(id) ? { ...event, status } : event)));
    toast.success('Статус обновлён');
  };

  if (loading) return <LoadingState />;

  if (events.length === 0) {
    return <EmptyState icon={Calendar} title="Нет мероприятий" description="Модерация пока не требуется" />;
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-heading text-3xl text-foreground sm:text-4xl">Мероприятия</h1>
        <p className="mt-1 text-muted-foreground">Проверка и публикация мероприятий организаторов</p>
      </section>

      <div className="space-y-3">
        {events.map((event) => {
          const status = getEventStatusBadge(event.status || 'PENDING', event.moderationStatus);
          return (
            <div
              key={event.id}
              className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-soft md:flex-row md:items-center md:justify-between"
            >
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-medium text-foreground">{event.title}</span>
                  <Badge className={`${status.className} border-0 text-xs`}>{status.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {event.categories?.[0]?.name || 'Категория не указана'} · {event.cityName || 'Город не указан'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link to={`/events/${event.id}`} target="_blank" rel="noreferrer" className="gap-1.5">
                    Подробнее
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </Button>
                {(event.status === 'PENDING' || event.status === 'PENDING_APPROVAL') && (
                  <>
                    <Button size="sm" onClick={() => changeStatus(String(event.id), 'PUBLISHED')}>
                      Опубликовать
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => changeStatus(String(event.id), 'REJECTED')}>
                      Отклонить
                    </Button>
                  </>
                )}
                {event.status === 'PUBLISHED' && (
                  <Button size="sm" variant="outline" onClick={() => changeStatus(String(event.id), 'ARCHIVED')}>
                    Отменить
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

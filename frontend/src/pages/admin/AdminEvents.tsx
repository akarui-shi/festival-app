import { useEffect, useMemo, useState } from 'react';
import { Calendar, ExternalLink, Filter, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { eventService } from '@/services/event-service';
import { LoadingState } from '@/components/StateDisplays';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getEventStatusBadge } from '@/lib/statuses';
import type { Event, EventStatus } from '@/types';

type EventFilterKey = 'ALL' | 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';

const FILTER_LABELS: Record<EventFilterKey, string> = {
  ALL: 'Все',
  PENDING: 'На модерации',
  PUBLISHED: 'Опубликованные',
  REJECTED: 'Отклонённые',
  ARCHIVED: 'Архив',
};

function normalizeEventStatus(value?: string | null): EventFilterKey | 'OTHER' {
  const key = String(value || '').trim().toUpperCase();
  if (key === 'PUBLISHED') return 'PUBLISHED';
  if (key === 'REJECTED') return 'REJECTED';
  if (key === 'ARCHIVED') return 'ARCHIVED';
  if (key === 'PENDING' || key === 'PENDING_APPROVAL' || key === 'DRAFT') return 'PENDING';
  return 'OTHER';
}

export default function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<EventFilterKey>('PENDING');

  useEffect(() => {
    eventService.getAllEvents().then((response) => {
      setEvents(response);
      setLoading(false);
    });
  }, []);

  const counts = useMemo(() => {
    return events.reduce<Record<EventFilterKey, number>>((acc, event) => {
      const status = normalizeEventStatus(event.status);
      acc.ALL += 1;
      if (status === 'PENDING') acc.PENDING += 1;
      if (status === 'PUBLISHED') acc.PUBLISHED += 1;
      if (status === 'REJECTED') acc.REJECTED += 1;
      if (status === 'ARCHIVED') acc.ARCHIVED += 1;
      return acc;
    }, { ALL: 0, PENDING: 0, PUBLISHED: 0, REJECTED: 0, ARCHIVED: 0 });
  }, [events]);

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events
      .filter((event) => {
        if (filter === 'ALL') return true;
        return normalizeEventStatus(event.status) === filter;
      })
      .filter((event) => {
        if (!q) return true;
        const haystack = [
          event.title,
          event.shortDescription,
          event.organizationName,
          event.cityName,
          ...(event.categories || []).map((category) => category.name),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => {
        const statusA = normalizeEventStatus(a.status);
        const statusB = normalizeEventStatus(b.status);
        if (statusA === 'PENDING' && statusB !== 'PENDING') return -1;
        if (statusA !== 'PENDING' && statusB === 'PENDING') return 1;
        const aDate = a.createdAt ? Date.parse(a.createdAt) : 0;
        const bDate = b.createdAt ? Date.parse(b.createdAt) : 0;
        return bDate - aDate;
      });
  }, [events, filter, query]);

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
        <p className="mt-1 text-muted-foreground">Очередь модерации, быстрые фильтры и публикация в один клик</p>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 shadow-soft">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
            <Filter className="h-4 w-4" />
            Статус:
          </div>
          {(Object.keys(FILTER_LABELS) as EventFilterKey[]).map((key) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={filter === key ? 'default' : 'outline'}
              onClick={() => setFilter(key)}
            >
              {FILTER_LABELS[key]} ({counts[key]})
            </Button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по названию, городу, организации, категории"
          />
        </div>
      </section>

      {filteredEvents.length === 0 ? (
        <EmptyState icon={Calendar} title="Ничего не найдено" description="Смените фильтр или строку поиска" />
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((event) => {
            const status = getEventStatusBadge(event.status || 'PENDING', event.moderationStatus);
            const categoryText = (event.categories || []).map((category) => category.name).join(', ') || 'Категории не указаны';
            const createdAtLabel = event.createdAt
              ? new Date(event.createdAt).toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
              : 'Дата не указана';

            return (
              <div
                key={event.id}
                className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 shadow-soft md:flex-row md:items-start md:justify-between"
              >
                <div className="flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{event.title}</span>
                    <Badge className={`${status.className} border-0 text-xs`}>{status.label}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{event.shortDescription || 'Краткое описание отсутствует'}</p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {categoryText} · {event.cityName || 'Город не указан'} · {event.organizationName || 'Организация не указана'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Создано: {createdAtLabel} · Сеансов: {event.sessionsCount ?? event.sessionDates?.length ?? 0} · Записей: {event.registrationsCount ?? 0}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/events/${event.id}`} target="_blank" rel="noreferrer" className="gap-1.5">
                      Открыть
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
                      В архив
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

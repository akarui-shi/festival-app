import { useEffect, useMemo, useState } from 'react';
import { Calendar, ExternalLink, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { eventService } from '@/services/event-service';
import { imageSrc } from '@/lib/image';
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

function normalizeEventStatus(event: Event): EventFilterKey | 'OTHER' {
  const key = String(event.status || '').trim().toUpperCase();
  if (key === 'PUBLISHED' || key === 'ОПУБЛИКОВАНО') return 'PUBLISHED';
  if (key === 'REJECTED') return 'REJECTED';
  if (key === 'ARCHIVED' || key === 'ЗАВЕРШЕНО' || key === 'АРХИВИРОВАНО') return 'ARCHIVED';
  if (key === 'PENDING' || key === 'PENDING_APPROVAL' || key === 'НА_РАССМОТРЕНИИ') return 'PENDING';
  if (key === 'ОТКЛОНЕНО' || key === 'ОТМЕНЕНО' || key === 'CANCELLED' || key === 'CANCELED') return 'REJECTED';
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
    return events.reduce<Record<EventFilterKey, number>>(
      (acc, event) => {
        const status = normalizeEventStatus(event);
        acc.ALL += 1;
        if (status === 'PENDING') acc.PENDING += 1;
        if (status === 'PUBLISHED') acc.PUBLISHED += 1;
        if (status === 'REJECTED') acc.REJECTED += 1;
        if (status === 'ARCHIVED') acc.ARCHIVED += 1;
        return acc;
      },
      { ALL: 0, PENDING: 0, PUBLISHED: 0, REJECTED: 0, ARCHIVED: 0 },
    );
  }, [events]);

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events
      .filter((event) => filter === 'ALL' || normalizeEventStatus(event) === filter)
      .filter((event) => {
        if (!q) return true;
        return [event.title, event.shortDescription, event.organizationName, event.cityName, ...(event.categories || []).map((c) => c.name)]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => {
        const sa = normalizeEventStatus(a);
        const sb = normalizeEventStatus(b);
        if (sa === 'PENDING' && sb !== 'PENDING') return -1;
        if (sa !== 'PENDING' && sb === 'PENDING') return 1;
        return (b.createdAt ? Date.parse(b.createdAt) : 0) - (a.createdAt ? Date.parse(a.createdAt) : 0);
      });
  }, [events, filter, query]);

  const changeStatus = async (id: string, status: EventStatus) => {
    const updated = await eventService.updateEvent(id, { status });
    setEvents((prev) => prev.map((event) => (String(event.id) === String(id) ? { ...event, ...updated } : event)));
    toast.success('Статус обновлён');
  };

  if (loading) return <LoadingState />;

  if (events.length === 0) {
    return <EmptyState icon={Calendar} title="Нет мероприятий" description="Модерация пока не требуется" />;
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="page-title">Мероприятия</h1>
        <p className="mt-1 text-muted-foreground">Очередь модерации, быстрые фильтры и публикация в один клик</p>
      </section>

      {/* Filters */}
      <section className="surface-soft space-y-3">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FILTER_LABELS) as EventFilterKey[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all duration-150 ${
                filter === key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'border border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground'
              }`}
            >
              {FILTER_LABELS[key]}
              <span className={`rounded-full px-1.5 py-0 text-xs font-bold ${filter === key ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'}`}>
                {counts[key]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по названию, городу, организации..."
            className="pl-9"
          />
        </div>
      </section>

      {filteredEvents.length === 0 ? (
        <EmptyState icon={Calendar} title="Ничего не найдено" description="Смените фильтр или строку поиска" />
      ) : (
        <div className="space-y-2.5">
          {filteredEvents.map((event) => {
            const status = getEventStatusBadge(event.status || 'PENDING');
            const normalizedStatus = normalizeEventStatus(event);
            const thumbnail = imageSrc(event.coverImageId == null ? null : Number(event.coverImageId), '/placeholder-event.svg');
            const categoryText = (event.categories || []).map((c) => c.name).filter(Boolean).join(', ');
            const createdAtLabel = event.createdAt
              ? new Date(event.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              : null;

            return (
              <div
                key={event.id}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-soft transition-all duration-200 hover:border-primary/15 hover:shadow-card md:flex-row md:items-center"
              >
                {/* Thumbnail */}
                <div className="relative hidden h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-muted md:block">
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
                    <span className="font-semibold text-foreground">{event.title}</span>
                    <Badge className={`${status.className} border-0 text-[11px] px-2 py-0`}>{status.label}</Badge>
                  </div>
                  {event.shortDescription && (
                    <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{event.shortDescription}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {[categoryText || null, event.cityName || null, event.organizationName || null].filter(Boolean).join(' · ')}
                  </p>
                  {createdAtLabel && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Создано: {createdAtLabel}
                      {(event.sessionsCount ?? 0) > 0 && ` · ${event.sessionsCount} сеансов`}
                      {(event.registrationsCount ?? 0) > 0 && ` · ${event.registrationsCount} записей`}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 md:shrink-0">
                  <Button size="sm" variant="outline" asChild>
                    <Link to={`/events/${event.id}`} target="_blank" rel="noreferrer" className="gap-1.5">
                      Открыть
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  {normalizedStatus === 'PENDING' && (
                    <>
                      <Button
                        size="sm"
                        className="bg-[hsl(var(--success))] text-white hover:bg-[hsl(var(--success)/0.85)] shadow-sm"
                        onClick={() => changeStatus(String(event.id), 'PUBLISHED')}
                      >
                        Опубликовать
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => changeStatus(String(event.id), 'REJECTED')}
                      >
                        Отклонить
                      </Button>
                    </>
                  )}
                  {normalizedStatus === 'PUBLISHED' && (
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

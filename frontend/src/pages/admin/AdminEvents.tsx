import { useEffect, useState } from 'react';
import { eventService } from '@/services/event-service';
import { LoadingState } from '@/components/StateDisplays';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Event, EventStatus } from '@/types';
import { toast } from 'sonner';

const statusMap: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Черновик', cls: 'bg-muted text-muted-foreground' },
  PENDING: { label: 'На модерации', cls: 'bg-warning/10 text-warning' },
  PUBLISHED: { label: 'Опубликовано', cls: 'bg-success/10 text-success' },
  REJECTED: { label: 'Отклонено', cls: 'bg-destructive/10 text-destructive' },
  CANCELLED: { label: 'Отменено', cls: 'bg-muted text-muted-foreground' },
};

export default function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { eventService.getAllEvents().then(e => { setEvents(e); setLoading(false); }); }, []);

  const changeStatus = async (id: string, status: EventStatus) => {
    await eventService.updateEvent(id, { status });
    setEvents(prev => prev.map(e => e.id === id ? { ...e, status } : e));
    toast.success('Статус обновлён');
  };

  if (loading) return <LoadingState />;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">Модерация мероприятий</h1>
      <div className="space-y-3">
        {events.map(event => {
          const st = statusMap[event.status];
          return (
            <div key={event.id} className="p-4 rounded-xl border border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{event.title}</span>
                  <Badge className={`${st.cls} border-0 text-xs`}>{st.label}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{event.category?.name} · {event.city?.name}</p>
              </div>
              <div className="flex items-center gap-2">
                {event.status === 'PENDING' && (
                  <>
                    <Button size="sm" onClick={() => changeStatus(event.id, 'PUBLISHED')}>Опубликовать</Button>
                    <Button size="sm" variant="destructive" onClick={() => changeStatus(event.id, 'REJECTED')}>Отклонить</Button>
                  </>
                )}
                {event.status === 'PUBLISHED' && (
                  <Button size="sm" variant="outline" onClick={() => changeStatus(event.id, 'CANCELLED')}>Отменить</Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

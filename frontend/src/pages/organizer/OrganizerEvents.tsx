import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { eventService } from '@/services/event-service';
import { LoadingState, EmptyState } from '@/components/StateDisplays';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Event } from '@/types';
import { Plus, Calendar, Edit, Trash2, Eye, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';

const statusMap: Record<string, { label: string; cls: string }> = {
  DRAFT: { label: 'Черновик', cls: 'bg-muted text-muted-foreground' },
  PENDING: { label: 'На модерации', cls: 'bg-warning/10 text-warning' },
  PUBLISHED: { label: 'Опубликовано', cls: 'bg-success/10 text-success' },
  REJECTED: { label: 'Отклонено', cls: 'bg-destructive/10 text-destructive' },
  CANCELLED: { label: 'Отменено', cls: 'bg-muted text-muted-foreground' },
};

export default function OrganizerEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    eventService.getOrganizerEvents(user.id).then(e => { setEvents(e); setLoading(false); });
  }, [user]);

  const del = async (id: string) => {
    if (!confirm('Удалить мероприятие?')) return;
    await eventService.deleteEvent(id);
    setEvents(prev => prev.filter(e => e.id !== id));
    toast.success('Мероприятие удалено');
  };

  if (loading) return <LoadingState />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-heading text-2xl font-bold">Мои мероприятия</h1>
        <Button asChild><Link to="/organizer/events/create"><Plus className="h-4 w-4 mr-1" />Создать</Link></Button>
      </div>

      {events.length === 0 ? (
        <EmptyState icon={<Calendar className="h-12 w-12 text-muted-foreground" />} title="Нет мероприятий" description="Создайте своё первое мероприятие"
          action={<Button asChild><Link to="/organizer/events/create">Создать мероприятие</Link></Button>} />
      ) : (
        <div className="space-y-3">
          {events.map(event => {
            const st = statusMap[event.status];
            return (
              <div key={event.id} className="p-4 rounded-xl border border-border bg-card flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium truncate">{event.title}</h3>
                    <Badge className={`${st.cls} border-0 text-xs`}>{st.label}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{event.category?.name} · {event.city?.name} · {event.sessionsCount || 0} сеансов · {event.registrationsCount || 0} записей</p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" asChild><Link to={`/events/${event.id}`}><Eye className="h-4 w-4" /></Link></Button>
                  <Button variant="ghost" size="icon" asChild><Link to={`/organizer/events/${event.id}/edit`}><Edit className="h-4 w-4" /></Link></Button>
                  <Button variant="ghost" size="icon" asChild><Link to={`/organizer/events/${event.id}/stats`}><BarChart3 className="h-4 w-4" /></Link></Button>
                  <Button variant="ghost" size="icon" onClick={() => del(event.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

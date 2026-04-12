import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, Clock, Plus, Star, Users } from 'lucide-react';
import { toast } from 'sonner';
import { organizerService } from '@/services/organizer-service';
import { sessionService } from '@/services/session-service';
import { registrationService } from '@/services/registration-service';
import { LoadingState, ErrorState } from '@/components/StateDisplays';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { OrganizerEventStats, Session, Registration } from '@/types';

export default function EventStatsPage() {
  const { id } = useParams<{ id: string }>();
  const [stats, setStats] = useState<OrganizerEventStats | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSession, setShowAddSession] = useState(false);
  const [newSession, setNewSession] = useState({ date: '', startTime: '', endTime: '', maxParticipants: '50' });

  useEffect(() => {
    if (!id) return;
    Promise.all([
      organizerService.getEventStats(id),
      sessionService.getSessionsByEvent(id),
      registrationService.getRegistrationsByEvent(id),
    ]).then(([statsResponse, sessionsResponse, registrationsResponse]) => {
      setStats(statsResponse);
      setSessions(sessionsResponse);
      setRegistrations(registrationsResponse);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const addSession = async () => {
    if (!id) return;
    try {
      const s = await sessionService.createSession({ eventId: id, ...newSession, maxParticipants: Number(newSession.maxParticipants) });
      setSessions((prev) => [...prev, s]);
      setShowAddSession(false);
      setNewSession({ date: '', startTime: '', endTime: '', maxParticipants: '50' });
      toast.success('Сеанс добавлен');
    } catch { toast.error('Ошибка'); }
  };

  const deleteSession = async (sId: string) => {
    await sessionService.deleteSession(sId);
    setSessions((prev) => prev.filter((session) => session.id !== sId));
    toast.success('Сеанс удалён');
  };

  if (loading) return <LoadingState />;
  if (!stats) return <ErrorState message="Не найдено" />;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-heading text-3xl text-foreground sm:text-4xl">{stats.eventTitle}</h1>
        <p className="mt-1 text-muted-foreground">Статистика и управление сеансами</p>
      </section>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
          <Users className="mb-1 h-4 w-4 text-primary" />
          <p className="text-xs text-muted-foreground">Записей</p>
          <p className="text-xl font-bold text-foreground">{stats.totalRegistrations}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
          <Star className="mb-1 h-4 w-4 text-warning" />
          <p className="text-xs text-muted-foreground">Рейтинг</p>
          <p className="text-xl font-bold text-foreground">{stats.averageRating.toFixed(1)}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
          <Calendar className="mb-1 h-4 w-4 text-info" />
          <p className="text-xs text-muted-foreground">Сеансов</p>
          <p className="text-xl font-bold text-foreground">{stats.sessionsCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
          <Clock className="mb-1 h-4 w-4 text-success" />
          <p className="text-xs text-muted-foreground">Активных участников</p>
          <p className="text-xl font-bold text-foreground">{stats.totalAttended}</p>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-2xl text-foreground">Сеансы</h2>
          <Button size="sm" variant="outline" onClick={() => setShowAddSession(!showAddSession)}>
            <Plus className="mr-1 h-4 w-4" />
            Добавить
          </Button>
        </div>

        {showAddSession && (
          <div className="space-y-3 rounded-xl border border-border bg-background/60 p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <Label>Дата</Label>
                <Input type="date" value={newSession.date} onChange={(e) => setNewSession((p) => ({ ...p, date: e.target.value }))} />
              </div>
              <div>
                <Label>Начало</Label>
                <Input type="time" value={newSession.startTime} onChange={(e) => setNewSession((p) => ({ ...p, startTime: e.target.value }))} />
              </div>
              <div>
                <Label>Конец</Label>
                <Input type="time" value={newSession.endTime} onChange={(e) => setNewSession((p) => ({ ...p, endTime: e.target.value }))} />
              </div>
              <div>
                <Label>Мест</Label>
                <Input
                  type="number"
                  value={newSession.maxParticipants}
                  onChange={(e) => setNewSession((p) => ({ ...p, maxParticipants: e.target.value }))}
                />
              </div>
            </div>
            <Button size="sm" onClick={addSession}>Сохранить</Button>
          </div>
        )}

        <div className="space-y-2">
          {sessions.length === 0 && (
            <EmptyState icon={Calendar} title="Сеансов нет" description="Добавьте первый сеанс для начала регистрации" />
          )}

          {sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-border bg-background/60 p-3 text-sm">
              <div className="flex items-center gap-3">
                <span>{s.date}</span>
                <span className="text-muted-foreground">{s.startTime}-{s.endTime}</span>
                <Badge variant="secondary">{s.currentParticipants}/{s.maxParticipants}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => deleteSession(s.id)} className="text-destructive text-xs">Удалить</Button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-heading text-2xl text-foreground">Регистрации ({registrations.length})</h2>
        {registrations.length === 0 ? (
          <EmptyState icon={Users} title="Нет регистраций" description="Пользователи пока не записались на это событие" />
        ) : (
          <div className="space-y-2">
            {registrations.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-border bg-background/60 p-3 text-sm">
                <span>{r.user?.firstName || 'Пользователь'} {r.user?.lastName || ''}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{r.session?.date} {r.session?.startTime}</span>
                  <Badge variant={r.status === 'CONFIRMED' ? 'default' : 'secondary'} className="text-xs">{r.status === 'CONFIRMED' ? 'Подтверждено' : r.status === 'ATTENDED' ? 'Посещено' : 'Отменено'}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

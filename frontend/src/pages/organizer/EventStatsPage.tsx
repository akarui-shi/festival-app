import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { organizerService } from '@/services/organizer-service';
import { sessionService } from '@/services/session-service';
import { registrationService } from '@/services/registration-service';
import { LoadingState, ErrorState } from '@/components/StateDisplays';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { OrganizerEventStats, Session, Registration } from '@/types';
import { Calendar, Users, Star, Clock, Plus } from 'lucide-react';
import { toast } from 'sonner';

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
    ]).then(([s, sess, regs]) => {
      setStats(s); setSessions(sess); setRegistrations(regs); setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const addSession = async () => {
    if (!id) return;
    try {
      const s = await sessionService.createSession({ eventId: id, ...newSession, maxParticipants: Number(newSession.maxParticipants) });
      setSessions(prev => [...prev, s]);
      setShowAddSession(false);
      setNewSession({ date: '', startTime: '', endTime: '', maxParticipants: '50' });
      toast.success('Сеанс добавлен');
    } catch { toast.error('Ошибка'); }
  };

  const deleteSession = async (sId: string) => {
    await sessionService.deleteSession(sId);
    setSessions(prev => prev.filter(s => s.id !== sId));
    toast.success('Сеанс удалён');
  };

  if (loading) return <LoadingState />;
  if (!stats) return <ErrorState message="Не найдено" />;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-2">{stats.eventTitle}</h1>
      <p className="text-muted-foreground mb-6">Статистика и управление</p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-4 rounded-xl border border-border bg-card">
          <Users className="h-4 w-4 text-primary mb-1" /><p className="text-xs text-muted-foreground">Записей</p><p className="text-xl font-bold">{stats.totalRegistrations}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <Star className="h-4 w-4 text-warning mb-1" /><p className="text-xs text-muted-foreground">Рейтинг</p><p className="text-xl font-bold">{stats.averageRating.toFixed(1)}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <Calendar className="h-4 w-4 text-info mb-1" /><p className="text-xs text-muted-foreground">Сеансов</p><p className="text-xl font-bold">{stats.sessionsCount}</p>
        </div>
        <div className="p-4 rounded-xl border border-border bg-card">
          <Clock className="h-4 w-4 text-success mb-1" /><p className="text-xs text-muted-foreground">Посетили</p><p className="text-xl font-bold">{stats.totalAttended}</p>
        </div>
      </div>

      {/* Sessions */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-bold">Сеансы</h2>
          <Button size="sm" variant="outline" onClick={() => setShowAddSession(!showAddSession)}>
            <Plus className="h-4 w-4 mr-1" />Добавить
          </Button>
        </div>

        {showAddSession && (
          <div className="p-4 rounded-xl border border-border bg-card mb-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div><Label>Дата</Label><Input type="date" value={newSession.date} onChange={e => setNewSession(p => ({ ...p, date: e.target.value }))} /></div>
              <div><Label>Начало</Label><Input type="time" value={newSession.startTime} onChange={e => setNewSession(p => ({ ...p, startTime: e.target.value }))} /></div>
              <div><Label>Конец</Label><Input type="time" value={newSession.endTime} onChange={e => setNewSession(p => ({ ...p, endTime: e.target.value }))} /></div>
              <div><Label>Мест</Label><Input type="number" value={newSession.maxParticipants} onChange={e => setNewSession(p => ({ ...p, maxParticipants: e.target.value }))} /></div>
            </div>
            <Button size="sm" onClick={addSession}>Сохранить</Button>
          </div>
        )}

        <div className="space-y-2">
          {sessions.map(s => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card text-sm">
              <div className="flex items-center gap-3">
                <span>{s.date}</span><span className="text-muted-foreground">{s.startTime}–{s.endTime}</span>
                <Badge variant="secondary">{s.currentParticipants}/{s.maxParticipants}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => deleteSession(s.id)} className="text-destructive text-xs">Удалить</Button>
            </div>
          ))}
        </div>
      </div>

      {/* Registrations */}
      <div>
        <h2 className="font-heading text-lg font-bold mb-4">Регистрации ({registrations.length})</h2>
        {registrations.length === 0 ? <p className="text-sm text-muted-foreground">Нет регистраций</p> : (
          <div className="space-y-2">
            {registrations.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card text-sm">
                <span>{r.user?.firstName || 'Пользователь'} {r.user?.lastName || ''}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{r.session?.date} {r.session?.startTime}</span>
                  <Badge variant={r.status === 'CONFIRMED' ? 'default' : 'secondary'} className="text-xs">{r.status === 'CONFIRMED' ? 'Подтверждено' : r.status === 'ATTENDED' ? 'Посещено' : 'Отменено'}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

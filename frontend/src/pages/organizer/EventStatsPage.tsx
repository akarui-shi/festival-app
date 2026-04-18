import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, Clock, Plus, Star, Users } from 'lucide-react';
import { toast } from 'sonner';
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog';
import { organizerService } from '@/services/organizer-service';
import { sessionService } from '@/services/session-service';
import { registrationService } from '@/services/registration-service';
import { LoadingState, ErrorState } from '@/components/StateDisplays';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Id, OrganizerEventStatsBundle, Session, SessionRegistration } from '@/types';

export default function EventStatsPage() {
  const { id } = useParams<{ id: string }>();
  const [stats, setStats] = useState<OrganizerEventStatsBundle | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [registrations, setRegistrations] = useState<SessionRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddSession, setShowAddSession] = useState(false);
  const [newSession, setNewSession] = useState({ date: '', startTime: '', endTime: '', maxParticipants: '50' });
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);

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

  const deleteSession = async (sId: Id) => {
    await sessionService.deleteSession(sId);
    setSessions((prev) => prev.filter((session) => String(session.id) !== String(sId)));
    toast.success('Сеанс удалён');
    setSessionToDelete(null);
  };

  if (loading) return <LoadingState />;
  if (!stats) return <ErrorState message="Не найдено" />;

  return (
    <div className="space-y-8">
      <section>
        <h1 className="page-title">{stats.engagement.eventTitle}</h1>
        <p className="mt-1 text-muted-foreground">Статистика и управление сеансами</p>
      </section>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="metric-card">
          <div className="metric-icon">
            <Users className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground">Записей</p>
          <p className="text-xl font-semibold text-foreground">{stats.engagement.registrationsCount || 0}</p>
        </div>
        <div className="metric-card">
          <div className="metric-icon">
            <Star className="h-4 w-4 text-warning" />
          </div>
          <p className="text-xs text-muted-foreground">Рейтинг</p>
          <p className="text-xl font-semibold text-foreground">{(stats.engagement.averageRating || 0).toFixed(1)}</p>
        </div>
        <div className="metric-card">
          <div className="metric-icon">
            <Calendar className="h-4 w-4 text-info" />
          </div>
          <p className="text-xs text-muted-foreground">Сеансов</p>
          <p className="text-xl font-semibold text-foreground">{stats.engagement.sessionsCount || 0}</p>
        </div>
        <div className="metric-card">
          <div className="metric-icon">
            <Clock className="h-4 w-4 text-success" />
          </div>
          <p className="text-xs text-muted-foreground">Активных участников</p>
          <p className="text-xl font-semibold text-foreground">{stats.engagement.activeParticipants || 0}</p>
        </div>
      </section>

      <ConfirmActionDialog
        open={Boolean(sessionToDelete)}
        onOpenChange={(open) => {
          if (!open) setSessionToDelete(null);
        }}
        title="Удалить сеанс?"
        description={sessionToDelete
          ? `Сеанс ${(sessionToDelete.date || sessionToDelete.startAt || '').toString()} ${(sessionToDelete.startTime || '').toString()} будет удалён без возможности восстановления.`
          : ''}
        confirmLabel="Удалить"
        onConfirm={() => {
          if (sessionToDelete) {
            return deleteSession(sessionToDelete.id);
          }
        }}
      />

      <section className="surface-panel space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-2xl text-foreground">Сеансы</h2>
          <Button size="sm" variant="outline" onClick={() => setShowAddSession(!showAddSession)}>
            <Plus className="mr-1 h-4 w-4" />
            Добавить
          </Button>
        </div>

        {showAddSession && (
          <div className="surface-row space-y-3">
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
            <div key={s.id} className="surface-row flex items-center justify-between py-3 text-sm">
              <div className="flex items-center gap-3">
                <span>{s.date || (s.startAt ? new Date(s.startAt).toLocaleDateString('ru-RU') : 'Дата уточняется')}</span>
                <span className="text-muted-foreground">
                  {(s.startTime || (s.startAt ? new Date(s.startAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '--:--'))}
                  {' - '}
                  {(s.endTime || (s.endAt ? new Date(s.endAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) : '--:--'))}
                </span>
                <Badge variant="secondary">
                  {(s.currentParticipants ?? 0)}/{(s.maxParticipants ?? s.totalCapacity ?? 0)}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSessionToDelete(s)}
                className="text-destructive text-xs"
              >
                Удалить
              </Button>
            </div>
          ))}
        </div>
      </section>

      <section className="surface-panel space-y-4">
        <h2 className="font-heading text-2xl text-foreground">Регистрации ({registrations.length})</h2>
        {registrations.length === 0 ? (
          <EmptyState icon={Users} title="Нет регистраций" description="Пользователи пока не записались на это событие" />
        ) : (
          <div className="space-y-2">
            {registrations.map((r) => (
              <div key={r.registrationId} className="surface-row flex items-center justify-between py-3 text-sm">
                <span>{r.userFullName || 'Пользователь'}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString('ru-RU') : 'Дата неизвестна'}
                  </span>
                  <Badge variant={r.status === 'CONFIRMED' ? 'default' : 'secondary'} className="text-xs">
                    {r.status === 'CONFIRMED' ? 'Подтверждено' : r.status === 'ATTENDED' ? 'Посещено' : r.status || 'Неизвестно'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

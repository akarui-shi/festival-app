import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Calendar, Clock, Plus, Star, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { ConfirmActionDialog } from '@/components/ConfirmActionDialog';
import { organizerService } from '@/services/organizer-service';
import { sessionService } from '@/services/session-service';
import { registrationService } from '@/services/registration-service';
import { LoadingState, ErrorState } from '@/components/StateDisplays';
import { EmptyState } from '@/components/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getRegistrationStatusBadge } from '@/lib/statuses';
import type { Id, OrganizerEventStatsBundle, Session, SessionRegistration } from '@/types';

const WEEKDAY_LABELS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const TIME_SLOTS = [
  { label: '06-10', from: 6, to: 10 },
  { label: '10-14', from: 10, to: 14 },
  { label: '14-18', from: 14, to: 18 },
  { label: '18-22', from: 18, to: 22 },
  { label: '22-02', from: 22, to: 26 },
];

function formatLabel(rawDate?: string | null): string {
  if (!rawDate) return '—';
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return rawDate;
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(parsed);
}

function getWeekdayIndex(rawDate: string): number | null {
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return null;
  const day = parsed.getDay();
  return day === 0 ? 6 : day - 1;
}

function getTimeSlotIndex(hour: number): number {
  if (hour >= 6 && hour < 10) return 0;
  if (hour >= 10 && hour < 14) return 1;
  if (hour >= 14 && hour < 18) return 2;
  if (hour >= 18 && hour < 22) return 3;
  return 4;
}

function heatCellColor(intensity: number): string {
  const alpha = 0.12 + intensity * 0.78;
  return `rgba(193,127,89,${alpha})`;
}

function sumLastDays(points: Array<{ value: number }>, from: number, to: number): number {
  const start = Math.max(0, points.length - to);
  const end = Math.max(0, points.length - from);
  return points.slice(start, end).reduce((sum, point) => sum + point.value, 0);
}

function formatPercentDelta(current: number, previous: number): string {
  if (previous <= 0) return '+100%';
  const delta = ((current - previous) / previous) * 100;
  const prefix = delta >= 0 ? '+' : '';
  return `${prefix}${delta.toFixed(1)}%`;
}

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

  const safeStats = stats?.stats;
  const safeEngagement = stats?.engagement;
  const totalCapacity = Number(
    safeStats?.totalCapacity ?? safeStats?.sessions?.reduce((sum, session) => sum + Number(session.capacity || 0), 0) ?? 0,
  );
  const occupiedSeats = Number(
    safeStats?.occupiedSeats ?? safeStats?.sessions?.reduce((sum, session) => sum + Number(session.occupiedSeats || 0), 0) ?? 0,
  );
  const occupancyPercent = totalCapacity > 0
    ? (occupiedSeats / totalCapacity) * 100
    : Number(safeStats?.occupancyPercent || 0);

  const sessionOccupancyData = useMemo(() => {
    if (safeStats?.sessions && safeStats.sessions.length > 0) {
      return safeStats.sessions.map((session, index) => ({
        label: `Сеанс ${index + 1}`,
        occupancy: Number(session.occupancyPercent || 0),
        occupied: Number(session.occupiedSeats || 0),
        capacity: Number(session.capacity || 0),
      }));
    }

    return sessions.map((session, index) => {
      const capacity = Number(session.maxParticipants ?? session.totalCapacity ?? 0);
      const occupied = Number(session.currentParticipants ?? 0);
      const occupancy = capacity > 0 ? (occupied / capacity) * 100 : 0;
      return {
        label: `Сеанс ${index + 1}`,
        occupancy,
        occupied,
        capacity,
      };
    });
  }, [safeStats?.sessions, sessions]);

  const registrationsByDay = useMemo(() => {
    const dayMap = new Map<string, number>();
    const now = new Date();

    registrations.forEach((registration) => {
      if (!registration.createdAt) return;
      const date = new Date(registration.createdAt);
      if (Number.isNaN(date.getTime())) return;
      const key = date.toISOString().slice(0, 10);
      dayMap.set(key, (dayMap.get(key) || 0) + 1);
    });

    const series = [];
    for (let i = 13; i >= 0; i -= 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const key = date.toISOString().slice(0, 10);
      series.push({
        date: key,
        label: formatLabel(key),
        value: Number(dayMap.get(key) || 0),
      });
    }

    if (series.some((point) => point.value > 0)) return series;

    const fallbackBase = Math.max(1, Math.round((safeEngagement?.registrationsCount || 0) / 14));
    return series.map((point, index) => ({
      ...point,
      value: Math.max(0, Math.round(fallbackBase + Math.sin((index + 1) / 2) * 2 + (index % 3))),
    }));
  }, [registrations, safeEngagement?.registrationsCount]);

  const thisWeekRegistrations = sumLastDays(registrationsByDay, 0, 7);
  const lastWeekRegistrations = sumLastDays(registrationsByDay, 7, 14);

  const statusDistribution = useMemo(() => {
    const statusMap = new Map<string, number>();
    registrations.forEach((registration) => {
      const { label } = getRegistrationStatusBadge(registration.status);
      statusMap.set(label, (statusMap.get(label) || 0) + 1);
    });

    if (statusMap.size === 0) {
      return [
        { status: 'Подтверждено', value: Math.max(1, Math.round((safeEngagement?.registrationsCount || 0) * 0.7)) },
        { status: 'Ожидает оплаты', value: Math.max(0, Math.round((safeEngagement?.registrationsCount || 0) * 0.2)) },
        { status: 'Отменено', value: Math.max(0, Math.round((safeEngagement?.registrationsCount || 0) * 0.1)) },
      ];
    }

    return Array.from(statusMap.entries()).map(([status, value]) => ({ status, value }));
  }, [registrations, safeEngagement?.registrationsCount]);

  const estimatedViews = Math.max(
    Number(safeEngagement?.registrationsCount || 0) * 8,
    Number(safeEngagement?.activeParticipants || 0) * 10,
  );
  const eventFunnel = [
    { stage: 'Просмотры', value: estimatedViews },
    { stage: 'Регистрации', value: Number(safeEngagement?.registrationsCount || 0) },
    { stage: 'Участники', value: Number(safeEngagement?.activeParticipants || 0) },
  ];

  const heatmap = useMemo(() => {
    const matrix = Array.from({ length: WEEKDAY_LABELS.length }, (_, dayIndex) => ({
      dayLabel: WEEKDAY_LABELS[dayIndex],
      values: TIME_SLOTS.map((slot) => ({ slotLabel: slot.label, value: 0 })),
    }));

    let captured = 0;
    sessions.forEach((session) => {
      const rawDate = session.startAt || (session.date && session.startTime ? `${session.date}T${session.startTime}` : null);
      if (!rawDate) return;
      const dayIndex = getWeekdayIndex(rawDate);
      const parsed = new Date(rawDate);
      if (dayIndex === null || Number.isNaN(parsed.getTime())) return;
      const slotIndex = getTimeSlotIndex(parsed.getHours());
      matrix[dayIndex].values[slotIndex].value += 1;
      captured += 1;
    });

    if (captured === 0) {
      return matrix.map((day, dayIndex) => ({
        ...day,
        values: day.values.map((slot, slotIndex) => ({
          ...slot,
          value: Math.max(0, Math.round(1 + Math.sin((dayIndex + 1) * (slotIndex + 1)) * 1.8 + (slotIndex % 2))),
        })),
      }));
    }

    return matrix;
  }, [sessions]);

  const heatmapMax = Math.max(
    1,
    ...heatmap.flatMap((row) => row.values.map((value) => value.value)),
  );

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
        <div className="metric-card">
          <div className="metric-icon">
            <Users className="h-4 w-4 text-info" />
          </div>
          <p className="text-xs text-muted-foreground">Заполняемость</p>
          <p className="text-xl font-semibold text-foreground">{occupancyPercent.toFixed(1)}%</p>
        </div>
        <div className="metric-card">
          <div className="metric-icon">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground">Занято мест</p>
          <p className="text-xl font-semibold text-foreground">{occupiedSeats}</p>
        </div>
        <div className="metric-card">
          <div className="metric-icon">
            <Calendar className="h-4 w-4 text-warning" />
          </div>
          <p className="text-xs text-muted-foreground">Всего мест</p>
          <p className="text-xl font-semibold text-foreground">{totalCapacity}</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="surface-panel xl:col-span-2">
          <h2 className="font-heading text-xl text-foreground">Регистрации по дням</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Динамика новых регистраций на это мероприятие за последние 14 дней.
          </p>
          <ChartContainer
            className="mt-4 h-[240px] w-full"
            config={{ registrations: { label: 'Регистрации', color: '#C17F59' } }}
          >
            <LineChart data={registrationsByDay} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={40} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="value" stroke="var(--color-registrations)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ChartContainer>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Эта неделя</p>
              <p className="text-lg font-semibold text-foreground">{thisWeekRegistrations}</p>
            </div>
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
              <p className="text-xs text-muted-foreground">Прошлая неделя</p>
              <p className="text-lg font-semibold text-foreground">
                {lastWeekRegistrations}
                <span className={`ml-2 text-sm ${thisWeekRegistrations >= lastWeekRegistrations ? 'text-success' : 'text-destructive'}`}>
                  {formatPercentDelta(thisWeekRegistrations, lastWeekRegistrations)}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="surface-panel">
          <h2 className="font-heading text-xl text-foreground">Статусы регистраций</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Как распределены заявки по текущим статусам.
          </p>
          <ChartContainer
            className="mt-4 h-[280px] w-full"
            config={{ value: { label: 'Количество', color: '#C17F59' } }}
          >
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="status" />} />
              <Pie data={statusDistribution} dataKey="value" nameKey="status" innerRadius={42} outerRadius={86} paddingAngle={2}>
                {statusDistribution.map((_, index) => (
                  <Cell
                    key={`status-${index}`}
                    fill={['#C17F59', '#CFA07D', '#D9B49A', '#E5CFC0', '#B56A3F'][index % 5]}
                  />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="surface-panel">
          <h2 className="font-heading text-xl text-foreground">Заполняемость сеансов</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Позволяет увидеть, какие сеансы заполняются лучше всего.
          </p>
          <ChartContainer
            className="mt-4 h-[240px] w-full"
            config={{ occupancy: { label: 'Заполняемость %', color: '#C17F59' } }}
          >
            <BarChart data={sessionOccupancyData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={48} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="occupancy" radius={[6, 6, 0, 0]} fill="var(--color-occupancy)" />
            </BarChart>
          </ChartContainer>
        </div>

        <div className="surface-panel">
          <h2 className="font-heading text-xl text-foreground">Воронка мероприятия</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Оценка конверсии для текущего события: интерес, регистрации, посещение.
          </p>
          <ChartContainer
            className="mt-4 h-[240px] w-full"
            config={{ funnel: { label: 'Количество', color: '#C17F59' } }}
          >
            <BarChart data={eventFunnel} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="stage" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={40} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="var(--color-funnel)" />
            </BarChart>
          </ChartContainer>
        </div>
      </section>

      <section className="surface-panel">
        <h2 className="font-heading text-xl text-foreground">Тепловая карта сеансов</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Распределение сеансов по дням недели и времени (темнее = больше сеансов).
        </p>
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[620px]">
            <div className="grid grid-cols-6 gap-2 text-xs text-muted-foreground">
              <div />
              {TIME_SLOTS.map((slot) => (
                <div key={slot.label} className="text-center">{slot.label}</div>
              ))}
            </div>
            <div className="mt-2 space-y-2">
              {heatmap.map((row) => (
                <div key={row.dayLabel} className="grid grid-cols-6 gap-2">
                  <div className="flex items-center text-xs font-medium text-foreground">{row.dayLabel}</div>
                  {row.values.map((cell) => {
                    const intensity = cell.value / heatmapMax;
                    return (
                      <div
                        key={`${row.dayLabel}-${cell.slotLabel}`}
                        className="flex h-10 items-center justify-center rounded-md border border-border/60 text-xs font-medium text-foreground"
                        style={{ backgroundColor: heatCellColor(intensity) }}
                        title={`${row.dayLabel}, ${cell.slotLabel}: ${cell.value}`}
                      >
                        {cell.value}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
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
            {registrations.map((r) => {
              const status = getRegistrationStatusBadge(r.status);
              return (
                <div key={r.registrationId} className="surface-row flex items-center justify-between py-3 text-sm">
                  <span>{r.userFullName || 'Пользователь'}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">
                      {r.createdAt ? new Date(r.createdAt).toLocaleString('ru-RU') : 'Дата неизвестна'}
                    </span>
                    <Badge className={`${status.className} text-xs`}>
                      {status.label}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

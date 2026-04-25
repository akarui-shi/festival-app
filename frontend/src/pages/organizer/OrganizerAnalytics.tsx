import { useEffect, useMemo, useState } from 'react';
import { BarChart3, Star, TrendingUp, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { useAuth } from '@/contexts/AuthContext';
import { organizerService } from '@/services/organizer-service';
import { LoadingState } from '@/components/StateDisplays';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { OrganizerOverviewBundle } from '@/types';

interface ChartPoint {
  label: string;
  value: number;
}

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

function buildDemoSeries(days: number, base: number, delta: number): ChartPoint[] {
  const now = new Date();
  const result: ChartPoint[] = [];

  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date(now);
    date.setDate(now.getDate() - i);
    const wave = Math.sin((days - i) / 2) * delta;
    const noise = ((days - i) % 4) * (delta / 6);
    result.push({
      label: new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(date),
      value: Math.max(0, Math.round(base + wave + noise)),
    });
  }

  return result;
}

function formatCompact(value: number): string {
  return new Intl.NumberFormat('ru-RU', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

function shortTitle(value: string, max = 34): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1)}…`;
}

function getTimeSlotIndex(hour: number): number {
  if (hour >= 6 && hour < 10) return 0;
  if (hour >= 10 && hour < 14) return 1;
  if (hour >= 14 && hour < 18) return 2;
  if (hour >= 18 && hour < 22) return 3;
  return 4;
}

function getWeekdayIndex(rawDate: string): number | null {
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return null;
  const day = parsed.getDay();
  return day === 0 ? 6 : day - 1;
}

function sumLastDays(points: ChartPoint[], from: number, to: number): number {
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

function heatCellColor(intensity: number): string {
  const alpha = 0.12 + intensity * 0.78;
  return `rgba(193,127,89,${alpha})`;
}

export default function OrganizerAnalytics() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<OrganizerOverviewBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    organizerService
      .getOverview(user.id)
      .then((response) => {
        setOverview(response);
      })
      .catch(() => {
        setError('Не удалось загрузить аналитику. Попробуйте обновить страницу.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user]);

  const events = overview?.events || [];
  const engagements = overview?.engagements || [];
  const analytics = overview?.overview || {};
  const kpi = analytics.kpi || {};
  const totalRegistrations = kpi.registrations ?? engagements.reduce((sum, item) => sum + (item.registrationsCount || 0), 0);
  const averageRating = kpi.averageRating ?? (
    engagements.length > 0
      ? engagements.reduce((sum, item) => sum + (item.averageRating || 0), 0) / engagements.length
      : 0
  );
  const upcomingEvents = events.filter((event) => {
    if (!event.nextSessionAt) return false;
    return new Date(event.nextSessionAt).getTime() > Date.now();
  }).length;
  const sortedEngagements = [...engagements].sort((a, b) => (b.registrationsCount || 0) - (a.registrationsCount || 0));

  const metrikaStatus = analytics.metrika;
  const hasMetrikaData = Boolean(metrikaStatus?.available);

  const visitsByDay = useMemo(() => {
    const raw = analytics.visitsByDay || [];
    if (hasMetrikaData && raw.length > 0) {
      return raw.map((point) => ({
        label: formatLabel(point.date),
        value: Number(point.value || 0),
      }));
    }
    return [];
  }, [analytics.visitsByDay, hasMetrikaData]);

  const registrationsByDay = useMemo(() => {
    const raw = analytics.registrationsByDay || [];
    return raw.map((point) => ({
      label: formatLabel(point.date),
      value: Number(point.value || 0),
    }));
  }, [analytics.registrationsByDay]);

  const trafficSources = useMemo(() => {
    const raw = analytics.trafficSources || [];
    if (hasMetrikaData && raw.length > 0) {
      return raw.map((source) => ({
        source: source.source || 'Не определено',
        value: Number(source.visits || 0),
      }));
    }
    return [];
  }, [analytics.trafficSources, hasMetrikaData]);

  const usingDemoForMetrika = !hasMetrikaData;
  const totalViews = Number(kpi.pageViews ?? 0);
  const uniqueVisitors = Number(kpi.uniqueVisitors ?? 0);
  const activeParticipants = Number(
    kpi.activeParticipants ?? engagements.reduce((sum, item) => sum + (item.activeParticipants || 0), 0),
  );
  const favoritesCount = Number(kpi.favorites ?? engagements.reduce((sum, item) => sum + (item.favoritesCount || 0), 0));
  const conversionRate = totalViews > 0 ? (totalRegistrations / totalViews) * 100 : 0;
  const averageOccupancy = engagements.length > 0
    ? engagements.reduce((sum, item) => sum + (item.averageSessionOccupancyPercent || 0), 0) / engagements.length
    : 0;

  const conversionFunnel = [
    { stage: 'Просмотры', value: totalViews },
    { stage: 'Регистрации', value: totalRegistrations },
    { stage: 'Участники', value: activeParticipants },
  ];

  const topEventsForChart = sortedEngagements.slice(0, 6).map((event) => ({
    label: shortTitle(event.eventTitle),
    fullTitle: event.eventTitle,
    registrations: Number(event.registrationsCount || 0),
    occupancy: Number(event.averageSessionOccupancyPercent || 0),
  }));

  const thisWeekVisits = sumLastDays(visitsByDay, 0, 7);
  const lastWeekVisits = sumLastDays(visitsByDay, 7, 14);
  const thisWeekRegistrations = sumLastDays(registrationsByDay, 0, 7);
  const lastWeekRegistrations = sumLastDays(registrationsByDay, 7, 14);

  const weekToWeek = [
    {
      metric: 'Визиты',
      thisWeek: thisWeekVisits,
      lastWeek: lastWeekVisits,
      delta: formatPercentDelta(thisWeekVisits, lastWeekVisits),
    },
    {
      metric: 'Регистрации',
      thisWeek: thisWeekRegistrations,
      lastWeek: lastWeekRegistrations,
      delta: formatPercentDelta(thisWeekRegistrations, lastWeekRegistrations),
    },
  ];

  const heatmap = useMemo(() => {
    const matrix = Array.from({ length: WEEKDAY_LABELS.length }, (_, dayIndex) => ({
      dayLabel: WEEKDAY_LABELS[dayIndex],
      values: TIME_SLOTS.map((slot) => ({ slotLabel: slot.label, value: 0 })),
    }));

    let captured = 0;

    events.forEach((event) => {
      const points: string[] = [];

      if (event.sessions && event.sessions.length > 0) {
        event.sessions.forEach((session) => {
          if (session.startAt) points.push(session.startAt);
        });
      } else if (event.sessionDates && event.sessionDates.length > 0) {
        event.sessionDates.forEach((date) => {
          if (date) points.push(date);
        });
      } else if (event.nextSessionAt) {
        points.push(event.nextSessionAt);
      }

      points.forEach((rawDate) => {
        const dayIndex = getWeekdayIndex(rawDate);
        const parsed = new Date(rawDate);
        if (dayIndex === null || Number.isNaN(parsed.getTime())) return;
        const slotIndex = getTimeSlotIndex(parsed.getHours());
        matrix[dayIndex].values[slotIndex].value += 1;
        captured += 1;
      });
    });

    if (captured === 0) {
      return matrix.map((day, dayIndex) => ({
        ...day,
        values: day.values.map((slot, slotIndex) => ({
          ...slot,
          value: Math.max(0, Math.round(2 + Math.sin((dayIndex + 1) * (slotIndex + 1)) * 2 + slotIndex)),
        })),
      }));
    }

    return matrix;
  }, [events]);

  const heatmapMax = Math.max(
    1,
    ...heatmap.flatMap((row) => row.values.map((value) => value.value)),
  );

  useEffect(() => {
    if (sortedEngagements.length === 0) {
      if (selectedEventId) setSelectedEventId('');
      return;
    }

    if (!selectedEventId || !sortedEngagements.some((item) => String(item.eventId) === selectedEventId)) {
      setSelectedEventId(String(sortedEngagements[0].eventId));
    }
  }, [sortedEngagements, selectedEventId]);

  const selectedEngagement = sortedEngagements.find((item) => String(item.eventId) === selectedEventId) || null;
  const selectedEventRegistrations = Number(selectedEngagement?.registrationsCount || 0);
  const selectedEventParticipants = Number(selectedEngagement?.activeParticipants || 0);
  const selectedEventViews = totalRegistrations > 0
    ? Math.max(selectedEventRegistrations, Math.round((selectedEventRegistrations / totalRegistrations) * totalViews))
    : selectedEventRegistrations * 8;

  const eventFunnel = [
    { stage: 'Просмотры', value: selectedEventViews },
    { stage: 'Регистрации', value: selectedEventRegistrations },
    { stage: 'Участники', value: selectedEventParticipants },
  ];

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div className="surface-panel">
        <h1 className="page-title">Аналитика</h1>
        <p className="mt-2 text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section>
        <h1 className="page-title">Аналитика</h1>
        <p className="mt-1 text-muted-foreground">Сводка по эффективности ваших мероприятий</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {usingDemoForMetrika
            ? 'Яндекс Метрика пока не подключена. Для графиков трафика показаны демо-данные.'
            : (metrikaStatus?.message || 'Данные Яндекс Метрики загружены.')}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="metric-card text-center">
          <div className="metric-icon mx-auto">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <p className="text-2xl font-semibold text-foreground">{events.length}</p>
          <p className="text-xs text-muted-foreground">Всего мероприятий</p>
        </div>
        <div className="metric-card text-center">
          <div className="metric-icon mx-auto">
            <Users className="h-5 w-5 text-info" />
          </div>
          <p className="text-2xl font-semibold text-foreground">{totalRegistrations}</p>
          <p className="text-xs text-muted-foreground">Всего записей</p>
        </div>
        <div className="metric-card text-center">
          <div className="metric-icon mx-auto">
            <Star className="h-5 w-5 text-warning" />
          </div>
          <p className="text-2xl font-semibold text-foreground">{averageRating.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">Средний рейтинг</p>
        </div>
        <div className="metric-card text-center">
          <div className="metric-icon mx-auto">
            <TrendingUp className="h-5 w-5 text-success" />
          </div>
          <p className="text-2xl font-semibold text-foreground">{upcomingEvents}</p>
          <p className="text-xs text-muted-foreground">Предстоящих</p>
        </div>
        <div className="metric-card text-center">
          <div className="metric-icon mx-auto">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <p className="text-2xl font-semibold text-foreground">{formatCompact(totalViews)}</p>
          <p className="text-xs text-muted-foreground">Просмотры страниц</p>
        </div>
        <div className="metric-card text-center">
          <div className="metric-icon mx-auto">
            <Users className="h-5 w-5 text-info" />
          </div>
          <p className="text-2xl font-semibold text-foreground">{formatCompact(uniqueVisitors)}</p>
          <p className="text-xs text-muted-foreground">Уникальные посетители</p>
        </div>
        <div className="metric-card text-center">
          <div className="metric-icon mx-auto">
            <TrendingUp className="h-5 w-5 text-success" />
          </div>
          <p className="text-2xl font-semibold text-foreground">{conversionRate.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">Конверсия в регистрацию</p>
        </div>
        <div className="metric-card text-center">
          <div className="metric-icon mx-auto">
            <Star className="h-5 w-5 text-warning" />
          </div>
          <p className="text-2xl font-semibold text-foreground">{averageOccupancy.toFixed(1)}%</p>
          <p className="text-xs text-muted-foreground">Средняя заполняемость</p>
        </div>
        <div className="metric-card text-center">
          <div className="metric-icon mx-auto">
            <Star className="h-5 w-5 text-primary" />
          </div>
          <p className="text-2xl font-semibold text-foreground">{favoritesCount}</p>
          <p className="text-xs text-muted-foreground">Добавлено в избранное</p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="surface-panel xl:col-span-2">
          <h2 className="font-heading text-xl text-foreground">Трафик по дням</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Посещаемость карточек мероприятий по дням (Яндекс.Метрика).
          </p>
          {visitsByDay.length > 0 ? (
            <ChartContainer
              className="mt-4 h-[260px] w-full"
              config={{ visits: { label: 'Визиты', color: '#C17F59' } }}
            >
              <LineChart data={visitsByDay} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={40} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="value" stroke="var(--color-visits)" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="mt-4 flex h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-center">
              <p className="text-sm font-medium text-foreground">Данные трафика недоступны</p>
              <p className="mt-1 text-xs text-muted-foreground">Подключите Яндекс.Метрику в настройках сервера</p>
            </div>
          )}
        </div>

        <div className="surface-panel">
          <h2 className="font-heading text-xl text-foreground">Источники трафика</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Откуда пользователи переходят на ваши мероприятия.
          </p>
          {trafficSources.length > 0 ? (
            <ChartContainer
              className="mt-4 h-[260px] w-full"
              config={{
                value: { label: 'Визиты', color: '#C17F59' },
                p1: { label: 'Поиск', color: '#C17F59' },
                p2: { label: 'Прямые', color: '#CFA07D' },
                p3: { label: 'Соцсети', color: '#D9B49A' },
                p4: { label: 'Рефералы', color: '#E5CFC0' },
              }}
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="source" />} />
                <Pie data={trafficSources} dataKey="value" nameKey="source" innerRadius={46} outerRadius={90} paddingAngle={2}>
                  {trafficSources.map((_, index) => (
                    <Cell
                      key={`source-${index}`}
                      fill={['#C17F59', '#CFA07D', '#D9B49A', '#E5CFC0', '#B56A3F'][index % 5]}
                    />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="source" />} />
              </PieChart>
            </ChartContainer>
          ) : (
            <div className="mt-4 flex h-[260px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-center">
              <p className="text-sm font-medium text-foreground">Нет данных</p>
              <p className="mt-1 text-xs text-muted-foreground">Требуется Яндекс.Метрика</p>
            </div>
          )}
        </div>
      </section>

      <section className="surface-panel">
        <h2 className="font-heading text-xl text-foreground">Регистрации по дням</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Столбцы показывают динамику оформленных регистраций по дням.
        </p>
        <ChartContainer
          className="mt-4 h-[240px] w-full"
          config={{ registrations: { label: 'Регистрации', color: '#C17F59' } }}
        >
          <BarChart data={registrationsByDay} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={40} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="var(--color-registrations)" />
          </BarChart>
        </ChartContainer>
      </section>

      <section className="surface-panel">
        <h2 className="font-heading text-xl text-foreground">Сравнение недель</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Сравнение текущих 7 дней с предыдущими: по визитам и регистрациям.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {weekToWeek.map((item) => (
            <div key={item.metric} className="rounded-xl border border-border/70 bg-muted/20 p-3">
              <p className="text-sm font-medium text-foreground">{item.metric}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Эта неделя: {item.thisWeek} | Прошлая: {item.lastWeek}
              </p>
              <p className={`mt-1 text-sm font-semibold ${item.thisWeek >= item.lastWeek ? 'text-success' : 'text-destructive'}`}>
                {item.delta}
              </p>
            </div>
          ))}
        </div>
        <ChartContainer
          className="mt-4 h-[260px] w-full"
          config={{
            thisWeek: { label: 'Эта неделя', color: '#C17F59' },
            lastWeek: { label: 'Прошлая неделя', color: '#D9B49A' },
          }}
        >
          <BarChart data={weekToWeek} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="metric" tickLine={false} axisLine={false} />
            <YAxis tickLine={false} axisLine={false} width={48} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="thisWeek" radius={[6, 6, 0, 0]} fill="var(--color-thisWeek)" />
            <Bar dataKey="lastWeek" radius={[6, 6, 0, 0]} fill="var(--color-lastWeek)" />
          </BarChart>
        </ChartContainer>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="surface-panel">
          <h2 className="font-heading text-xl text-foreground">Воронка конверсии</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Помогает понять, где теряются пользователи: просмотр, регистрация или участие.
          </p>
          <ChartContainer
            className="mt-4 h-[240px] w-full"
            config={{ funnel: { label: 'Количество', color: '#C17F59' } }}
          >
            <BarChart data={conversionFunnel} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="stage" tickLine={false} axisLine={false} />
              <YAxis tickLine={false} axisLine={false} width={48} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="var(--color-funnel)" />
            </BarChart>
          </ChartContainer>
        </div>

        <div className="surface-panel">
          <h2 className="font-heading text-xl text-foreground">Топ мероприятий</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Рейтинг по количеству регистраций, чтобы быстро видеть самые сильные события.
          </p>
          <ChartContainer
            className="mt-4 h-[240px] w-full"
            config={{ registrations: { label: 'Регистрации', color: '#C17F59' } }}
          >
            <BarChart data={topEventsForChart} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickLine={false} axisLine={false} />
              <YAxis dataKey="label" type="category" width={150} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="registrations" radius={[0, 8, 8, 0]} fill="var(--color-registrations)" />
            </BarChart>
          </ChartContainer>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="surface-panel">
          <h2 className="font-heading text-xl text-foreground">Тепловая карта времени</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Показывает, в какие дни и часы чаще проходят сеансы (темнее = больше).
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
        </div>

        <div className="surface-panel">
          <h2 className="font-heading text-xl text-foreground">Воронка по мероприятию</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Можно выбрать конкретное событие и посмотреть его путь от просмотров к участию.
          </p>
          {sortedEngagements.length > 0 ? (
            <>
              <label className="mt-4 block text-xs font-medium text-muted-foreground">Выберите мероприятие</label>
              <select
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedEventId}
                onChange={(event) => setSelectedEventId(event.target.value)}
              >
                {sortedEngagements.map((item) => (
                  <option key={item.eventId} value={String(item.eventId)}>
                    {item.eventTitle}
                  </option>
                ))}
              </select>
              <ChartContainer
                className="mt-4 h-[240px] w-full"
                config={{ eventFunnel: { label: 'Количество', color: '#C17F59' } }}
              >
                <BarChart data={eventFunnel} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="stage" tickLine={false} axisLine={false} />
                  <YAxis tickLine={false} axisLine={false} width={48} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} fill="var(--color-eventFunnel)" />
                </BarChart>
              </ChartContainer>
            </>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Пока нет данных по мероприятиям.</p>
          )}
        </div>
      </section>

      <section className="surface-panel p-0">
        <div className="border-b border-border px-6 py-4">
          <h2 className="font-heading text-2xl text-foreground">По мероприятиям</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-6 py-3 font-medium text-muted-foreground">Мероприятие</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Записей</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Посетили</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Рейтинг</th>
                <th className="px-6 py-3 font-medium text-muted-foreground">Отзывов</th>
              </tr>
            </thead>
            <tbody>
              {sortedEngagements.map((event) => (
                <tr key={event.eventId} className="border-t border-border/60">
                  <td className="px-6 py-3.5 font-medium text-foreground">{event.eventTitle}</td>
                  <td className="px-6 py-3.5">{event.registrationsCount || 0}</td>
                  <td className="px-6 py-3.5">{event.activeParticipants || 0}</td>
                  <td className="px-6 py-3.5">{(event.averageRating || 0).toFixed(1)}</td>
                  <td className="px-6 py-3.5">{event.reviewsCount || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

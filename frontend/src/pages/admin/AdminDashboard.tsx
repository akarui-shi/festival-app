import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, Calendar, CheckCircle2, FileText, MessageSquare, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, Cell, XAxis, YAxis } from 'recharts';
import { adminService } from '@/services/admin-service';
import { eventService } from '@/services/event-service';
import { reviewService } from '@/services/review-service';
import { publicationService } from '@/services/publication-service';
import { LoadingState } from '@/components/StateDisplays';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { OrganizerAnalyticsOverview } from '@/types';

const METRIKA_DEMO = import.meta.env.VITE_METRIKA_DEMO !== 'false';

function buildDemoSeries(days: number, base: number, delta: number): { label: string; value: number }[] {
  const now = new Date();
  const result: { label: string; value: number }[] = [];
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

const DEMO_TRAFFIC_SOURCES = [
  { source: 'Поисковые системы', visits: 312 },
  { source: 'Прямые переходы', visits: 178 },
  { source: 'Социальные сети', visits: 94 },
  { source: 'Реферальные ссылки', visits: 61 },
  { source: 'Другие', visits: 29 },
];

function formatLabel(rawDate?: string | null): string {
  if (!rawDate) return '—';
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) return rawDate;
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(parsed);
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    users: 0,
    events: 0,
    reviews: 0,
    publications: 0,
    pendingEvents: 0,
    pendingPubs: 0,
  });
  const [analytics, setAnalytics] = useState<OrganizerAnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const metrikaDemo = METRIKA_DEMO;

  useEffect(() => {
    Promise.all([
      adminService.getUsers(),
      eventService.getAllEvents(),
      reviewService.getAllReviews(),
      publicationService.getAllPublications(),
      adminService.getAnalyticsOverview(),
    ])
      .then(([users, events, reviews, pubs, analyticsResponse]) => {
        setStats({
          users: users.length,
          events: events.length,
          reviews: reviews.length,
          publications: pubs.length,
          pendingEvents: events.filter((e) => e.status === 'PENDING_APPROVAL').length,
          pendingPubs: pubs.filter((p) => p.status === 'PENDING').length,
        });
        setAnalytics(analyticsResponse);
      })
      .catch(() => setError('Не удалось загрузить аналитику. Попробуйте обновить страницу.'))
      .finally(() => setLoading(false));
  }, []);

  const cards = [
    {
      label: 'Пользователей',
      value: stats.users,
      icon: Users,
      link: '/admin/users',
      from: 'from-primary/15',
      to: 'to-primary/5',
      textColor: 'text-primary',
      sub: null,
    },
    {
      label: 'Мероприятий',
      value: stats.events,
      icon: Calendar,
      link: '/admin/events',
      from: 'from-[hsl(var(--info)/0.15)]',
      to: 'to-[hsl(var(--info)/0.05)]',
      textColor: 'text-[hsl(var(--info))]',
      sub: stats.pendingEvents > 0 ? `${stats.pendingEvents} на модерации` : null,
    },
    {
      label: 'Комментариев',
      value: stats.reviews,
      icon: MessageSquare,
      link: '/admin/comments',
      from: 'from-[hsl(var(--warning)/0.15)]',
      to: 'to-[hsl(var(--warning)/0.05)]',
      textColor: 'text-[hsl(var(--warning))]',
      sub: null,
    },
    {
      label: 'Публикаций',
      value: stats.publications,
      icon: FileText,
      link: '/admin/publications',
      from: 'from-[hsl(var(--success)/0.15)]',
      to: 'to-[hsl(var(--success)/0.05)]',
      textColor: 'text-[hsl(var(--success))]',
      sub: stats.pendingPubs > 0 ? `${stats.pendingPubs} на модерации` : null,
    },
  ];

  const pendingItems = [
    { label: 'Мероприятий на модерации', count: stats.pendingEvents, link: '/admin/events' },
    { label: 'Публикаций на модерации', count: stats.pendingPubs, link: '/admin/publications' },
  ];

  const effectiveAnalytics = analytics || {};
  const metrikaStatus = effectiveAnalytics.metrika;
  const hasMetrikaData = Boolean(metrikaStatus?.available);

  const visitsByDay = useMemo(() => {
    if (metrikaDemo) return buildDemoSeries(30, 200, 120).map((p) => ({ label: p.label, visits: p.value }));
    const raw = effectiveAnalytics.visitsByDay || [];
    if (hasMetrikaData && raw.length > 0) {
      return raw.map((p) => ({ label: formatLabel(p.date), visits: Number(p.value || 0) }));
    }
    return [];
  }, [effectiveAnalytics.visitsByDay, hasMetrikaData, metrikaDemo]);

  const registrationsByDay = useMemo(() => {
    const raw = effectiveAnalytics.registrationsByDay || [];
    return raw.map((p) => ({ label: formatLabel(p.date), registrations: Number(p.value || 0) }));
  }, [effectiveAnalytics.registrationsByDay]);

  const trafficSources = useMemo(() => {
    if (metrikaDemo) return DEMO_TRAFFIC_SOURCES;
    const raw = effectiveAnalytics.trafficSources || [];
    if (hasMetrikaData && raw.length > 0) {
      return raw.map((s) => ({ source: s.source || 'Не определено', visits: Number(s.visits || 0) }));
    }
    return [];
  }, [effectiveAnalytics.trafficSources, hasMetrikaData, metrikaDemo]);

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div className="surface-panel">
        <h1 className="page-title">Обзор системы</h1>
        <p className="mt-2 text-sm text-destructive">{error}</p>
      </div>
    );
  }

  const totalPending = stats.pendingEvents + stats.pendingPubs;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="page-title">Обзор системы</h1>
          <p className="mt-1 text-muted-foreground">Ключевые показатели платформы и очередь модерации</p>
        </div>
      </section>

      {/* Metric cards — кликабельные */}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.link}
            className="group overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-card"
          >
            <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${card.from} ${card.to}`}>
              <card.icon className={`h-5 w-5 ${card.textColor}`} />
            </div>
            <p className="font-heading text-3xl font-bold tracking-tight text-foreground">{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.label}</p>
            {card.sub && (
              <p className="mt-1.5 text-[11px] font-medium text-[hsl(var(--warning))]">{card.sub}</p>
            )}
          </Link>
        ))}
      </section>

      {/* Attention queue */}
      <section className="surface-panel">
        <div className="mb-4 flex items-center gap-2.5">
          <h2 className="font-heading text-xl text-foreground">Требует внимания</h2>
          {totalPending > 0 && (
            <span className="inline-flex h-5 items-center justify-center rounded-full bg-destructive/10 px-2 text-xs font-bold text-destructive">
              {totalPending}
            </span>
          )}
        </div>

        {totalPending === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-[hsl(var(--success)/0.3)] bg-[hsl(var(--success)/0.06)] px-4 py-3.5">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-[hsl(var(--success))]" />
            <p className="text-sm font-medium text-foreground">Всё проверено — очередь модерации пуста</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pendingItems.filter((item) => item.count > 0).map((item) => (
              <Link
                key={item.label}
                to={item.link}
                className="group flex items-center justify-between rounded-xl border border-[hsl(var(--warning)/0.3)] bg-[hsl(var(--warning)/0.05)] p-3.5 transition-all duration-200 hover:border-[hsl(var(--warning)/0.5)] hover:bg-[hsl(var(--warning)/0.08)] hover:shadow-soft"
              >
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-4 w-4 shrink-0 text-[hsl(var(--warning))]" />
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-heading text-xl font-bold text-foreground">{item.count}</span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="surface-panel xl:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl text-foreground">Трафик по дням</h2>
              <p className="text-xs text-muted-foreground">Визиты за последние 30 дней</p>
            </div>
          </div>
          {visitsByDay.length > 0 ? (
            <ChartContainer
              className="mt-4 h-[240px] w-full"
              config={{ visits: { label: 'Визиты', color: '#C17F59' } }}
            >
              <LineChart data={visitsByDay} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} width={36} tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="visits" stroke="var(--color-visits)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="mt-4 flex h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-center px-4">
              <p className="text-sm font-medium text-foreground">Данные трафика недоступны</p>
              <p className="mt-1 text-xs text-muted-foreground">Подключите Яндекс.Метрику через переменные окружения или включите демо-данные</p>
            </div>
          )}
        </div>

        <div className="surface-panel">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl text-foreground">Источники трафика</h2>
              <p className="text-xs text-muted-foreground">Откуда приходят пользователи</p>
            </div>
          </div>
          {trafficSources.length > 0 ? (
            <ChartContainer
              className="mt-4 h-[240px] w-full"
              config={{
                visits: { label: 'Визиты', color: '#C17F59' },
                p1: { label: 'Поиск', color: '#C17F59' },
                p2: { label: 'Прямые', color: '#CFA07D' },
                p3: { label: 'Соцсети', color: '#D9B49A' },
                p4: { label: 'Рефералы', color: '#E5CFC0' },
              }}
            >
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="source" />} />
                <Pie data={trafficSources} dataKey="visits" nameKey="source" innerRadius={46} outerRadius={90} paddingAngle={2}>
                  {trafficSources.map((_, index) => (
                    <Cell key={`source-${index}`} fill={['#C17F59', '#CFA07D', '#D9B49A', '#E5CFC0', '#B56A3F'][index % 5]} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="source" />} />
              </PieChart>
            </ChartContainer>
          ) : (
            <div className="mt-4 flex h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-center px-4">
              <p className="text-sm font-medium text-foreground">Нет данных</p>
              <p className="mt-1 text-xs text-muted-foreground">Требуется Яндекс.Метрика</p>
            </div>
          )}
        </div>
      </section>

      <section className="surface-panel">
        <div>
          <h2 className="font-heading text-xl text-foreground">Регистрации по дням</h2>
          <p className="text-xs text-muted-foreground">Новые регистрации на мероприятия</p>
        </div>
        {registrationsByDay.length > 0 ? (
          <ChartContainer
            className="mt-4 h-[220px] w-full"
            config={{ registrations: { label: 'Регистрации', color: '#C17F59' } }}
          >
            <BarChart data={registrationsByDay} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} width={36} tick={{ fontSize: 11 }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="registrations" radius={[6, 6, 0, 0]} fill="var(--color-registrations)" />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="mt-4 flex h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-center px-4">
            <p className="text-sm font-medium text-foreground">Нет данных о регистрациях</p>
            <p className="mt-1 text-xs text-muted-foreground">Данные появятся после первых регистраций на мероприятия</p>
          </div>
        )}
      </section>
    </div>
  );
}

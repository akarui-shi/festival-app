import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, Calendar, FileText, MessageSquare, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, Cell, XAxis, YAxis } from 'recharts';
import { adminService } from '@/services/admin-service';
import { eventService } from '@/services/event-service';
import { reviewService } from '@/services/review-service';
import { publicationService } from '@/services/publication-service';
import { LoadingState } from '@/components/StateDisplays';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Switch } from '@/components/ui/switch';
import type { OrganizerAnalyticsOverview } from '@/types';

const METRIKA_DEMO_KEY = 'metrika_use_demo';

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
  { source: 'Поисковые системы', value: 312 },
  { source: 'Прямые переходы', value: 178 },
  { source: 'Социальные сети', value: 94 },
  { source: 'Реферальные ссылки', value: 61 },
  { source: 'Другие', value: 29 },
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
    pendingReviews: 0,
    pendingPubs: 0,
  });
  const [analytics, setAnalytics] = useState<OrganizerAnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrikaDemo, setMetrikaDemo] = useState(() => localStorage.getItem(METRIKA_DEMO_KEY) !== 'false');

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
          pendingEvents: events.filter((event) => event.status === 'PENDING_APPROVAL').length,
          pendingReviews: 0,
          pendingPubs: pubs.filter((publication) => publication.status === 'PENDING').length,
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
      from: 'from-primary/15',
      to: 'to-primary/5',
      textColor: 'text-primary',
    },
    {
      label: 'Мероприятий',
      value: stats.events,
      icon: Calendar,
      from: 'from-[hsl(var(--info)/0.15)]',
      to: 'to-[hsl(var(--info)/0.05)]',
      textColor: 'text-[hsl(var(--info))]',
    },
    {
      label: 'Комментариев',
      value: stats.reviews,
      icon: MessageSquare,
      from: 'from-[hsl(var(--warning)/0.15)]',
      to: 'to-[hsl(var(--warning)/0.05)]',
      textColor: 'text-[hsl(var(--warning))]',
    },
    {
      label: 'Публикаций',
      value: stats.publications,
      icon: FileText,
      from: 'from-[hsl(var(--success)/0.15)]',
      to: 'to-[hsl(var(--success)/0.05)]',
      textColor: 'text-[hsl(var(--success))]',
    },
  ];

  const pendingItems = [
    { label: 'Мероприятий на модерации', count: stats.pendingEvents, link: '/admin/events', urgent: stats.pendingEvents > 0 },
    { label: 'Комментариев на удаление', count: stats.pendingReviews, link: '/admin/comments', urgent: stats.pendingReviews > 0 },
    { label: 'Публикаций на модерации', count: stats.pendingPubs, link: '/admin/publications', urgent: stats.pendingPubs > 0 },
  ];

  const toggleMetrikaDemo = (checked: boolean) => {
    const demo = !checked;
    setMetrikaDemo(demo);
    localStorage.setItem(METRIKA_DEMO_KEY, String(demo));
  };

  const effectiveAnalytics = analytics || {};
  const metrikaStatus = effectiveAnalytics.metrika;
  const hasMetrikaData = Boolean(metrikaStatus?.available);

  const visitsByDay = useMemo(() => {
    if (metrikaDemo) return buildDemoSeries(30, 200, 120);
    const raw = effectiveAnalytics.visitsByDay || [];
    if (hasMetrikaData && raw.length > 0) {
      return raw.map((point) => ({ label: formatLabel(point.date), value: Number(point.value || 0) }));
    }
    return [];
  }, [effectiveAnalytics.visitsByDay, hasMetrikaData, metrikaDemo]);

  const registrationsByDay = useMemo(() => {
    const raw = effectiveAnalytics.registrationsByDay || [];
    return raw.map((point) => ({ label: formatLabel(point.date), value: Number(point.value || 0) }));
  }, [effectiveAnalytics.registrationsByDay]);

  const trafficSources = useMemo(() => {
    if (metrikaDemo) return DEMO_TRAFFIC_SOURCES;
    const raw = effectiveAnalytics.trafficSources || [];
    if (hasMetrikaData && raw.length > 0) {
      return raw.map((source) => ({ source: source.source || 'Не определено', value: Number(source.visits || 0) }));
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

  const totalPending = stats.pendingEvents + stats.pendingReviews + stats.pendingPubs;

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Обзор системы</h1>
          <p className="mt-1 text-muted-foreground">Ключевые показатели платформы и очередь модерации</p>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5 shadow-soft">
          <div className="text-right">
            <p className="text-xs font-medium text-foreground">Яндекс.Метрика</p>
            <p className="text-xs text-muted-foreground">{!metrikaDemo ? 'реальные данные' : 'демо-данные'}</p>
          </div>
          <Switch checked={!metrikaDemo} onCheckedChange={toggleMetrikaDemo} />
        </div>
      </section>

      {/* Metric cards */}
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-soft transition-shadow duration-200 hover:shadow-card"
          >
            <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${card.from} ${card.to}`}>
              <card.icon className={`h-5 w-5 ${card.textColor}`} />
            </div>
            <p className="font-heading text-3xl font-bold tracking-tight text-foreground">{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </section>

      {/* Attention queue */}
      <section className="surface-panel">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="font-heading text-xl text-foreground">Требует внимания</h2>
            {totalPending > 0 && (
              <span className="inline-flex h-5 items-center justify-center rounded-full bg-destructive/10 px-2 text-xs font-bold text-destructive">
                {totalPending}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {pendingItems.map((item) => (
            <Link
              key={item.label}
              to={item.link}
              className="group flex items-center justify-between rounded-xl border border-border bg-background/60 p-3.5 transition-all duration-200 hover:border-primary/20 hover:bg-muted/40 hover:shadow-soft"
            >
              <div className="flex items-center gap-3">
                <AlertCircle className={`h-4 w-4 shrink-0 ${item.urgent ? 'text-[hsl(var(--warning))]' : 'text-muted-foreground'}`} />
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-heading text-xl font-bold ${item.urgent ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {item.count}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Charts */}
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="surface-panel xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl text-foreground">Трафик по дням</h2>
            {metrikaDemo && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">демо</span>}
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
                <Line type="monotone" dataKey="value" stroke="var(--color-visits)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="mt-4 flex h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-center">
              <p className="text-sm font-medium text-foreground">Данные трафика недоступны</p>
              <p className="mt-1 text-xs text-muted-foreground">Подключите Яндекс.Метрику через переменные окружения</p>
            </div>
          )}
        </div>

        <div className="surface-panel">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-xl text-foreground">Источники трафика</h2>
            {metrikaDemo && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">демо</span>}
          </div>
          {trafficSources.length > 0 ? (
            <ChartContainer
              className="mt-4 h-[240px] w-full"
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
                    <Cell key={`source-${index}`} fill={['#C17F59', '#CFA07D', '#D9B49A', '#E5CFC0', '#B56A3F'][index % 5]} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="source" />} />
              </PieChart>
            </ChartContainer>
          ) : (
            <div className="mt-4 flex h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 text-center">
              <p className="text-sm font-medium text-foreground">Нет данных</p>
              <p className="mt-1 text-xs text-muted-foreground">Требуется Яндекс.Метрика</p>
            </div>
          )}
        </div>
      </section>

      <section className="surface-panel">
        <h2 className="font-heading text-xl text-foreground">Регистрации по дням</h2>
        <ChartContainer
          className="mt-4 h-[220px] w-full"
          config={{ registrations: { label: 'Регистрации', color: '#C17F59' } }}
        >
          <BarChart data={registrationsByDay} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <YAxis tickLine={false} axisLine={false} width={36} tick={{ fontSize: 11 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="var(--color-registrations)" />
          </BarChart>
        </ChartContainer>
      </section>
    </div>
  );
}

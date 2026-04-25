import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Calendar, FileText, MessageSquare, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, XAxis, YAxis } from 'recharts';
import { adminService } from '@/services/admin-service';
import { eventService } from '@/services/event-service';
import { reviewService } from '@/services/review-service';
import { publicationService } from '@/services/publication-service';
import { LoadingState } from '@/components/StateDisplays';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { OrganizerAnalyticsOverview } from '@/types';

interface ChartPoint {
  label: string;
  value: number;
}

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
    const wave = Math.cos((days - i) / 2.4) * delta;
    const noise = ((days - i) % 5) * (delta / 7);
    result.push({
      label: new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit' }).format(date),
      value: Math.max(0, Math.round(base + wave + noise)),
    });
  }

  return result;
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
          pendingReviews: reviews.filter((review) => review.moderationStatus === 'на_рассмотрении').length,
          pendingPubs: pubs.filter((publication) => publication.status === 'PENDING').length,
        });
        setAnalytics(analyticsResponse);
      })
      .catch(() => {
        setError('Не удалось загрузить аналитику администратора. Попробуйте обновить страницу.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const cards = [
    { label: 'Пользователей', value: stats.users, icon: Users, color: 'text-primary' },
    { label: 'Мероприятий', value: stats.events, icon: Calendar, color: 'text-info' },
    { label: 'Комментариев', value: stats.reviews, icon: MessageSquare, color: 'text-warning' },
    { label: 'Публикаций', value: stats.publications, icon: FileText, color: 'text-success' },
  ];

  const pendingItems = [
    { label: 'Мероприятий на модерации', count: stats.pendingEvents, link: '/admin/events' },
    { label: 'Комментариев на модерации', count: stats.pendingReviews, link: '/admin/comments' },
    { label: 'Публикаций на модерации', count: stats.pendingPubs, link: '/admin/publications' },
  ];

  const effectiveAnalytics = analytics || {};
  const metrikaStatus = effectiveAnalytics.metrika;
  const hasMetrikaData = Boolean(metrikaStatus?.available);

  const visitsByDay = useMemo(() => {
    const raw = effectiveAnalytics.visitsByDay || [];
    if (hasMetrikaData && raw.length > 0) {
      return raw.map((point) => ({ label: formatLabel(point.date), value: Number(point.value || 0) }));
    }
    return [];
  }, [effectiveAnalytics.visitsByDay, hasMetrikaData]);

  const registrationsByDay = useMemo(() => {
    const raw = effectiveAnalytics.registrationsByDay || [];
    return raw.map((point) => ({ label: formatLabel(point.date), value: Number(point.value || 0) }));
  }, [effectiveAnalytics.registrationsByDay]);

  const trafficSources = useMemo(() => {
    const raw = effectiveAnalytics.trafficSources || [];
    if (hasMetrikaData && raw.length > 0) {
      return raw.map((source) => ({ source: source.source || 'Не определено', value: Number(source.visits || 0) }));
    }
    return [];
  }, [effectiveAnalytics.trafficSources, hasMetrikaData]);

  const usingDemoForMetrika = !hasMetrikaData;

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <div className="surface-panel">
        <h1 className="page-title">Обзор системы</h1>
        <p className="mt-2 text-sm text-destructive">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="page-title">Обзор системы</h1>
        <p className="mt-1 text-muted-foreground">Ключевые показатели платформы и очередь модерации</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {usingDemoForMetrika
            ? 'Яндекс Метрика пока не подключена. Для графиков трафика показаны демо-данные.'
            : (metrikaStatus?.message || 'Данные Яндекс Метрики загружены.')}
        </p>
      </section>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="metric-card">
            <div className="metric-icon">
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <p className="text-2xl font-semibold text-foreground">{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="surface-panel xl:col-span-2">
          <h2 className="font-heading text-xl text-foreground">Трафик по дням</h2>
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
              <p className="mt-1 text-xs text-muted-foreground">Подключите Яндекс.Метрику через переменные окружения</p>
            </div>
          )}
        </div>

        <div className="surface-panel">
          <h2 className="font-heading text-xl text-foreground">Источники трафика</h2>
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
        <h2 className="font-heading text-2xl text-foreground">Требует внимания</h2>
        <div className="mt-4 space-y-2">
          {pendingItems.map((item) => (
            <Link
              key={item.label}
              to={item.link}
              className="surface-row flex items-center justify-between"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </div>
              <span className="text-xl font-semibold text-foreground">{item.count}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

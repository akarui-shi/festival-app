import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Calendar, Plus, Star, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { organizerService } from '@/services/organizer-service';
import { LoadingState } from '@/components/StateDisplays';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import type { OrganizerOverviewBundle } from '@/types';

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<OrganizerOverviewBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    organizerService.getOverview(user.id)
      .then((response) => { setOverview(response); setError(null); })
      .catch((err: any) => { setOverview(null); setError(err?.message || 'Не удалось загрузить панель'); })
      .finally(() => setLoading(false));
  }, [user]);

  if (loading) return <LoadingState />;

  if (error || !overview) {
    return (
      <div className="surface-panel">
        <h1 className="page-title">Панель организатора недоступна</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error || 'Не удалось получить данные'}</p>
      </div>
    );
  }

  const engagements = overview.engagements || [];
  const kpi = overview.overview.kpi || {};
  const totalRegistrations = kpi.registrations ?? engagements.reduce((sum, item) => sum + (item.registrationsCount || 0), 0);
  const averageRating = kpi.averageRating ?? (
    engagements.length > 0
      ? engagements.reduce((sum, item) => sum + (item.averageRating || 0), 0) / engagements.length
      : 0
  );
  const upcomingEvents = overview.events.filter((event) =>
    event.nextSessionAt && new Date(event.nextSessionAt).getTime() > Date.now()
  ).length;
  const topEvents = [...engagements]
    .sort((a, b) => (b.registrationsCount || 0) - (a.registrationsCount || 0))
    .slice(0, 5);
  const maxRegistrations = topEvents[0]?.registrationsCount || 1;

  const stats = [
    {
      label: 'Мероприятий',
      value: overview.events.length,
      icon: Calendar,
      from: 'from-primary/15',
      to: 'to-primary/5',
      textColor: 'text-primary',
    },
    {
      label: 'Регистраций',
      value: totalRegistrations,
      icon: Users,
      from: 'from-[hsl(var(--info)/0.15)]',
      to: 'to-[hsl(var(--info)/0.05)]',
      textColor: 'text-[hsl(var(--info))]',
    },
    {
      label: 'Средний рейтинг',
      value: averageRating.toFixed(1),
      icon: Star,
      from: 'from-[hsl(var(--warning)/0.15)]',
      to: 'to-[hsl(var(--warning)/0.05)]',
      textColor: 'text-[hsl(var(--warning))]',
    },
    {
      label: 'Предстоящих',
      value: upcomingEvents,
      icon: TrendingUp,
      from: 'from-[hsl(var(--success)/0.15)]',
      to: 'to-[hsl(var(--success)/0.05)]',
      textColor: 'text-[hsl(var(--success))]',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Обзор</h1>
          <p className="mt-1 text-muted-foreground">Краткая статистика ваших мероприятий</p>
        </div>
        <Button asChild className="gap-1.5 shadow-sm shadow-primary/20">
          <Link to="/organizer/events/create">
            <Plus className="h-4 w-4" />
            Создать мероприятие
          </Link>
        </Button>
      </section>

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-soft transition-shadow duration-200 hover:shadow-card">
            <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.from} ${stat.to}`}>
              <stat.icon className={`h-5 w-5 ${stat.textColor}`} />
            </div>
            <p className="font-heading text-3xl font-bold tracking-tight text-foreground">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="surface-panel">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-xl text-foreground">Топ мероприятий</h2>
          <Link
            to="/organizer/events"
            className="flex items-center gap-1 text-sm font-semibold text-primary transition-colors hover:text-primary/80"
          >
            Все мероприятия <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {topEvents.length === 0 ? (
          <EmptyState icon={Calendar} title="Нет данных" description="Статистика появится после первых мероприятий" />
        ) : (
          <div className="space-y-3">
            {topEvents.map((event, index) => {
              const pct = Math.round(((event.registrationsCount || 0) / maxRegistrations) * 100);
              return (
                <Link
                  key={event.eventId}
                  to={`/organizer/events/${event.eventId}/stats`}
                  className="group flex items-center gap-4 rounded-xl border border-border bg-background/60 p-3.5 transition-all duration-200 hover:border-primary/20 hover:bg-muted/40 hover:shadow-soft"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                    {index + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-foreground transition-colors group-hover:text-primary">
                      {event.eventTitle}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary/60 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {event.registrationsCount || 0} записей
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1 text-sm">
                    <Star className="h-3.5 w-3.5 fill-[hsl(var(--warning))] text-[hsl(var(--warning))]" />
                    <span className="font-semibold text-foreground">{(event.averageRating || 0).toFixed(1)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

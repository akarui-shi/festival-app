import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Star, TrendingUp, Users } from 'lucide-react';
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

  useEffect(() => {
    if (!user) return;
    organizerService.getOverview(user.id).then((response) => {
      setOverview(response);
      setLoading(false);
    });
  }, [user]);

  if (loading || !overview) return <LoadingState />;

  const engagements = overview.engagements || [];
  const kpi = overview.overview.kpi || {};
  const totalRegistrations = kpi.registrations ?? engagements.reduce((sum, item) => sum + (item.registrationsCount || 0), 0);
  const averageRating = kpi.averageRating ?? (
    engagements.length > 0
      ? engagements.reduce((sum, item) => sum + (item.averageRating || 0), 0) / engagements.length
      : 0
  );
  const upcomingEvents = overview.events.filter((event) => {
    if (!event.nextSessionAt) return false;
    return new Date(event.nextSessionAt).getTime() > Date.now();
  }).length;
  const topEvents = [...engagements]
    .sort((a, b) => (b.registrationsCount || 0) - (a.registrationsCount || 0))
    .slice(0, 5);

  const stats = [
    { label: 'Мероприятий', value: overview.events.length, icon: Calendar, color: 'text-primary' },
    { label: 'Регистраций', value: totalRegistrations, icon: Users, color: 'text-info' },
    { label: 'Средний рейтинг', value: averageRating.toFixed(1), icon: Star, color: 'text-warning' },
    { label: 'Предстоящих', value: upcomingEvents, icon: TrendingUp, color: 'text-success' },
  ];

  return (
    <div className="space-y-8">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-title">Обзор</h1>
          <p className="mt-1 text-muted-foreground">Краткая статистика ваших мероприятий</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/organizer/events/create">
            Создать мероприятие
          </Link>
        </Button>
      </section>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="metric-card">
            <div className="metric-icon">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </section>

      <section className="surface-panel">
        <h2 className="font-heading text-2xl text-foreground">Топ мероприятий</h2>
        <div className="mt-4 space-y-2">
          {topEvents.length === 0 && (
            <EmptyState icon={Calendar} title="Нет данных" description="Статистика появится после первых мероприятий" />
          )}

          {topEvents.map((event) => (
            <Link
              key={event.eventId}
              to={`/organizer/events/${event.eventId}/stats`}
              className="surface-row flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium text-foreground">{event.eventTitle}</p>
                <p className="text-xs text-muted-foreground">
                  {event.sessionsCount || 0} сеансов · {event.registrationsCount || 0} записей
                </p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1 text-foreground">
                  <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                  {(event.averageRating || 0).toFixed(1)}
                </span>
                <span className="text-muted-foreground">{event.reviewsCount || 0} отзывов</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

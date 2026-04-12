import { useEffect, useState } from 'react';
import { BarChart3, Star, TrendingUp, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { organizerService } from '@/services/organizer-service';
import { LoadingState } from '@/components/StateDisplays';
import type { OrganizerOverview } from '@/types';

export default function OrganizerAnalytics() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<OrganizerOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    organizerService.getOverview(user.id).then((response) => {
      setOverview(response);
      setLoading(false);
    });
  }, [user]);

  if (loading || !overview) return <LoadingState />;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-heading text-3xl text-foreground sm:text-4xl">Аналитика</h1>
        <p className="mt-1 text-muted-foreground">Сводка по эффективности ваших мероприятий</p>
      </section>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5 text-center shadow-soft">
          <BarChart3 className="h-5 w-5 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{overview.totalEvents}</p>
          <p className="text-xs text-muted-foreground">Всего мероприятий</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 text-center shadow-soft">
          <Users className="h-5 w-5 text-info mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{overview.totalRegistrations}</p>
          <p className="text-xs text-muted-foreground">Всего записей</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 text-center shadow-soft">
          <Star className="h-5 w-5 text-warning mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{overview.averageRating.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">Средний рейтинг</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 text-center shadow-soft">
          <TrendingUp className="h-5 w-5 text-success mx-auto mb-2" />
          <p className="text-2xl font-bold text-foreground">{overview.upcomingEvents}</p>
          <p className="text-xs text-muted-foreground">Предстоящих</p>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card shadow-card">
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
              {overview.topEvents.map((event) => (
                <tr key={event.eventId} className="border-t border-border/60">
                  <td className="px-6 py-3.5 font-medium text-foreground">{event.eventTitle}</td>
                  <td className="px-6 py-3.5">{event.totalRegistrations}</td>
                  <td className="px-6 py-3.5">{event.totalAttended}</td>
                  <td className="px-6 py-3.5">{event.averageRating.toFixed(1)}</td>
                  <td className="px-6 py-3.5">{event.reviewsCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

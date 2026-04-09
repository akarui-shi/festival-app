import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { organizerService } from '@/services/organizer-service';
import { LoadingState } from '@/components/StateDisplays';
import type { OrganizerOverview } from '@/types';
import { BarChart3, TrendingUp, Users, Star } from 'lucide-react';

export default function OrganizerAnalytics() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<OrganizerOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    organizerService.getOverview(user.id).then(o => { setOverview(o); setLoading(false); });
  }, [user]);

  if (loading || !overview) return <LoadingState />;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">Аналитика</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="p-5 rounded-xl border border-border bg-card text-center">
          <BarChart3 className="h-5 w-5 text-primary mx-auto mb-2" />
          <p className="text-2xl font-bold">{overview.totalEvents}</p>
          <p className="text-xs text-muted-foreground">Всего мероприятий</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card text-center">
          <Users className="h-5 w-5 text-info mx-auto mb-2" />
          <p className="text-2xl font-bold">{overview.totalRegistrations}</p>
          <p className="text-xs text-muted-foreground">Всего записей</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card text-center">
          <Star className="h-5 w-5 text-warning mx-auto mb-2" />
          <p className="text-2xl font-bold">{overview.averageRating.toFixed(1)}</p>
          <p className="text-xs text-muted-foreground">Средний рейтинг</p>
        </div>
        <div className="p-5 rounded-xl border border-border bg-card text-center">
          <TrendingUp className="h-5 w-5 text-success mx-auto mb-2" />
          <p className="text-2xl font-bold">{overview.upcomingEvents}</p>
          <p className="text-xs text-muted-foreground">Предстоящих</p>
        </div>
      </div>

      <h2 className="font-heading text-lg font-bold mb-4">По мероприятиям</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-3 pr-4 font-medium text-muted-foreground">Мероприятие</th>
              <th className="py-3 pr-4 font-medium text-muted-foreground">Записей</th>
              <th className="py-3 pr-4 font-medium text-muted-foreground">Посетили</th>
              <th className="py-3 pr-4 font-medium text-muted-foreground">Рейтинг</th>
              <th className="py-3 font-medium text-muted-foreground">Отзывов</th>
            </tr>
          </thead>
          <tbody>
            {overview.topEvents.map(e => (
              <tr key={e.eventId} className="border-b border-border/50">
                <td className="py-3 pr-4 font-medium">{e.eventTitle}</td>
                <td className="py-3 pr-4">{e.totalRegistrations}</td>
                <td className="py-3 pr-4">{e.totalAttended}</td>
                <td className="py-3 pr-4">{e.averageRating.toFixed(1)}</td>
                <td className="py-3">{e.reviewsCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

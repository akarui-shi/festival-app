import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { organizerService } from '@/services/organizer-service';
import { LoadingState } from '@/components/StateDisplays';
import type { OrganizerOverview } from '@/types';
import { Calendar, Users, Star, TrendingUp } from 'lucide-react';

export default function OrganizerDashboard() {
  const { user } = useAuth();
  const [overview, setOverview] = useState<OrganizerOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    organizerService.getOverview(user.id).then(o => { setOverview(o); setLoading(false); });
  }, [user]);

  if (loading || !overview) return <LoadingState />;

  const stats = [
    { label: 'Мероприятий', value: overview.totalEvents, icon: Calendar, color: 'text-primary' },
    { label: 'Регистраций', value: overview.totalRegistrations, icon: Users, color: 'text-info' },
    { label: 'Средний рейтинг', value: overview.averageRating.toFixed(1), icon: Star, color: 'text-warning' },
    { label: 'Предстоящих', value: overview.upcomingEvents, icon: TrendingUp, color: 'text-success' },
  ];

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">Обзор</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>

      <h2 className="font-heading text-lg font-bold mb-4">Топ мероприятий</h2>
      <div className="space-y-3">
        {overview.topEvents.map(e => (
          <div key={e.eventId} className="p-4 rounded-xl border border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-medium">{e.eventTitle}</p>
              <p className="text-xs text-muted-foreground">{e.sessionsCount} сеансов · {e.totalRegistrations} записей</p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-warning text-warning" />{e.averageRating.toFixed(1)}</span>
              <span className="text-muted-foreground">{e.reviewsCount} отзывов</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { adminService } from '@/services/admin-service';
import { eventService } from '@/services/event-service';
import { reviewService } from '@/services/review-service';
import { publicationService } from '@/services/publication-service';
import { LoadingState } from '@/components/StateDisplays';
import { Users, Calendar, MessageSquare, FileText, AlertCircle } from 'lucide-react';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, events: 0, reviews: 0, publications: 0, pendingEvents: 0, pendingReviews: 0, pendingPubs: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminService.getUsers(),
      eventService.getAllEvents(),
      reviewService.getAllReviews(),
      publicationService.getAllPublications(),
    ]).then(([users, events, reviews, pubs]) => {
      setStats({
        users: users.length, events: events.length, reviews: reviews.length, publications: pubs.length,
        pendingEvents: events.filter(e => e.status === 'PENDING').length,
        pendingReviews: reviews.filter(r => r.status === 'PENDING').length,
        pendingPubs: pubs.filter(p => p.status === 'PENDING').length,
      });
      setLoading(false);
    });
  }, []);

  if (loading) return <LoadingState />;

  const cards = [
    { label: 'Пользователей', value: stats.users, icon: Users, color: 'text-primary' },
    { label: 'Мероприятий', value: stats.events, icon: Calendar, color: 'text-info' },
    { label: 'Отзывов', value: stats.reviews, icon: MessageSquare, color: 'text-warning' },
    { label: 'Публикаций', value: stats.publications, icon: FileText, color: 'text-success' },
  ];

  const pending = [
    { label: 'Мероприятий на модерации', count: stats.pendingEvents, link: '/admin/events' },
    { label: 'Отзывов на модерации', count: stats.pendingReviews, link: '/admin/reviews' },
    { label: 'Публикаций на модерации', count: stats.pendingPubs, link: '/admin/publications' },
  ];

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">Админ-панель</h1>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className="p-4 rounded-xl border border-border bg-card">
            <c.icon className={`h-4 w-4 ${c.color} mb-2`} />
            <p className="text-2xl font-bold">{c.value}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
          </div>
        ))}
      </div>

      <h2 className="font-heading text-lg font-bold mb-4">Требует внимания</h2>
      <div className="space-y-3">
        {pending.map(p => (
          <div key={p.label} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-4 w-4 text-warning" />
              <span className="text-sm font-medium">{p.label}</span>
            </div>
            <span className="text-lg font-bold">{p.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

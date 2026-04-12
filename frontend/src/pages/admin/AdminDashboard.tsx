import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Calendar, FileText, MessageSquare, Users } from 'lucide-react';
import { adminService } from '@/services/admin-service';
import { eventService } from '@/services/event-service';
import { reviewService } from '@/services/review-service';
import { publicationService } from '@/services/publication-service';
import { LoadingState } from '@/components/StateDisplays';

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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminService.getUsers(),
      eventService.getAllEvents(),
      reviewService.getAllReviews(),
      publicationService.getAllPublications(),
    ]).then(([users, events, reviews, pubs]) => {
      setStats({
        users: users.length,
        events: events.length,
        reviews: reviews.length,
        publications: pubs.length,
        pendingEvents: events.filter((event) => event.status === 'PENDING').length,
        pendingReviews: reviews.filter((review) => review.status === 'PENDING').length,
        pendingPubs: pubs.filter((publication) => publication.status === 'PENDING').length,
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

  const pendingItems = [
    { label: 'Мероприятий на модерации', count: stats.pendingEvents, link: '/admin/events' },
    { label: 'Отзывов на модерации', count: stats.pendingReviews, link: '/admin/reviews' },
    { label: 'Публикаций на модерации', count: stats.pendingPubs, link: '/admin/publications' },
  ];

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-heading text-3xl text-foreground sm:text-4xl">Обзор системы</h1>
        <p className="mt-1 text-muted-foreground">Ключевые показатели платформы и очередь модерации</p>
      </section>

      <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-border bg-card p-5 shadow-soft">
            <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <card.icon className={`h-4 w-4 ${card.color}`} />
            </div>
            <p className="text-2xl font-bold text-foreground">{card.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{card.label}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="font-heading text-2xl text-foreground">Требует внимания</h2>
        <div className="mt-4 space-y-2">
          {pendingItems.map((item) => (
            <Link
              key={item.label}
              to={item.link}
              className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-4 py-3 transition-colors hover:bg-muted/70"
            >
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 text-warning" />
                <span className="text-sm font-medium text-foreground">{item.label}</span>
              </div>
              <span className="text-xl font-bold text-foreground">{item.count}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

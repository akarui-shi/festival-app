import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { EventCard } from '@/components/EventCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/StateDisplays';
import { eventService } from '@/services/event-service';
import { directoryService } from '@/services/directory-service';
import type { Event, Category } from '@/types';
import { ArrowRight, Search, Sparkles } from 'lucide-react';

export default function HomePage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      eventService.getEvents({ size: 6 }),
      directoryService.getCategories(),
    ]).then(([res, cats]) => {
      setEvents(res.content);
      setCategories(cats);
      setLoading(false);
    });
  }, []);

  if (loading) return <PublicLayout><LoadingState /></PublicLayout>;

  const featured = events[0];
  const upcoming = events.slice(1, 5);

  return (
    <PublicLayout>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-accent/5 to-background">
        <div className="container py-16 md:py-24">
          <div className="max-w-2xl animate-slide-up">
            <Badge variant="secondary" className="mb-4 text-sm px-3 py-1">
              <Sparkles className="h-3.5 w-3.5 mr-1" /> Сезон 2026
            </Badge>
            <h1 className="font-heading text-4xl md:text-6xl font-bold leading-tight mb-4">
              Культурная жизнь<br />
              <span className="text-gradient">вашего города</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg">
              Фестивали, выставки, концерты, мастер-классы и многое другое. Откройте для себя лучшие события рядом с вами.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" asChild>
                <Link to="/events"><Search className="h-4 w-4 mr-2" />Смотреть афишу</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/publications">Читать новости</Link>
              </Button>
            </div>
          </div>
        </div>
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -left-10 bottom-0 w-72 h-72 bg-accent/5 rounded-full blur-3xl" />
      </section>

      {/* Categories */}
      <section className="container py-12">
        <h2 className="font-heading text-2xl font-bold mb-6">Категории</h2>
        <div className="flex flex-wrap gap-3">
          {categories.map(cat => (
            <Link key={cat.id} to={`/events?category=${cat.id}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-colors">
              <span className="text-lg">{cat.icon}</span>
              <span className="text-sm font-medium">{cat.name}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Event */}
      {featured && (
        <section className="container py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-heading text-2xl font-bold">Главное событие</h2>
          </div>
          <EventCard event={featured} variant="featured" />
        </section>
      )}

      {/* Upcoming Events */}
      <section className="container py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading text-2xl font-bold">Ближайшие события</h2>
          <Button variant="ghost" asChild>
            <Link to="/events">Все мероприятия <ArrowRight className="h-4 w-4 ml-1" /></Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {upcoming.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-16">
        <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 p-8 md:p-12 text-center">
          <h2 className="font-heading text-2xl md:text-3xl font-bold mb-3">Организуете мероприятие?</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">Зарегистрируйтесь как организатор и разместите своё событие на нашей платформе</p>
          <Button size="lg" asChild>
            <Link to="/register">Начать бесплатно</Link>
          </Button>
        </div>
      </section>
    </PublicLayout>
  );
}

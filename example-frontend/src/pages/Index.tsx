import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/EventCard";
import { events } from "@/data/mock";

export default function Index() {
  const upcomingEvent = events[0];
  const featuredEvents = events.slice(0, 3);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-warm-cream via-background to-golden-light/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--terracotta)/0.06),transparent_70%)]" />
        <div className="container relative mx-auto px-4 py-16 sm:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="animate-fade-in">
              <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Культурная жизнь малых городов
              </div>
              <h1 className="font-heading text-4xl leading-tight text-foreground sm:text-5xl lg:text-6xl">
                Откройте для себя
                <span className="block text-primary"> культурные события</span>
              </h1>
              <p className="mt-4 max-w-lg text-lg text-muted-foreground">
                Находите фестивали, концерты, выставки и мастер-классы
                в&nbsp;уютных городах России. Записывайтесь и&nbsp;делитесь впечатлениями.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/events">
                  <Button size="lg" className="gap-2">
                    Смотреть мероприятия
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg">
                    Создать аккаунт
                  </Button>
                </Link>
              </div>
            </div>

            {/* Upcoming event mini-card */}
            <div className="animate-slide-up" style={{ animationDelay: "0.2s" }}>
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={upcomingEvent.image}
                    alt={upcomingEvent.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="mb-1 inline-block rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                      Ближайшее событие
                    </span>
                    <h3 className="font-heading text-xl text-primary-foreground">
                      {upcomingEvent.title}
                    </h3>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4">
                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      {upcomingEvent.date}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 text-primary" />
                      {upcomingEvent.city}
                    </span>
                  </div>
                  <Link to={`/events/${upcomingEvent.id}`}>
                    <Button variant="outline" size="sm" className="gap-1">
                      Подробнее <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured events */}
      <section className="container mx-auto px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-heading text-2xl text-foreground sm:text-3xl">
              Популярные мероприятия
            </h2>
            <p className="mt-1 text-muted-foreground">
              Самые интересные события в ближайшее время
            </p>
          </div>
          <Link
            to="/events"
            className="hidden items-center gap-1 text-sm font-semibold text-primary hover:underline sm:flex"
          >
            Все мероприятия <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featuredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
        <div className="mt-8 text-center sm:hidden">
          <Link to="/events">
            <Button variant="outline" className="gap-1">
              Все мероприятия <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-r from-primary/5 via-golden-light/10 to-primary/5">
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="font-heading text-2xl text-foreground sm:text-3xl">
            Вы организатор мероприятий?
          </h2>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            Создавайте события, управляйте записями и привлекайте аудиторию на нашей платформе
          </p>
          <Link to="/login" className="mt-6 inline-block">
            <Button size="lg" className="gap-2">
              Начать бесплатно <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}

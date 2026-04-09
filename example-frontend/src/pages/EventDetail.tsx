import { useParams, Link } from "react-router-dom";
import {
  CalendarDays, Clock, MapPin, ArrowLeft, Star, Users,
  Building2, Share2, Heart, CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { events } from "@/data/mock";

export default function EventDetail() {
  const { id } = useParams();
  const event = events.find((e) => e.id === Number(id));

  if (!event) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="font-heading text-2xl text-foreground">Мероприятие не найдено</h1>
        <Link to="/events" className="mt-4 inline-block text-primary hover:underline">
          ← Вернуться к списку
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <Link to="/events" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" />
        Все мероприятия
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2">
          {/* Image */}
          <div className="overflow-hidden rounded-2xl">
            <img
              src={event.image}
              alt={event.title}
              className="aspect-video w-full object-cover"
            />
          </div>

          {/* Title section */}
          <div className="mt-6">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{event.category}</Badge>
              <Badge variant="outline">{event.ageRestriction}</Badge>
              {event.isFree && <Badge className="bg-primary text-primary-foreground">Бесплатно</Badge>}
            </div>
            <h1 className="mt-3 font-heading text-3xl text-foreground sm:text-4xl">
              {event.title}
            </h1>

            {/* Rating */}
            <div className="mt-3 flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-golden text-golden" />
                <span className="text-sm font-semibold text-foreground">{event.rating}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {event.reviewCount} отзывов
              </span>
            </div>
          </div>

          {/* Organizer */}
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Организатор</p>
              <p className="font-semibold text-foreground">{event.organizerName}</p>
            </div>
          </div>

          {/* Description */}
          <div className="mt-8">
            <h2 className="font-heading text-xl text-foreground">Описание</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              {event.description}
            </p>
          </div>

          {/* Sessions */}
          <div className="mt-8">
            <h2 className="font-heading text-xl text-foreground">Сеансы</h2>
            <div className="mt-3 space-y-2">
              {event.sessions.map((session, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <CalendarDays className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{session.date}</p>
                      <p className="text-sm text-muted-foreground">{session.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3.5 w-3.5" />
                      {session.spotsLeft} мест
                    </span>
                    <Button size="sm">Записаться</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews placeholder */}
          <div className="mt-8">
            <h2 className="font-heading text-xl text-foreground">Отзывы</h2>
            <div className="mt-3 rounded-xl border border-border bg-card p-6 text-center">
              <Star className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <p className="mt-2 text-sm text-muted-foreground">
                Войдите, чтобы оставить отзыв
              </p>
              <Link to="/login">
                <Button variant="outline" size="sm" className="mt-3">
                  Войти
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-4">
            {/* Registration card */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
              <p className="text-2xl font-bold text-foreground">{event.price}</p>
              <Button className="mt-4 w-full gap-2" size="lg">
                <CheckCircle2 className="h-5 w-5" />
                Записаться
              </Button>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" className="flex-1 gap-1.5">
                  <Heart className="h-4 w-4" />
                  В избранное
                </Button>
                <Button variant="outline" size="icon">
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Info card */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="mb-4 font-heading text-lg text-foreground">Информация</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{event.date}</p>
                    {event.endDate && (
                      <p className="text-xs text-muted-foreground">до {event.endDate}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="mt-0.5 h-4 w-4 text-primary" />
                  <p className="text-sm text-foreground">Начало в {event.time}</p>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{event.address}</p>
                    <p className="text-xs text-muted-foreground">{event.city}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Map placeholder */}
            <div className="overflow-hidden rounded-2xl border border-border">
              <div className="flex aspect-square items-center justify-center bg-muted">
                <div className="text-center">
                  <MapPin className="mx-auto h-8 w-8 text-muted-foreground/40" />
                  <p className="mt-2 text-xs text-muted-foreground">Карта</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

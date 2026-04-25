import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, MapPin, Sparkles, Star, Ticket, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { EventCard } from '@/components/EventCard';
import { LoadingState } from '@/components/StateDisplays';
import { imageSrc } from '@/lib/image';
import { PublicLayout } from '@/layouts/PublicLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useCity } from '@/contexts/CityContext';
import { eventService } from '@/services/event-service';
import type { Event } from '@/types';

function formatDate(value?: string): string {
  if (!value) return 'Скоро';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Скоро';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
  }).format(date);
}

function resolveEventDate(event: Event): string | undefined {
  return event.nextSessionAt || event.startDate || event.sessionDates?.[0] || event.createdAt || undefined;
}

function resolveEventDateTime(event: Event): number {
  const value = resolveEventDate(event);
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
}

function resolveEventTitle(event: Event): string {
  const value = event.title?.trim();
  return value && value.length > 0 ? value : 'Мероприятие';
}

function resolveEventCityName(event: Event): string {
  return event.city?.name || event.cityName || event.venue?.city?.name || event.venue?.cityName || 'Город уточняется';
}

export default function HomePage() {
  const { user, isAuthenticated, updateUser } = useAuth();
  const { selectedCity, loading: cityLoading } = useCity();
  const [events, setEvents] = useState<Event[]>([]);
  const [recommendations, setRecommendations] = useState<Event[]>([]);
  const [platformStats, setPlatformStats] = useState<{ totalEvents: number; totalRegistrations: number; totalCities: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingSubscription, setUpdatingSubscription] = useState(false);

  useEffect(() => {
    if (cityLoading) {
      return;
    }

    let active = true;
    setLoading(true);
    const selectedCityId = selectedCity?.id == null ? null : String(selectedCity.id);

    Promise.all([
      eventService.getEvents({ size: 120, cityId: selectedCity?.id || undefined, status: 'PUBLISHED' }),
      eventService.getRecommendations(selectedCity?.id),
      eventService.getPlatformStats(),
    ])
      .then(([response, recs, stats]) => {
        if (!active) return;

        if (!selectedCityId) {
          setEvents([]);
          setRecommendations([]);
        } else {
          const filtered = response.content.filter((event) => {
            const eventCityId = event.cityId ?? event.city?.id;
            return eventCityId != null && String(eventCityId) === selectedCityId;
          });
          setEvents(filtered);
          setRecommendations(recs.filter((e) => {
            const id = e.cityId ?? e.city?.id;
            return id != null && String(id) === selectedCityId;
          }).slice(0, 4));
        }

        setPlatformStats(stats);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedCity?.id, cityLoading]);

  const sortedEvents = [...events].sort((left, right) => resolveEventDateTime(left) - resolveEventDateTime(right));
  const upcomingEvent = sortedEvents[0];
  const featuredEvents = sortedEvents.slice(0, 3);
  const notificationsEnabled = Boolean(user?.newEventsNotificationsEnabled);

  if (loading) {
    return (
      <PublicLayout>
        <LoadingState />
      </PublicLayout>
    );
  }

  const toggleSubscription = async (enabled: boolean) => {
    if (!isAuthenticated) {
      toast.info('Войдите в аккаунт, чтобы управлять подпиской на уведомления');
      return;
    }

    setUpdatingSubscription(true);
    try {
      await updateUser({ newEventsNotificationsEnabled: enabled });
      toast.success(enabled ? 'Подписка на новые мероприятия включена' : 'Подписка отключена');
    } catch (error: any) {
      toast.error(error?.message || 'Не удалось обновить подписку');
    } finally {
      setUpdatingSubscription(false);
    }
  };

  return (
    <PublicLayout>
      <section className="relative overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--warm-cream))] via-background to-[hsl(var(--golden-light)/0.25)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_-10%,hsl(var(--terracotta)/0.08),transparent)]" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        <div className="container relative mx-auto px-4 py-16 sm:py-24 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            {/* Text block */}
            <div className="animate-fade-in">
              <div className="section-label">
                <Sparkles className="h-3.5 w-3.5" />
                Культурная жизнь малых городов
              </div>
              <h1 className="mt-1 font-heading text-4xl leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Откройте для себя
                <span className="block text-gradient-warm"> культурные события</span>
              </h1>
              <p className="mt-5 max-w-lg text-lg leading-relaxed text-muted-foreground">
                Находите фестивали, концерты, выставки и мастер-классы в уютных городах России. Записывайтесь и делитесь впечатлениями.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/events">
                  <Button size="lg" className="gap-2 shadow-md shadow-primary/20 transition-shadow hover:shadow-lg hover:shadow-primary/25">
                    Смотреть мероприятия
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                {!isAuthenticated && (
                  <Link to="/register">
                    <Button variant="outline" size="lg" className="hover:border-primary/40">
                      Создать аккаунт
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Featured event card */}
            {upcomingEvent && (
              <div className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
                <Link
                  to={`/events/${upcomingEvent.id}`}
                  className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-lifted transition-all duration-300 hover:-translate-y-1 hover:shadow-hover"
                >
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={imageSrc(upcomingEvent.coverImageId == null ? null : Number(upcomingEvent.coverImageId), '/placeholder-event.svg')}
                      alt={resolveEventTitle(upcomingEvent)}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <span className="mb-2 inline-flex items-center gap-1 rounded-full bg-primary/90 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
                        <CalendarDays className="h-3 w-3" />
                        Ближайшее событие
                      </span>
                      <h3 className="font-heading text-xl leading-snug text-white">{resolveEventTitle(upcomingEvent)}</h3>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-primary/60" />
                        {formatDate(resolveEventDate(upcomingEvent))}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary/60" />
                        {resolveEventCityName(upcomingEvent)}
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100">
                      Подробнее <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-heading text-2xl tracking-tight text-foreground sm:text-3xl">Популярные мероприятия</h2>
            <p className="mt-1.5 text-muted-foreground">Самые интересные события в ближайшее время</p>
          </div>
          <Link
            to="/events"
            className="hidden items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary/80 sm:flex"
          >
            Все мероприятия <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {featuredEvents.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featuredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
            Пока нет опубликованных мероприятий
          </div>
        )}

        <div className="mt-8 text-center sm:hidden">
          <Link to="/events">
            <Button variant="outline" className="gap-2">
              Все мероприятия <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {platformStats && (
        <section className="border-y border-border bg-gradient-to-r from-card via-card to-card">
          <div className="container mx-auto px-4 py-10">
            <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-3 overflow-hidden rounded-2xl shadow-soft">
              {[
                { icon: CalendarDays, value: platformStats.totalEvents, label: 'мероприятий', suffix: '+' },
                { icon: Ticket, value: platformStats.totalRegistrations, label: 'регистраций', suffix: '+' },
                { icon: Building2, value: platformStats.totalCities, label: 'городов', suffix: '' },
              ].map(({ icon: Icon, value, label, suffix }) => (
                <div key={label} className="flex flex-col items-center gap-3 bg-card px-6 py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <p className="stat-number">{value.toLocaleString('ru-RU')}{suffix}</p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {recommendations.length > 0 && (
        <section className="bg-gradient-to-b from-[hsl(var(--warm-cream)/0.5)] to-transparent">
          <div className="container mx-auto px-4 py-16">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <div className="section-label">
                  <Star className="h-3.5 w-3.5" />
                  Персонально для вас
                </div>
                <h2 className="font-heading text-2xl tracking-tight text-foreground sm:text-3xl">Рекомендуем</h2>
                <p className="mt-1.5 text-muted-foreground">
                  {isAuthenticated ? 'Подборка на основе ваших интересов и избранного' : 'Самые популярные мероприятия'}
                </p>
              </div>
              <Link to="/events" className="hidden items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-primary/80 sm:flex">
                Все мероприятия <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {recommendations.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="container mx-auto px-4 py-10">
        <div className="overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/5 via-card to-card shadow-soft">
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-xl text-foreground">Уведомления о новых мероприятиях</h2>
              <p className="mt-1 max-w-lg text-sm text-muted-foreground">
                Получайте анонсы событий по email раньше всех — не пропускайте ничего интересного.
              </p>
            </div>

            {isAuthenticated ? (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card/80 px-4 py-2.5 shadow-soft">
                <span className="text-sm text-muted-foreground">{notificationsEnabled ? 'Включено' : 'Выключено'}</span>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={(checked) => void toggleSubscription(checked)}
                  disabled={updatingSubscription}
                  aria-label="Подписка на новые мероприятия"
                />
              </div>
            ) : (
              <div className="flex shrink-0 flex-wrap gap-2">
                <Link to="/register?subscribe=1">
                  <Button className="gap-2 shadow-sm shadow-primary/20">Подписаться</Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" className="hover:border-primary/40">Войти</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-[hsl(var(--golden-light)/0.12)] to-primary/5" />
        <div className="container relative mx-auto px-4 py-20 text-center">
          <div className="section-label mx-auto">
            <Sparkles className="h-3.5 w-3.5" />
            Для организаторов
          </div>
          <h2 className="mt-2 font-heading text-3xl tracking-tight text-foreground sm:text-4xl">
            Вы организуете мероприятия?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Создавайте события, управляйте записями участников и привлекайте новую аудиторию на нашей платформе.
          </p>
          <Link to="/register" className="mt-8 inline-block">
            <Button size="lg" className="gap-2 shadow-lg shadow-primary/20 transition-shadow hover:shadow-xl hover:shadow-primary/25">
              Начать бесплатно <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}

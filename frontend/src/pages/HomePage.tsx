import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, MapPin, Sparkles } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [updatingSubscription, setUpdatingSubscription] = useState(false);

  useEffect(() => {
    if (cityLoading) {
      return;
    }

    let active = true;
    setLoading(true);
    const selectedCityId = selectedCity?.id == null ? null : String(selectedCity.id);

    eventService
      .getEvents({
        size: 120,
        cityId: selectedCity?.id || undefined,
        status: 'PUBLISHED',
      })
      .then((response) => {
        if (!active) return;

        if (!selectedCityId) {
          setEvents([]);
          return;
        }

        const filtered = response.content.filter((event) => {
          const eventCityId = event.cityId ?? event.city?.id;
          return eventCityId != null && String(eventCityId) === selectedCityId;
        });

        setEvents(filtered);
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
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
                Находите фестивали, концерты, выставки и мастер-классы в уютных городах России.
                Записывайтесь и делитесь впечатлениями.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link to="/events">
                  <Button size="lg" className="gap-2">
                    Смотреть мероприятия
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                {!isAuthenticated && (
                  <Link to="/register">
                    <Button variant="outline" size="lg">
                      Создать аккаунт
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {upcomingEvent && (
              <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-card">
                  <div className="relative aspect-video overflow-hidden">
                    <img
                      src={imageSrc(upcomingEvent.coverImageId == null ? null : Number(upcomingEvent.coverImageId), '/placeholder-event.svg')}
                      alt={resolveEventTitle(upcomingEvent)}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <span className="mb-1 inline-block rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground">
                        Ближайшее событие
                      </span>
                      <h3 className="font-heading text-xl text-primary-foreground">{resolveEventTitle(upcomingEvent)}</h3>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4">
                    <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4 text-primary" />
                        {formatDate(resolveEventDate(upcomingEvent))}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 text-primary" />
                        {resolveEventCityName(upcomingEvent)}
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
            )}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-16">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="font-heading text-2xl text-foreground sm:text-3xl">Популярные мероприятия</h2>
            <p className="mt-1 text-muted-foreground">Самые интересные события в ближайшее время</p>
          </div>
          <Link
            to="/events"
            className="hidden items-center gap-1 text-sm font-semibold text-primary hover:underline sm:flex"
          >
            Все мероприятия <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {featuredEvents.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Пока нет опубликованных мероприятий</p>
        )}

        <div className="mt-8 text-center sm:hidden">
          <Link to="/events">
            <Button variant="outline" className="gap-1">
              Все мероприятия <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <section className="container mx-auto px-4 py-10">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-2xl text-foreground">Уведомления о новых мероприятиях</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Получайте анонсы новых событий по email и не пропускайте интересные мероприятия.
              </p>
            </div>

            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">{notificationsEnabled ? 'Включено' : 'Выключено'}</span>
                <Switch
                  checked={notificationsEnabled}
                  onCheckedChange={(checked) => void toggleSubscription(checked)}
                  disabled={updatingSubscription}
                  aria-label="Подписка на новые мероприятия"
                />
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Link to="/register?subscribe=1">
                  <Button>Подписаться</Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline">Войти</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-r from-primary/5 via-golden-light/10 to-primary/5">
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="font-heading text-2xl text-foreground sm:text-3xl">Вы организатор мероприятий?</h2>
          <p className="mx-auto mt-2 max-w-md text-muted-foreground">
            Создавайте события, управляйте записями и привлекайте аудиторию на нашей платформе
          </p>
          <Link to="/register" className="mt-6 inline-block">
            <Button size="lg" className="gap-2">
              Начать бесплатно <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>
    </PublicLayout>
  );
}

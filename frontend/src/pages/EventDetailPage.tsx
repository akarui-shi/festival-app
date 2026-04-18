import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  Heart,
  MapPin,
  Share2,
  Star,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { PublicLayout } from '@/layouts/PublicLayout';
import { LoadingState, ErrorState } from '@/components/StateDisplays';
import { StarRating } from '@/components/StarRating';
import { EventLocationMap } from '@/components/EventLocationMap';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { eventService } from '@/services/event-service';
import { sessionService } from '@/services/session-service';
import { reviewService } from '@/services/review-service';
import { registrationService } from '@/services/registration-service';
import { favoriteService } from '@/services/favorite-service';
import type { Event, Id, Review, Session } from '@/types';

function formatDate(value?: string): string {
  if (!value) return 'Дата уточняется';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Дата уточняется';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function formatTime(value?: string): string {
  if (!value) return 'Время уточняется';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Время уточняется';
  }

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  if (hours === '00' && minutes === '00') {
    return 'Время уточняется';
  }

  return `${hours}:${minutes}`;
}

function formatPrice(event: Event): string {
  if (event.free || event.isFree) {
    return 'Бесплатно';
  }

  if (typeof event.minPrice === 'number' && typeof event.maxPrice === 'number') {
    if (event.minPrice === event.maxPrice) {
      return `${event.minPrice.toLocaleString('ru-RU')} ₽`;
    }
    return `${event.minPrice.toLocaleString('ru-RU')} - ${event.maxPrice.toLocaleString('ru-RU')} ₽`;
  }

  if (typeof event.price === 'number') {
    return `${event.price.toLocaleString('ru-RU')} ₽`;
  }

  return 'Цена уточняется';
}

function toShortAddress(address?: string): string {
  if (!address) {
    return '';
  }

  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 2) {
    return parts.join(', ');
  }

  const streetIndex = parts.findIndex((part) => /^(ул\.?|улица|пр-?кт|проспект|пер\.?|переулок|бул\.?|бульвар|наб\.?|набережная|ш\.?|шоссе|пл\.?|площадь|проезд|аллея|д\.)/i.test(part));
  if (streetIndex >= 0) {
    return parts.slice(streetIndex).join(', ');
  }

  return parts.slice(-2).join(', ');
}

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated, isResident } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [registeredSessionIds, setRegisteredSessionIds] = useState<string[]>([]);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    Promise.all([
      eventService.getEventById(id),
      sessionService.getSessionsByEvent(id),
      reviewService.getReviewsByEvent(id),
    ])
      .then(([eventResponse, sessionsResponse, reviewsResponse]) => {
        setEvent(eventResponse);
        setSessions(sessionsResponse);
        setReviews(reviewsResponse);
      })
      .catch(() => setError('Не удалось загрузить мероприятие'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!user || !id) return;

    favoriteService.isFavorite(user.id, id).then(setIsFavorite);
    if (!isResident) {
      setRegisteredSessionIds([]);
      return;
    }

    registrationService.getMyRegistrations(user.id).then((registrations) => {
      setRegisteredSessionIds(
        registrations
          .filter((registration) =>
            String(registration.eventId) === String(id)
            && !['CANCELLED', 'cancelled', 'возвращён', 'RETURNED', 'returned'].includes(String(registration.status || '')),
          )
          .map((registration) => registration.sessionId)
          .filter((sessionId): sessionId is Id => sessionId !== null && sessionId !== undefined)
          .map((sessionId) => String(sessionId)),
      );
    });
  }, [id, user, isResident]);

  const toggleFavorite = async () => {
    if (!user || !id) return;

    if (isFavorite) {
      await favoriteService.removeFavorite(user.id, id);
      setIsFavorite(false);
      toast.success('Удалено из избранного');
      return;
    }

    await favoriteService.addFavorite(user.id, id);
    setIsFavorite(true);
    toast.success('Добавлено в избранное');
  };

  const registerForSession = async (sessionId: Id) => {
    if (!user || !isResident) {
      toast.error('Запись доступна только жителям');
      return;
    }

    try {
      const order = await registrationService.createRegistration(sessionId, user.id);
      if (order.requiresPayment && order.paymentUrl) {
        toast.info('Перенаправляем в платёжный шлюз...');
        window.location.assign(order.paymentUrl);
        return;
      }
      setRegisteredSessionIds((prev) => [...prev, String(sessionId)]);
      toast.success('Вы записаны на сеанс');
    } catch (registrationError: any) {
      toast.error(registrationError?.message || 'Не удалось записаться');
    }
  };

  const submitReview = async () => {
    if (!user || !id || !newRating) return;
    if (!newComment.trim()) {
      toast.error('Добавьте текст комментария');
      return;
    }
    if (!isResident) {
      toast.error('Отзывы могут оставлять только жители');
      return;
    }

    setSubmittingReview(true);
    try {
      const review = await reviewService.createReview({
        userId: user.id,
        eventId: id,
        rating: newRating,
        comment: newComment,
      });
      setReviews((prev) => [review, ...prev]);
      setNewRating(0);
      setNewComment('');
      toast.success('Комментарий отправлен на модерацию');
    } catch (reviewError: any) {
      toast.error(reviewError?.message || 'Не удалось опубликовать отзыв');
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <LoadingState />
      </PublicLayout>
    );
  }

  if (error || !event) {
    return (
      <PublicLayout>
        <ErrorState message={error || 'Мероприятие не найдено'} />
      </PublicLayout>
    );
  }

  const firstAvailableSession = sessions.find((session) => {
    const seatsAvailable = session.availableSeats == null || session.availableSeats > 0;
    const open = session.registrationOpen ?? true;
    return seatsAvailable && open && !registeredSessionIds.includes(String(session.id));
  });
  const organizationId = event.organization?.id ?? event.organizationId;
  const organizationName = event.organization?.name ?? event.organizationName;
  const organizationLink = organizationId ? `/organizations/${organizationId}` : null;
  const canRegisterForEvent = isAuthenticated && isResident;
  const canLeaveReview = isAuthenticated && isResident;
  const primarySession = sessions[0];

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-6">
        <Link
          to="/events"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Все мероприятия
        </Link>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-2xl">
              <img
                src={event.coverUrl || event.imageUrl || '/placeholder.svg'}
                alt={event.title}
                className="aspect-video w-full object-cover"
              />
            </div>

            <div className="mt-6">
              <div className="flex flex-wrap gap-2">
                {(event.categories || []).map((category) => (
                  <Badge key={category.id} variant="secondary">{category.name}</Badge>
                ))}
                <Badge variant="outline">6+</Badge>
                {(event.free || event.isFree) && <Badge className="bg-primary text-primary-foreground">Бесплатно</Badge>}
                {!event.free && !event.isFree && (
                  <Badge className="bg-primary text-primary-foreground">{formatPrice(event)}</Badge>
                )}
              </div>
              <h1 className="mt-3 font-heading text-3xl text-foreground sm:text-4xl">{event.title}</h1>

              <div className="mt-3 flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-golden text-golden" />
                  <span className="text-sm font-semibold text-foreground">
                    {event.averageRating ? event.averageRating.toFixed(1) : '0.0'}
                  </span>
                </div>
                <span className="text-sm text-muted-foreground">{event.reviewsCount || 0} отзывов</span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3 rounded-xl border border-border bg-card p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Организация</p>
                {organizationLink ? (
                  <Link to={organizationLink} className="font-semibold text-foreground hover:text-primary hover:underline">
                    {organizationName || 'Организация мероприятия'}
                  </Link>
                ) : (
                  <p className="font-semibold text-foreground">{organizationName || 'Организация мероприятия'}</p>
                )}
              </div>
            </div>

            <div className="mt-8">
              <h2 className="font-heading text-xl text-foreground">Описание</h2>
              <p className="mt-3 whitespace-pre-line leading-relaxed text-muted-foreground">
                {event.fullDescription || event.description || event.shortDescription || 'Описание скоро появится'}
              </p>
            </div>

            {(event.artists || []).length > 0 && (
              <div className="mt-8">
                <h2 className="font-heading text-xl text-foreground">Артисты</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(event.artists || []).map((artist) => (
                    <Link
                      key={artist.id}
                      to={`/artists/${artist.id}`}
                      className="rounded-full border border-border px-3 py-1 text-sm text-foreground hover:border-primary/40 hover:text-primary"
                    >
                      {artist.stageName || artist.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div id="sessions" className="mt-8">
              <h2 className="font-heading text-xl text-foreground">Сеансы</h2>
              <div className="mt-3 space-y-2">
                {sessions.length === 0 && (
                  <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                    Пока нет запланированных сеансов
                  </p>
                )}

                {sessions.map((session) => {
                  const maxParticipants = session.totalCapacity ?? session.maxParticipants ?? 0;
                  const currentParticipants = session.totalCapacity != null && session.availableSeats != null
                    ? session.totalCapacity - session.availableSeats
                    : 0;
                  const isRegistered = registeredSessionIds.includes(String(session.id));
                  const isFull = session.availableSeats != null ? session.availableSeats <= 0 : currentParticipants >= maxParticipants;
                  const isOpen = session.registrationOpen ?? true;

                  return (
                    <div
                      key={session.id}
                      className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <CalendarDays className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{formatDate(session.startAt)}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatTime(session.startAt)} - {formatTime(session.endAt)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {session.participationType === 'paid'
                              ? `${Number(session.price || 0).toLocaleString('ru-RU')} ${session.currency || 'RUB'}`
                              : 'Бесплатно'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Users className="h-3.5 w-3.5" />
                          {Math.max(maxParticipants - currentParticipants, 0)} мест
                        </span>

                        {canRegisterForEvent ? (
                          isRegistered ? (
                            <Badge className="bg-primary/10 text-primary">Вы записаны</Badge>
                          ) : (
                            <Button size="sm" onClick={() => registerForSession(session.id)} disabled={isFull || !isOpen}>
                              {!isOpen ? 'Регистрация закрыта' : isFull ? 'Мест нет' : 'Записаться'}
                            </Button>
                          )
                        ) : isAuthenticated ? (
                          <span className="text-xs text-muted-foreground">Только для жителей</span>
                        ) : (
                          <Button size="sm" variant="outline" asChild>
                            <Link to="/login">Войти</Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8">
              <h2 className="font-heading text-xl text-foreground">Отзывы</h2>

              {canLeaveReview && (
                <div className="mt-3 rounded-xl border border-border bg-card p-4">
                  <p className="mb-2 text-sm text-muted-foreground">Оцените мероприятие</p>
                  <StarRating rating={newRating} onChange={setNewRating} />
                  <Textarea
                    className="mt-3"
                    rows={3}
                    value={newComment}
                    onChange={(event) => setNewComment(event.target.value)}
                    placeholder="Поделитесь впечатлениями"
                  />
                  <Button className="mt-3" size="sm" onClick={submitReview} disabled={!newRating || !newComment.trim() || submittingReview}>
                    {submittingReview ? 'Отправка…' : 'Отправить отзыв'}
                  </Button>
                </div>
              )}
              {isAuthenticated && !canLeaveReview && (
                <div className="mt-3 rounded-xl border border-border bg-card p-4">
                  <p className="text-sm text-muted-foreground">Отзывы могут оставлять только жители.</p>
                </div>
              )}

              <div className="mt-3 space-y-3">
                {reviews.length === 0 && (
                  <div className="rounded-xl border border-border bg-card p-6 text-center">
                    <Star className="mx-auto h-8 w-8 text-muted-foreground/40" />
                    <p className="mt-2 text-sm text-muted-foreground">Пока нет отзывов</p>
                  </div>
                )}

                {reviews.map((review) => (
                  <div key={review.commentId || review.id} className="rounded-xl border border-border bg-card p-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">
                        {review.userDisplayName || `${review.user?.firstName || ''} ${review.user?.lastName || ''}`.trim() || 'Пользователь'}
                      </p>
                      <StarRating rating={review.rating} size="sm" />
                    </div>
                    <p className="text-sm text-muted-foreground">{review.text || review.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
                <p className="text-2xl font-bold text-foreground">{formatPrice(event)}</p>

                {canRegisterForEvent ? (
                  <Button
                    className="mt-4 w-full gap-2"
                    size="lg"
                    onClick={() => {
                      if (firstAvailableSession) {
                        registerForSession(firstAvailableSession.id);
                        return;
                      }

                      document.getElementById('sessions')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    disabled={!firstAvailableSession && sessions.length > 0}
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    {firstAvailableSession ? 'Записаться' : sessions.length > 0 ? 'Мест нет' : 'Выбрать сеанс'}
                  </Button>
                ) : isAuthenticated ? (
                  <Button className="mt-4 w-full gap-2" size="lg" variant="outline" disabled>
                    <CheckCircle2 className="h-5 w-5" />
                    Запись доступна только жителям
                  </Button>
                ) : (
                  <Button className="mt-4 w-full gap-2" size="lg" asChild>
                    <Link to="/login">
                      <CheckCircle2 className="h-5 w-5" />
                      Войти для записи
                    </Link>
                  </Button>
                )}

                <div className="mt-4 flex gap-2">
                  {isAuthenticated && (
                    <Button variant="outline" className="flex-1 gap-1.5" onClick={toggleFavorite}>
                      <Heart className={`h-4 w-4 ${isFavorite ? 'fill-primary text-primary' : ''}`} />
                      В избранное
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="icon"
                    aria-label="Скопировать ссылку на мероприятие"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      toast.success('Ссылка скопирована');
                    }}
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="mb-4 font-heading text-lg text-foreground">Информация</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CalendarDays className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">{formatDate(primarySession?.startAt)}</p>
                      <p className="text-xs text-muted-foreground">до {formatDate(primarySession?.endAt)}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-4 w-4 text-primary" />
                    <p className="text-sm text-foreground">Начало в {formatTime(primarySession?.startAt)}</p>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {toShortAddress(event.venue?.address) || event.venue?.name || 'Адрес уточняется'}
                      </p>
                      {event.venue?.name && event.venue?.address && (
                        <p className="mt-1 text-xs text-muted-foreground">{event.venue.name}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <EventLocationMap
                title={event.venue?.name || event.title}
                address={event.venue?.address}
                latitude={event.venue?.latitude}
                longitude={event.venue?.longitude}
              />
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

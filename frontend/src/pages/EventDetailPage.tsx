import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  MapPin,
  Share2,
  Star,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { PublicLayout } from '@/layouts/PublicLayout';
import { imageSrc } from '@/lib/image';
import { LoadingState, ErrorState } from '@/components/StateDisplays';
import { StarRating } from '@/components/StarRating';
import { EventLocationMap } from '@/components/EventLocationMap';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { eventService } from '@/services/event-service';
import { sessionService } from '@/services/session-service';
import { reviewService } from '@/services/review-service';
import { registrationService } from '@/services/registration-service';
import { favoriteService } from '@/services/favorite-service';
import type { Event, Id, Review, Session, SessionTicketType } from '@/types';
import type { RegistrationItemInput } from '@/services/registration-service';

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
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [ticketTypesBySession, setTicketTypesBySession] = useState<Record<string, SessionTicketType[]>>({});
  const [ticketDialogSessionId, setTicketDialogSessionId] = useState<string | null>(null);
  const [selectedTicketQuantities, setSelectedTicketQuantities] = useState<Record<string, number>>({});
  const [registeringSessionId, setRegisteringSessionId] = useState<string | null>(null);

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
        setSelectedSessionId(sessionsResponse.length > 0 ? String(sessionsResponse[0].id) : null);
        setTicketTypesBySession({});
        setTicketDialogSessionId(null);
        setSelectedTicketQuantities({});
        setActiveImageIndex(0);
        setReviews(reviewsResponse);
      })
      .catch(() => setError('Не удалось загрузить мероприятие'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!selectedSessionId || sessions.some((session) => String(session.id) === selectedSessionId)) {
      return;
    }
    setSelectedSessionId(sessions.length > 0 ? String(sessions[0].id) : null);
  }, [sessions, selectedSessionId]);

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

  const registerForSession = async (sessionId: Id, items?: RegistrationItemInput[]) => {
    if (!user || !isResident) {
      toast.error('Запись доступна только жителям');
      return;
    }

    try {
      setRegisteringSessionId(String(sessionId));
      const order = await registrationService.createRegistration(sessionId, user.id, 'yookassa', items);
      if (order.requiresPayment && order.paymentUrl) {
        toast.info('Перенаправляем в платёжный шлюз...');
        window.location.assign(order.paymentUrl);
        return;
      }
      setRegisteredSessionIds((prev) => [...prev, String(sessionId)]);
      toast.success('Вы записаны на сеанс');
    } catch (registrationError: any) {
      toast.error(registrationError?.message || 'Не удалось записаться');
    } finally {
      setRegisteringSessionId(null);
    }
  };

  const loadTicketTypes = async (sessionId: Id): Promise<SessionTicketType[]> => {
    const key = String(sessionId);
    if (ticketTypesBySession[key]) {
      return ticketTypesBySession[key];
    }

    const types = await sessionService.getTicketTypes(sessionId);
    setTicketTypesBySession((prev) => ({ ...prev, [key]: types }));
    return types;
  };

  const openRegistrationForSession = async (session: Session) => {
    if (!user || !isResident) {
      toast.error('Запись доступна только жителям');
      return;
    }

    const isRegistered = registeredSessionIds.includes(String(session.id));
    if (isRegistered) {
      toast.info('Вы уже записаны на этот сеанс');
      return;
    }

    const seatsAvailable = session.availableSeats == null || session.availableSeats > 0;
    const isOpen = session.registrationOpen ?? true;
    if (!seatsAvailable || !isOpen) {
      toast.error('Регистрация на сеанс недоступна');
      return;
    }

    try {
      const types = await loadTicketTypes(session.id);
      const openTypes = types.filter((type) => type.registrationOpen ?? true);
      if (openTypes.length === 0) {
        await registerForSession(session.id);
        return;
      }

      setTicketDialogSessionId(String(session.id));
      const initialQuantities: Record<string, number> = {};
      openTypes.forEach((type, index) => {
        initialQuantities[String(type.id)] = index === 0 ? 1 : 0;
      });
      setSelectedTicketQuantities(initialQuantities);
    } catch (e: any) {
      toast.error(e?.message || 'Не удалось загрузить типы билетов');
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
  const selectedSession = sessions.find((session) => String(session.id) === selectedSessionId) || primarySession;

  const eventImageItems = (event.eventImages || [])
    .filter((image) => image?.imageId != null)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((image) => imageSrc(image.imageId == null ? null : Number(image.imageId)));
  const galleryImages = eventImageItems.length > 0
    ? eventImageItems
    : [imageSrc(event.coverImageId == null ? null : Number(event.coverImageId))];
  const currentImage = galleryImages[activeImageIndex] || galleryImages[0];

  const selectedSessionAddress = selectedSession?.venueAddress || selectedSession?.venue?.address || '';
  const selectedSessionVenueName = selectedSession?.venueName || selectedSession?.venue?.name || event.title;
  const selectedSessionLatitude = selectedSession?.latitude ?? selectedSession?.venue?.latitude;
  const selectedSessionLongitude = selectedSession?.longitude ?? selectedSession?.venue?.longitude;
  const ticketDialogSession = sessions.find((session) => String(session.id) === ticketDialogSessionId) || null;
  const ticketDialogTypes = ticketDialogSessionId
    ? (ticketTypesBySession[ticketDialogSessionId] || []).filter((type) => type.registrationOpen ?? true)
    : [];
  const ticketSelectionItems = ticketDialogTypes
    .map((type) => {
      const quantity = Math.max(0, Number(selectedTicketQuantities[String(type.id)] || 0));
      const available = Math.max(0, Number(type.availableQuota ?? 0));
      return {
        ticketTypeId: type.id,
        quantity: Math.min(quantity, available),
      };
    })
    .filter((item) => item.quantity > 0);
  const ticketSelectionTotal = ticketSelectionItems.reduce((sum, item) => sum + item.quantity, 0);
  const ticketSelectionTotalAmount = ticketSelectionItems.reduce((sum, item) => {
    const selectedType = ticketDialogTypes.find((ticketType) => String(ticketType.id) === String(item.ticketTypeId));
    const price = Number(selectedType?.price ?? 0);
    if (!Number.isFinite(price) || price <= 0) {
      return sum;
    }
    return sum + price * item.quantity;
  }, 0);
  const ticketSelectionCurrencyCandidates = Array.from(new Set(
    ticketSelectionItems
      .map((item) => ticketDialogTypes.find((ticketType) => String(ticketType.id) === String(item.ticketTypeId))?.currency)
      .filter((currency): currency is string => Boolean(currency)),
  ));
  const ticketSelectionCurrency = ticketSelectionCurrencyCandidates.length === 1
    ? ticketSelectionCurrencyCandidates[0]
    : 'RUB';

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
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
              <img
                src={currentImage}
                alt={event.title}
                className="aspect-video w-full object-cover"
              />
              {galleryImages.length > 1 && (
                <>
                  <button
                    type="button"
                    className="absolute left-6 top-[50%] z-10 -translate-y-1/2 rounded-full border border-border bg-card/90 p-2"
                    onClick={() => setActiveImageIndex((prev) => (prev - 1 + galleryImages.length) % galleryImages.length)}
                    aria-label="Предыдущее изображение"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="absolute right-6 top-[50%] z-10 -translate-y-1/2 rounded-full border border-border bg-card/90 p-2"
                    onClick={() => setActiveImageIndex((prev) => (prev + 1) % galleryImages.length)}
                    aria-label="Следующее изображение"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
            {galleryImages.length > 1 && (
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {galleryImages.map((image, index) => (
                  <button
                    type="button"
                    key={`${image}-${index}`}
                    onClick={() => setActiveImageIndex(index)}
                    className={`h-16 w-24 shrink-0 overflow-hidden rounded-md border ${index === activeImageIndex ? 'border-primary' : 'border-border'}`}
                  >
                    <img src={image} alt={`Изображение ${index + 1}`} className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

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
                  const isSelected = String(session.id) === String(selectedSession?.id);

                  return (
                    <div
                      key={session.id}
                      className={`flex items-center justify-between rounded-xl border bg-card p-4 ${isSelected ? 'border-primary' : 'border-border'}`}
                      onClick={() => setSelectedSessionId(String(session.id))}
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
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                void openRegistrationForSession(session);
                              }}
                              disabled={isFull || !isOpen || registeringSessionId === String(session.id)}
                            >
                              {registeringSessionId === String(session.id)
                                ? 'Оформляем...'
                                : !isOpen ? 'Регистрация закрыта' : isFull ? 'Мест нет' : 'Записаться'}
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
                        void openRegistrationForSession(firstAvailableSession);
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
                      <p className="text-sm font-semibold text-foreground">{formatDate(selectedSession?.startAt)}</p>
                      <p className="text-xs text-muted-foreground">до {formatDate(selectedSession?.endAt)}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-4 w-4 text-primary" />
                    <p className="text-sm text-foreground">Начало в {formatTime(selectedSession?.startAt)}</p>
                  </div>

                  <div className="flex items-start gap-3">
                    <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {toShortAddress(selectedSessionAddress) || selectedSessionVenueName || 'Адрес уточняется'}
                      </p>
                      {selectedSessionAddress && (
                        <p className="mt-1 text-xs text-muted-foreground">{selectedSessionVenueName}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <EventLocationMap
                title={selectedSessionVenueName}
                address={selectedSessionAddress}
                latitude={selectedSessionLatitude ?? undefined}
                longitude={selectedSessionLongitude ?? undefined}
              />
            </div>
          </div>
        </div>
      </div>

      <Dialog open={Boolean(ticketDialogSessionId)} onOpenChange={(open) => {
        if (!open) {
          setTicketDialogSessionId(null);
          setSelectedTicketQuantities({});
        }
      }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Выберите билеты</DialogTitle>
            <DialogDescription>
              {ticketDialogSession
                ? `Сеанс ${formatDate(ticketDialogSession.startAt)} ${formatTime(ticketDialogSession.startAt)}`
                : 'Выберите подходящие билеты для регистрации'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {ticketDialogTypes.map((ticketType) => {
              const key = String(ticketType.id);
              const maxAvailable = Math.max(0, Number(ticketType.availableQuota ?? 0));
              const currentQuantity = Math.min(
                Math.max(0, Number(selectedTicketQuantities[key] ?? 0)),
                maxAvailable,
              );

              return (
                <div key={ticketType.id} className="rounded-lg border border-border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{ticketType.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {Number(ticketType.price || 0).toLocaleString('ru-RU')} {ticketType.currency || 'RUB'}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Доступно: {maxAvailable}</p>
                    </div>
                    <div className="w-28">
                      <Input
                        type="number"
                        min={0}
                        max={maxAvailable}
                        value={currentQuantity}
                        onChange={(event) => {
                          const raw = Number(event.target.value);
                          const nextValue = Number.isFinite(raw)
                            ? Math.min(Math.max(0, Math.floor(raw)), maxAvailable)
                            : 0;
                          setSelectedTicketQuantities((prev) => ({
                            ...prev,
                            [key]: nextValue,
                          }));
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="rounded-lg border border-border/70 bg-muted/30 p-3">
              <p className="text-sm text-muted-foreground">Всего билетов: {ticketSelectionTotal}</p>
              <p className="mt-1 text-base font-semibold text-foreground">
                Сумма заказа: {ticketSelectionTotalAmount.toLocaleString('ru-RU')} {ticketSelectionCurrency}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setTicketDialogSessionId(null);
              setSelectedTicketQuantities({});
            }}
            >
              Отмена
            </Button>
            <Button
              disabled={!ticketDialogSession || ticketSelectionTotal <= 0 || registeringSessionId === String(ticketDialogSession?.id)}
              onClick={async () => {
                if (!ticketDialogSession || ticketSelectionTotal <= 0) return;
                await registerForSession(ticketDialogSession.id, ticketSelectionItems);
                setTicketDialogSessionId(null);
                setSelectedTicketQuantities({});
              }}
            >
              Продолжить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PublicLayout>
  );
}

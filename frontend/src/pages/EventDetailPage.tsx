import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { EventCard } from '@/components/EventCard';
import { StarRating } from '@/components/StarRating';
import { LoadingState, ErrorState, EmptyState } from '@/components/StateDisplays';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { eventService } from '@/services/event-service';
import { sessionService } from '@/services/session-service';
import { reviewService } from '@/services/review-service';
import { registrationService } from '@/services/registration-service';
import { favoriteService } from '@/services/favorite-service';
import { useAuth } from '@/contexts/AuthContext';
import type { Event, Session, Review } from '@/types';
import { MapPin, Calendar, Clock, Users, Heart, Share2, Tag, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [recommendations, setRecommendations] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFav, setIsFav] = useState(false);
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
      eventService.getRecommendations(),
    ]).then(([ev, sess, revs, recs]) => {
      setEvent(ev);
      setSessions(sess);
      setReviews(revs);
      setRecommendations(recs.filter(e => e.id !== id).slice(0, 3));
      setLoading(false);
    }).catch(() => { setError('Не удалось загрузить мероприятие'); setLoading(false); });
  }, [id]);

  useEffect(() => {
    if (user && id) {
      favoriteService.isFavorite(user.id, id).then(setIsFav);
      registrationService.getMyRegistrations(user.id).then(regs => {
        setRegisteredSessionIds(regs.filter(r => r.eventId === id).map(r => r.sessionId));
      });
    }
  }, [user, id]);

  const toggleFavorite = async () => {
    if (!user || !id) return;
    if (isFav) { await favoriteService.removeFavorite(user.id, id); setIsFav(false); toast.success('Удалено из избранного'); }
    else { await favoriteService.addFavorite(user.id, id); setIsFav(true); toast.success('Добавлено в избранное'); }
  };

  const registerForSession = async (sessionId: string) => {
    if (!user) return;
    try {
      await registrationService.createRegistration(sessionId, user.id);
      setRegisteredSessionIds(prev => [...prev, sessionId]);
      toast.success('Вы записаны на сеанс!');
    } catch (e: any) { toast.error(e.message); }
  };

  const submitReview = async () => {
    if (!user || !id || !newRating) return;
    setSubmittingReview(true);
    try {
      const review = await reviewService.createReview({ userId: user.id, eventId: id, rating: newRating, comment: newComment });
      setReviews(prev => [review, ...prev]);
      setNewRating(0); setNewComment('');
      toast.success('Отзыв опубликован');
    } catch (e: any) { toast.error(e.message); }
    setSubmittingReview(false);
  };

  if (loading) return <PublicLayout><LoadingState /></PublicLayout>;
  if (error || !event) return <PublicLayout><ErrorState message={error || 'Не найдено'} /></PublicLayout>;

  const formatDate = (d: string) => { try { return format(new Date(d), 'd MMMM yyyy', { locale: ru }); } catch { return d; } };

  return (
    <PublicLayout>
      {/* Hero */}
      <div className="relative bg-gradient-to-br from-primary/10 via-accent/5 to-background">
        <div className="container py-10 md:py-16">
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="secondary">{event.category?.icon} {event.category?.name}</Badge>
            {event.format !== 'OFFLINE' && <Badge variant="outline">{event.format === 'ONLINE' ? 'Онлайн' : 'Гибрид'}</Badge>}
            {event.isFree ? <Badge className="bg-success text-success-foreground border-0">Бесплатно</Badge> : event.price && <Badge>{event.price} ₽</Badge>}
          </div>
          <h1 className="font-heading text-3xl md:text-5xl font-bold mb-4 max-w-3xl">{event.title}</h1>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-6">
            <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{formatDate(event.startDate)} — {formatDate(event.endDate)}</span>
            <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{event.venue?.name}, {event.city?.name}</span>
            {event.averageRating && event.averageRating > 0 && (
              <span className="flex items-center gap-1.5"><StarRating rating={Math.round(event.averageRating)} size="sm" />{event.averageRating.toFixed(1)} ({event.reviewsCount})</span>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            {isAuthenticated && (
              <Button variant="outline" onClick={toggleFavorite}>
                <Heart className={`h-4 w-4 mr-1.5 ${isFav ? 'fill-accent text-accent' : ''}`} />
                {isFav ? 'В избранном' : 'В избранное'}
              </Button>
            )}
            <Button variant="ghost" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success('Ссылка скопирована'); }}>
              <Share2 className="h-4 w-4 mr-1.5" />Поделиться
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-10">
            {/* Description */}
            <section>
              <h2 className="font-heading text-xl font-bold mb-4">О мероприятии</h2>
              <div className="prose prose-sm max-w-none text-foreground whitespace-pre-line">{event.description}</div>
              {event.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {event.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                      <Tag className="h-3 w-3" />{tag}
                    </span>
                  ))}
                </div>
              )}
            </section>

            {/* Sessions */}
            <section>
              <h2 className="font-heading text-xl font-bold mb-4">Сеансы</h2>
              {sessions.length === 0 ? <p className="text-sm text-muted-foreground">Нет запланированных сеансов</p> : (
                <div className="space-y-3">
                  {sessions.map(s => {
                    const isRegistered = registeredSessionIds.includes(s.id);
                    const isFull = s.currentParticipants >= s.maxParticipants;
                    return (
                      <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card">
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-muted-foreground" />{s.date}</span>
                          <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-muted-foreground" />{s.startTime} — {s.endTime}</span>
                          <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-muted-foreground" />{s.currentParticipants}/{s.maxParticipants}</span>
                        </div>
                        {isAuthenticated ? (
                          isRegistered ? (
                            <Badge className="bg-success/10 text-success border-success/20 w-fit"><Check className="h-3.5 w-3.5 mr-1" />Вы записаны</Badge>
                          ) : (
                            <Button size="sm" disabled={isFull} onClick={() => registerForSession(s.id)}>
                              {isFull ? 'Мест нет' : 'Записаться'}
                            </Button>
                          )
                        ) : (
                          <Button size="sm" variant="outline" asChild><Link to="/login">Войдите для записи</Link></Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Reviews */}
            <section>
              <h2 className="font-heading text-xl font-bold mb-4">Отзывы ({reviews.length})</h2>

              {isAuthenticated && (
                <div className="p-4 rounded-xl border border-border bg-card mb-6">
                  <h3 className="text-sm font-medium mb-3">Оставить отзыв</h3>
                  <StarRating rating={newRating} onChange={setNewRating} />
                  <Textarea placeholder="Ваш комментарий..." value={newComment} onChange={e => setNewComment(e.target.value)} className="mt-3" rows={3} />
                  <Button size="sm" className="mt-3" onClick={submitReview} disabled={!newRating || submittingReview}>
                    {submittingReview ? 'Отправка...' : 'Отправить'}
                  </Button>
                </div>
              )}

              {reviews.length === 0 ? <p className="text-sm text-muted-foreground">Пока нет отзывов. Будьте первым!</p> : (
                <div className="space-y-4">
                  {reviews.map(r => (
                    <div key={r.id} className="p-4 rounded-xl border border-border bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                            {r.user?.firstName?.[0]}{r.user?.lastName?.[0]}
                          </div>
                          <span className="text-sm font-medium">{r.user?.firstName} {r.user?.lastName}</span>
                        </div>
                        <StarRating rating={r.rating} size="sm" />
                      </div>
                      <p className="text-sm text-muted-foreground">{r.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="p-5 rounded-xl border border-border bg-card sticky top-20">
              <h3 className="font-heading text-lg font-bold mb-4">Информация</h3>
              <dl className="space-y-3 text-sm">
                <div><dt className="text-muted-foreground">Даты</dt><dd className="font-medium">{formatDate(event.startDate)} — {formatDate(event.endDate)}</dd></div>
                <div><dt className="text-muted-foreground">Площадка</dt><dd className="font-medium">{event.venue?.name}</dd></div>
                <div><dt className="text-muted-foreground">Адрес</dt><dd className="font-medium">{event.venue?.address}</dd></div>
                <div><dt className="text-muted-foreground">Город</dt><dd className="font-medium">{event.city?.name}</dd></div>
                <div><dt className="text-muted-foreground">Формат</dt><dd className="font-medium">{event.format === 'OFFLINE' ? 'Офлайн' : event.format === 'ONLINE' ? 'Онлайн' : 'Гибрид'}</dd></div>
                <div><dt className="text-muted-foreground">Стоимость</dt><dd className="font-medium">{event.isFree ? 'Бесплатно' : `${event.price} ₽`}</dd></div>
              </dl>
              {sessions.length > 0 && (
                <Button className="w-full mt-5" onClick={() => document.querySelector('#sessions')?.scrollIntoView({ behavior: 'smooth' })}>
                  Выбрать сеанс
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <section className="mt-16">
            <h2 className="font-heading text-2xl font-bold mb-6">Похожие мероприятия</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {recommendations.map(e => <EventCard key={e.id} event={e} />)}
            </div>
          </section>
        )}
      </div>
    </PublicLayout>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Loader from '../components/Loader';
import AlertMessage from '../components/AlertMessage';
import EmptyState from '../components/EmptyState';
import SessionCard from '../components/SessionCard';
import RegistrationFormModal from '../components/RegistrationFormModal';
import QRCodeDisplay from '../components/QRCodeDisplay';
import VenueMap from '../components/VenueMap';
import { eventService } from '../services/eventService';
import { favoriteService } from '../services/favoriteService';
import { sessionService } from '../services/sessionService';
import { registrationService } from '../services/registrationService';
import { reviewService } from '../services/reviewService';
import { useAuth } from '../context/AuthContext';
import { ROLE } from '../utils/roles';
import { formatDateTime, formatRelativeSessionDate, formatSessionDayLabel } from '../utils/formatters';
import { toUserErrorMessage } from '../utils/errorMessages';

const EventDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, hasRole } = useAuth();

  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState('');

  const [reviews, setReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState('');
  const [reviewForm, setReviewForm] = useState({ rating: '5', text: '' });
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');

  const [registrationSession, setRegistrationSession] = useState(null);
  const [registrationError, setRegistrationError] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState('');
  const [registrationResult, setRegistrationResult] = useState(null);
  const [isRegistrationSubmitting, setIsRegistrationSubmitting] = useState(false);

  const [favoriteNotice, setFavoriteNotice] = useState(null);
  const [selectedGalleryIndex, setSelectedGalleryIndex] = useState(0);
  const isAdmin = hasRole([ROLE.ADMIN]);
  const canRegisterSessions = isAuthenticated && !isAdmin;

  const loadSessions = useCallback(async () => {
    try {
      setSessionsLoading(true);
      setSessionsError('');
      const data = await sessionService.getSessions({ eventId: id });
      setSessions(Array.isArray(data) ? data : []);
    } catch (err) {
      setSessionsError(toUserErrorMessage(err, 'Не удалось загрузить сеансы.'));
    } finally {
      setSessionsLoading(false);
    }
  }, [id]);

  const loadReviews = useCallback(async () => {
    try {
      setReviewsLoading(true);
      setReviewsError('');
      const data = await reviewService.getReviewsByEvent(id);
      setReviews(Array.isArray(data) ? data : []);
    } catch (err) {
      setReviewsError(toUserErrorMessage(err, 'Не удалось загрузить отзывы.'));
    } finally {
      setReviewsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await eventService.getEventById(id);
        setEvent(data);
      } catch (err) {
        setError(toUserErrorMessage(err, 'Не удалось загрузить детали мероприятия.'));
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [id]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const onAddFavorite = async () => {
    try {
      setFavoriteNotice(null);
      await favoriteService.addFavorite(event.id);
      setFavoriteNotice({ type: 'success', message: 'Добавлено в избранное.' });
    } catch (err) {
      setFavoriteNotice({ type: 'error', message: toUserErrorMessage(err, 'Не удалось добавить в избранное.') });
    }
  };

  const onOpenRegistration = (session) => {
    setRegistrationError('');
    setRegistrationSuccess('');
    setRegistrationResult(null);
    setFavoriteNotice(null);

    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/events/${id}` } });
      return;
    }

    if (isAdmin) {
      setRegistrationError('Администратор не может регистрироваться на мероприятия.');
      return;
    }

    setRegistrationSession(session);
  };

  const onCloseRegistration = () => {
    if (isRegistrationSubmitting) {
      return;
    }
    setRegistrationSession(null);
    setRegistrationError('');
  };

  const onSubmitRegistration = async ({ sessionId, quantity }) => {
    try {
      setIsRegistrationSubmitting(true);
      setRegistrationError('');
      const response = await registrationService.createRegistration(sessionId, quantity);
      setRegistrationResult(response);
      setRegistrationSuccess('Вы успешно записаны на сеанс.');
      setRegistrationSession(null);
      await loadSessions();
    } catch (err) {
      setRegistrationError(toUserErrorMessage(err, 'Не удалось записаться на сеанс.'));
    } finally {
      setIsRegistrationSubmitting(false);
    }
  };

  const onSubmitReview = async (submitEvent) => {
    submitEvent.preventDefault();

    try {
      setIsReviewSubmitting(true);
      setReviewsError('');
      setReviewMessage('');
      await reviewService.createReview({
        eventId: Number(id),
        rating: Number(reviewForm.rating),
        text: reviewForm.text.trim() || null
      });
      setReviewForm({ rating: '5', text: '' });
      setReviewMessage('Спасибо! Ваш отзыв опубликован.');
      await loadReviews();
    } catch (err) {
      setReviewsError(toUserErrorMessage(err, 'Не удалось отправить отзыв.'));
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const averageRating =
    reviews.length > 0
      ? (reviews.reduce((sum, item) => sum + Number(item.rating || 0), 0) / reviews.length).toFixed(1)
      : null;

  const galleryImages = useMemo(() => {
    const fromApi = Array.isArray(event?.eventImages)
      ? [...event.eventImages]
          .filter((image) => image && image.imageUrl)
          .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0))
          .map((image) => image.imageUrl)
      : [];

    if (fromApi.length > 0) {
      return fromApi;
    }

    if (event?.coverUrl) {
      return [event.coverUrl];
    }

    return [];
  }, [event]);

  const groupedSessions = useMemo(() => {
    if (!Array.isArray(sessions) || sessions.length === 0) {
      return [];
    }

    const sortedSessions = [...sessions].sort((left, right) => {
      const leftTs = new Date(left.startAt).getTime();
      const rightTs = new Date(right.startAt).getTime();
      return leftTs - rightTs;
    });

    const groups = new Map();

    sortedSessions.forEach((session) => {
      const dateKey = session.startAt ? String(session.startAt).slice(0, 10) : `unknown-${session.id}`;

      if (!groups.has(dateKey)) {
        groups.set(dateKey, {
          key: dateKey,
          dayLabel: formatSessionDayLabel(session.startAt),
          relativeLabel: formatRelativeSessionDate(session.startAt),
          items: []
        });
      }

      groups.get(dateKey).items.push(session);
    });

    return Array.from(groups.values());
  }, [sessions]);

  useEffect(() => {
    setSelectedGalleryIndex(0);
  }, [id, galleryImages.length]);

  const venue = event?.venue || null;
  const fallbackCoverUrl = '/event-placeholder.svg';
  const venueLatitude = venue ? Number(venue.latitude) : NaN;
  const venueLongitude = venue ? Number(venue.longitude) : NaN;
  const hasVenueCoordinates = Number.isFinite(venueLatitude) && Number.isFinite(venueLongitude);
  const ageLabel = Number.isFinite(Number(event?.ageRating))
    ? `${Number(event.ageRating)}+`
    : 'не указано';

  if (isLoading) return <section className="container page"><Loader text="Загружаем мероприятие..." /></section>;
  if (error) return <section className="container page"><AlertMessage type="error" message={error} onClose={() => setError('')} /></section>;
  if (!event) return null;

  return (
    <section className="container page event-details-page">
      <div className="panel event-details-hero">
        <p className="event-details-hero__eyebrow">Мероприятие</p>
        <h1>{event.title}</h1>
        <p className="page-subtitle event-details-hero__subtitle">
          {event.shortDescription || 'Краткое описание пока не добавлено.'}
        </p>

        <div className="event-details-hero__meta">
          <span className="chip">Возраст: {ageLabel}</span>
          <span className="chip">Площадка: {venue?.name || 'Не указана'}</span>
          <span className="chip">Адрес: {venue?.address || 'Не указан'}</span>
        </div>

        {event.organization?.id ? (
          <Link
            to={`/organizations/${event.organization.id}?excludeEventId=${event.id}`}
            className="btn btn--ghost event-details-hero__organization-link"
          >
            Организация: {event.organization?.name || '-'}
          </Link>
        ) : (
          <p className="muted">Организация не указана</p>
        )}
      </div>

      {galleryImages.length === 1 && (
        <img
          src={galleryImages[0]}
          alt={event.title}
          className="details-cover"
          onError={(eventTarget) => {
            eventTarget.currentTarget.onerror = null;
            eventTarget.currentTarget.src = fallbackCoverUrl;
          }}
        />
      )}

      {galleryImages.length > 1 && (
        <div className="panel event-gallery">
          <img
            src={galleryImages[selectedGalleryIndex] || galleryImages[0]}
            alt={`${event.title} — фото ${selectedGalleryIndex + 1}`}
            className="event-gallery__main"
            onError={(eventTarget) => {
              eventTarget.currentTarget.onerror = null;
              eventTarget.currentTarget.src = fallbackCoverUrl;
            }}
          />
          <div className="event-gallery__thumbs">
            {galleryImages.map((imageUrl, index) => (
              <button
                key={`${imageUrl}-${index}`}
                type="button"
                className={`event-gallery__thumb ${index === selectedGalleryIndex ? 'event-gallery__thumb--active' : ''}`}
                onClick={() => setSelectedGalleryIndex(index)}
              >
                <img
                  src={imageUrl}
                  alt={`Миниатюра ${index + 1}`}
                  onError={(eventTarget) => {
                    eventTarget.currentTarget.onerror = null;
                    eventTarget.currentTarget.src = fallbackCoverUrl;
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {galleryImages.length === 0 && (
        <img src={fallbackCoverUrl} alt={event.title} className="details-cover" />
      )}

      <div className="panel">
        <h2>Описание</h2>
        <p>{event.fullDescription || 'Полное описание пока не добавлено.'}</p>
      </div>

      <div className="panel">
        <h2>Категории</h2>
        <div className="chips">
          {(event.categories || []).map((category) => (
            <span key={category.id} className="chip">{category.name}</span>
          ))}
          {(event.categories || []).length === 0 && <span>-</span>}
        </div>
      </div>

      <div className="panel">
        <h2>Место проведения</h2>
        {venue ? (
          <ul className="details-list">
            <li><strong>Площадка:</strong> {venue.name}</li>
            <li><strong>Адрес:</strong> {venue.address || 'Не указан'}</li>
            <li><strong>Город:</strong> {venue.cityName || 'Не указан'}</li>
          </ul>
        ) : (
          <p>Площадка пока не указана.</p>
        )}
      </div>

      <div className="panel">
        <h2>Карта площадки</h2>

        {venue && (
          <>
            <div className="venue-map__meta">
              <p>
                <strong>Площадка:</strong> {venue.name || '-'}
              </p>
              <p>
                <strong>Адрес:</strong> {venue.address || 'Адрес не указан'}
              </p>
            </div>

            {hasVenueCoordinates ? (
              <VenueMap
                venueName={venue.name || 'Площадка'}
                address={venue.address}
                latitude={venueLatitude}
                longitude={venueLongitude}
              />
            ) : (
              <p className="muted">Координаты площадки пока не указаны.</p>
            )}
          </>
        )}

        {!venue && (
          <p className="muted">Координаты площадки пока не указаны.</p>
        )}
      </div>

      <div className="panel">
        <h2>Сеансы</h2>

        {registrationSuccess && (
          <AlertMessage
            type="success"
            message={registrationSuccess}
            autoHideMs={3200}
            onClose={() => setRegistrationSuccess('')}
          />
        )}
        {registrationResult?.qrToken && (
          <QRCodeDisplay token={registrationResult.qrToken} label="QR-код для посещения" />
        )}
        {sessionsLoading && <Loader text="Загружаем сеансы..." />}
        {!sessionsLoading && sessionsError && (
          <AlertMessage type="error" message={sessionsError} onClose={() => setSessionsError('')} />
        )}
        {!sessionsLoading && !sessionsError && sessions.length === 0 && (
          <EmptyState message="Сеансы пока не добавлены." />
        )}

        {!sessionsLoading && !sessionsError && sessions.length > 0 && (
          <div className="session-timeline">
            {groupedSessions.map((group) => (
              <div className="session-day-group" key={group.key}>
                <div className="session-day-group__header">
                  <strong>{group.dayLabel}</strong>
                  {group.relativeLabel && <span>{group.relativeLabel}</span>}
                </div>
                <div className="session-list">
                  {group.items.map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      onRegisterClick={canRegisterSessions ? onOpenRegistration : null}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <h2>Отзывы</h2>
        <p className="page-subtitle">
          Средняя оценка: <strong>{averageRating || '-'}</strong> ({reviews.length})
        </p>

        {reviewsLoading && <Loader text="Загружаем отзывы..." />}
        {!reviewsLoading && reviewsError && (
          <AlertMessage type="error" message={reviewsError} onClose={() => setReviewsError('')} />
        )}
        {!reviewsLoading && !reviewsError && reviews.length === 0 && (
          <EmptyState message="Пока нет опубликованных отзывов." />
        )}

        {!reviewsLoading && !reviewsError && reviews.length > 0 && (
          <div className="reviews-list">
            {reviews.map((review) => (
              <article key={review.reviewId} className="review-item">
                <div className="review-item__head">
                  <strong>{review.userDisplayName || `Пользователь #${review.userId}`}</strong>
                  <span>Оценка: {review.rating}/5</span>
                </div>
                <p>{review.text || 'Текст отзыва не указан.'}</p>
                <small>{formatDateTime(review.createdAt)}</small>
              </article>
            ))}
          </div>
        )}

        {isAuthenticated ? (
          <form className="form review-form" onSubmit={onSubmitReview}>
            <label>
              Оценка
              <select
                value={reviewForm.rating}
                onChange={(event) => setReviewForm((prev) => ({ ...prev, rating: event.target.value }))}
                required
              >
                <option value="5">5</option>
                <option value="4">4</option>
                <option value="3">3</option>
                <option value="2">2</option>
                <option value="1">1</option>
              </select>
            </label>

            <label>
              Отзыв
              <textarea
                rows={3}
                value={reviewForm.text}
                onChange={(event) => setReviewForm((prev) => ({ ...prev, text: event.target.value }))}
                placeholder="Поделитесь впечатлениями"
              />
            </label>

            <button className="btn btn--primary" type="submit" disabled={isReviewSubmitting}>
              {isReviewSubmitting ? 'Отправляем...' : 'Оставить отзыв'}
            </button>
          </form>
        ) : (
          <p className="muted">Чтобы оставить отзыв, войдите в аккаунт.</p>
        )}

        {reviewMessage && (
          <AlertMessage
            type="success"
            message={reviewMessage}
            autoHideMs={3000}
            onClose={() => setReviewMessage('')}
          />
        )}
      </div>

      {isAuthenticated && (
        <div className="panel">
          <button className="btn btn--primary" type="button" onClick={onAddFavorite}>
            Добавить в избранное
          </button>
          {favoriteNotice && (
            <AlertMessage
              type={favoriteNotice.type}
              message={favoriteNotice.message}
              autoHideMs={favoriteNotice.type === 'success' ? 2800 : 0}
              onClose={() => setFavoriteNotice(null)}
            />
          )}
        </div>
      )}

      <RegistrationFormModal
        open={Boolean(registrationSession)}
        session={registrationSession}
        event={event}
        error={registrationError}
        isSubmitting={isRegistrationSubmitting}
        onSubmit={onSubmitRegistration}
        onClose={onCloseRegistration}
      />
    </section>
  );
};

export default EventDetailsPage;

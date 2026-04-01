import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
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
import { formatDateTime } from '../utils/formatters';
import { toUserErrorMessage } from '../utils/errorMessages';

const EventDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

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

  const [favoriteMessage, setFavoriteMessage] = useState('');

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
      setFavoriteMessage('');
      await favoriteService.addFavorite(event.id);
      setFavoriteMessage('Добавлено в избранное.');
    } catch (err) {
      setFavoriteMessage(toUserErrorMessage(err, 'Не удалось добавить в избранное.'));
    }
  };

  const onOpenRegistration = (session) => {
    setRegistrationError('');
    setRegistrationSuccess('');
    setRegistrationResult(null);

    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/events/${id}` } });
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

  const venue = event.venue || null;
  const venueLatitude = venue ? Number(venue.latitude) : NaN;
  const venueLongitude = venue ? Number(venue.longitude) : NaN;
  const hasVenueCoordinates = Number.isFinite(venueLatitude) && Number.isFinite(venueLongitude);

  if (isLoading) return <section className="container page"><Loader text="Загружаем мероприятие..." /></section>;
  if (error) return <section className="container page"><ErrorMessage message={error} /></section>;
  if (!event) return null;

  return (
    <section className="container page">
      <h1>{event.title}</h1>
      <p className="page-subtitle">{event.shortDescription || 'Краткое описание пока не добавлено.'}</p>

      <div className="panel details-grid">
        <p><strong>Возрастной рейтинг:</strong> {event.ageRating ?? '-'}</p>
        <p><strong>Создано:</strong> {formatDateTime(event.createdAt)}</p>
        <p><strong>Организатор:</strong> {event.organizer?.name || '-'}</p>
        <p><strong>Площадка:</strong> {venue?.name || 'Не указана'}</p>
        <p><strong>Адрес:</strong> {venue?.address || 'Не указан'}</p>
      </div>

      {event.coverUrl && <img src={event.coverUrl} alt={event.title} className="details-cover" />}

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

        {sessionsLoading && <Loader text="Готовим карту..." />}
        {!sessionsLoading && sessionsError && <ErrorMessage message={sessionsError} />}
        {!sessionsLoading && !sessionsError && sessions.length === 0 && (
          <EmptyState message="Сеансы пока не добавлены." />
        )}

        {!sessionsLoading && !sessionsError && venue && (
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

        {!sessionsLoading && !sessionsError && !venue && (
          <p className="muted">Координаты площадки пока не указаны.</p>
        )}
      </div>

      <div className="panel">
        <h2>Сеансы</h2>

        {registrationSuccess && <p className="page-note page-note--success">{registrationSuccess}</p>}
        {registrationResult?.qrToken && (
          <QRCodeDisplay token={registrationResult.qrToken} label="QR-код для посещения" />
        )}
        {sessionsLoading && <Loader text="Загружаем сеансы..." />}
        {!sessionsLoading && sessionsError && <ErrorMessage message={sessionsError} />}
        {!sessionsLoading && !sessionsError && sessions.length === 0 && (
          <EmptyState message="Сеансы пока не добавлены." />
        )}

        {!sessionsLoading && !sessionsError && sessions.length > 0 && (
          <div className="session-list">
            {sessions.map((session) => (
              <SessionCard key={session.id} session={session} onRegisterClick={onOpenRegistration} />
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
        {!reviewsLoading && reviewsError && <ErrorMessage message={reviewsError} />}
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

        {reviewMessage && <p className="page-note page-note--success">{reviewMessage}</p>}
      </div>

      {isAuthenticated && (
        <div className="panel">
          <button className="btn btn--primary" type="button" onClick={onAddFavorite}>
            Добавить в избранное
          </button>
          {favoriteMessage && <p className="page-note">{favoriteMessage}</p>}
        </div>
      )}

      <RegistrationFormModal
        open={Boolean(registrationSession)}
        session={registrationSession}
        error={registrationError}
        isSubmitting={isRegistrationSubmitting}
        onSubmit={onSubmitRegistration}
        onClose={onCloseRegistration}
      />
    </section>
  );
};

export default EventDetailsPage;

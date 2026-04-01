import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EventCard from '../components/EventCard';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import { eventService } from '../services/eventService';
import { favoriteService } from '../services/favoriteService';
import { useAuth } from '../context/AuthContext';

const EventsPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [favoriteActionEventId, setFavoriteActionEventId] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await eventService.getEvents();
        setEvents(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || 'Не удалось загрузить мероприятия.');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  const loadFavorites = useCallback(async () => {
    if (!isAuthenticated) {
      setFavoriteIds([]);
      return;
    }

    try {
      const data = await favoriteService.getMyFavorites();
      const ids = Array.isArray(data) ? data.map((item) => item.eventId).filter(Boolean) : [];
      setFavoriteIds(ids);
    } catch {
      // Do not block event list rendering in case favorites loading fails.
      setFavoriteIds([]);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const onFavoriteClick = async (event) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/events' } });
      return;
    }

    const eventId = event.id;
    const isFavorite = favoriteIds.includes(eventId);

    try {
      setError('');
      setMessage('');
      setFavoriteActionEventId(eventId);

      if (isFavorite) {
        await favoriteService.removeFromFavorites(eventId);
        setFavoriteIds((prev) => prev.filter((id) => id !== eventId));
        setMessage('Удалено из избранного.');
      } else {
        await favoriteService.addToFavorites(eventId);
        setFavoriteIds((prev) => (prev.includes(eventId) ? prev : [...prev, eventId]));
        setMessage('Добавлено в избранное.');
      }
    } catch (err) {
      setError(err.message || 'Не удалось обновить избранное.');
    } finally {
      setFavoriteActionEventId(null);
    }
  };

  return (
    <section className="container page">
      <h1>Мероприятия</h1>

      {isLoading && <Loader text="Загружаем мероприятия..." />}
      {error && <ErrorMessage message={error} />}
      {message && <p className="page-note page-note--success">{message}</p>}

      {!isLoading && !error && events.length === 0 && <EmptyState message="Мероприятия не найдены." />}

      {!isLoading && !error && events.length > 0 && (
        <div className="event-grid">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onFavoriteClick={onFavoriteClick}
              favoriteButtonText={favoriteIds.includes(event.id) ? 'В избранном' : 'В избранное'}
              isFavoriteButtonLoading={favoriteActionEventId === event.id}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default EventsPage;

import { useEffect, useState } from 'react';
import EmptyState from '../components/EmptyState';
import AlertMessage from '../components/AlertMessage';
import Loader from '../components/Loader';
import EventCard from '../components/EventCard';
import { favoriteService } from '../services/favoriteService';
import { toUserErrorMessage } from '../utils/errorMessages';

const FavoritesPage = () => {
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [removingEventId, setRemovingEventId] = useState(null);

  const loadFavorites = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await favoriteService.getMyFavorites();
      setFavorites(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Не удалось загрузить избранное.'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const removeFavorite = async (eventId) => {
    try {
      setError('');
      setMessage('');
      setRemovingEventId(eventId);
      await favoriteService.removeFromFavorites(eventId);
      setFavorites((prev) => prev.filter((item) => item.eventId !== eventId));
      setMessage('Удалено из избранного.');
    } catch (err) {
      setError(toUserErrorMessage(err, 'Не удалось удалить из избранного.'));
    } finally {
      setRemovingEventId(null);
    }
  };

  return (
    <section className="container page">
      <h1>Избранное</h1>

      {isLoading && <Loader text="Загружаем избранное..." />}
      {error && <AlertMessage type="error" message={error} onClose={() => setError('')} />}
      {message && (
        <AlertMessage
          type="success"
          message={message}
          autoHideMs={2600}
          onClose={() => setMessage('')}
        />
      )}

      {!isLoading && !error && favorites.length === 0 && <EmptyState message="Нет избранных мероприятий." />}

      {!isLoading && !error && favorites.length > 0 && (
        <div className="event-grid">
          {favorites.map((item) => (
            <EventCard
              key={item.eventId}
              event={{ ...item, id: item.eventId }}
              onFavoriteClick={() => removeFavorite(item.eventId)}
              favoriteButtonText="Удалить из избранного"
              isFavoriteButtonLoading={removingEventId === item.eventId}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default FavoritesPage;

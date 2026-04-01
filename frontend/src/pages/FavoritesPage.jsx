import { useEffect, useState } from 'react';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import Loader from '../components/Loader';
import { favoriteService } from '../services/favoriteService';
import { formatStatus } from '../utils/formatters';

const FavoritesPage = () => {
  const [favorites, setFavorites] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadFavorites = async () => {
    try {
      setIsLoading(true);
      setError('');
      const data = await favoriteService.getMyFavorites();
      setFavorites(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Не удалось загрузить избранное.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFavorites();
  }, []);

  const removeFavorite = async (eventId) => {
    try {
      await favoriteService.removeFavorite(eventId);
      setFavorites((prev) => prev.filter((item) => item.eventId !== eventId));
    } catch (err) {
      setError(err.message || 'Не удалось удалить из избранного.');
    }
  };

  return (
    <section className="container page">
      <h1>Избранное</h1>

      {isLoading && <Loader text="Загружаем избранное..." />}
      {error && <ErrorMessage message={error} />}

      {!isLoading && !error && favorites.length === 0 && <EmptyState message="Список избранного пока пуст." />}

      {!isLoading && !error && favorites.length > 0 && (
        <div className="favorites-list">
          {favorites.map((item) => (
            <article className="panel favorites-item" key={item.eventId}>
              <div>
                <h3>{item.title}</h3>
                <p>{item.shortDescription || '-'}</p>
                <p className="muted">
                  Возраст: {item.ageRating ?? '-'} | Статус: {formatStatus(item.status)}
                </p>
              </div>
              <button className="btn btn--ghost" type="button" onClick={() => removeFavorite(item.eventId)}>
                Удалить
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};

export default FavoritesPage;

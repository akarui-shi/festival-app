import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import { eventService } from '../services/eventService';
import { favoriteService } from '../services/favoriteService';
import { useAuth } from '../context/AuthContext';
import { formatDateTime, formatStatus } from '../utils/formatters';

const EventDetailsPage = () => {
  const { id } = useParams();
  const { isAuthenticated } = useAuth();

  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [favoriteMessage, setFavoriteMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await eventService.getEventById(id);
        setEvent(data);
      } catch (err) {
        setError(err.message || 'Не удалось загрузить детали мероприятия.');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [id]);

  const onAddFavorite = async () => {
    try {
      setFavoriteMessage('');
      await favoriteService.addFavorite(event.id);
      setFavoriteMessage('Добавлено в избранное.');
    } catch (err) {
      setFavoriteMessage(err.message || 'Не удалось добавить в избранное.');
    }
  };

  if (isLoading) return <section className="container page"><Loader text="Загружаем мероприятие..." /></section>;
  if (error) return <section className="container page"><ErrorMessage message={error} /></section>;
  if (!event) return null;

  return (
    <section className="container page">
      <h1>{event.title}</h1>
      <p className="page-subtitle">{event.shortDescription || 'Краткое описание пока не добавлено.'}</p>

      <div className="panel details-grid">
        <p><strong>Статус:</strong> {formatStatus(event.status)}</p>
        <p><strong>Возрастной рейтинг:</strong> {event.ageRating ?? '-'}</p>
        <p><strong>Создано:</strong> {formatDateTime(event.createdAt)}</p>
        <p><strong>Организатор:</strong> {event.organizer?.name || '-'}</p>
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
        <h2>Площадки</h2>
        <ul className="details-list">
          {(event.venues || []).map((venue) => (
            <li key={venue.id}>{venue.name} ({venue.cityName})</li>
          ))}
          {(event.venues || []).length === 0 && <li>Площадки пока не добавлены.</li>}
        </ul>
      </div>

      {isAuthenticated && (
        <div className="panel">
          <button className="btn btn--primary" type="button" onClick={onAddFavorite}>
            Добавить в избранное
          </button>
          {favoriteMessage && <p className="page-note">{favoriteMessage}</p>}
        </div>
      )}
    </section>
  );
};

export default EventDetailsPage;

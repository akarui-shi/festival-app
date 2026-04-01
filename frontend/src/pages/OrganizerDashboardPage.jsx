import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import Loader from '../components/Loader';
import OrganizerEventCard from '../components/OrganizerEventCard';
import { organizerService } from '../services/organizerService';
import { eventService } from '../services/eventService';

const OrganizerDashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(location.state?.message || '');
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await organizerService.getMyEvents();
        setEvents(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || 'Не удалось загрузить мероприятия организатора.');
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, []);

  useEffect(() => {
    if (!location.state?.message) {
      return;
    }
    window.history.replaceState({}, document.title);
  }, [location.state]);

  const handleDelete = async (eventId) => {
    const confirmed = window.confirm('Удалить мероприятие? Это действие нельзя отменить.');
    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(eventId);
      setError('');
      setMessage('');
      await eventService.deleteEvent(eventId);
      setEvents((prev) => prev.filter((event) => event.id !== eventId));
      setMessage('Мероприятие удалено.');
    } catch (err) {
      setError(err.message || 'Не удалось удалить мероприятие.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="container page">
      <div className="page-header-row">
        <h1>Кабинет организатора</h1>
        <button className="btn btn--primary" type="button" onClick={() => navigate('/organizer/events/create')}>
          Создать мероприятие
        </button>
      </div>

      {isLoading && <Loader text="Загружаем ваши мероприятия..." />}
      {error && <ErrorMessage message={error} />}
      {message && <p className="page-note page-note--success">{message}</p>}

      {!isLoading && !error && events.length === 0 && <EmptyState message="У вас пока нет мероприятий." />}

      {!isLoading && !error && events.length > 0 && (
        <div className="organizer-grid">
          {events.map((event) => (
            <OrganizerEventCard
              key={event.id}
              event={event}
              isDeleting={deletingId === event.id}
              onEdit={(id) => navigate(`/organizer/events/${id}/edit`)}
              onSessions={(id) => navigate(`/organizer/events/${id}/sessions`)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default OrganizerDashboardPage;


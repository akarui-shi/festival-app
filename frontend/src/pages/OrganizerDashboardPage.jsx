import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import Loader from '../components/Loader';
import OrganizerEventCard from '../components/OrganizerEventCard';
import { organizerService } from '../services/organizerService';
import { eventService } from '../services/eventService';
import { toUserErrorMessage } from '../utils/errorMessages';

const OrganizerDashboardPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState(location.state?.message || '');
  const [deletingId, setDeletingId] = useState(null);
  const [archivingId, setArchivingId] = useState(null);

  const loadEvents = async ({ withLoader = true } = {}) => {
    try {
      if (withLoader) {
        setIsLoading(true);
      }
      setError('');
      const data = await organizerService.getMyEvents();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Не удалось загрузить мероприятия организатора.'));
    } finally {
      if (withLoader) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
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
      await loadEvents({ withLoader: false });
      setMessage('Мероприятие удалено.');
    } catch (err) {
      setError(toUserErrorMessage(err, 'Не удалось удалить мероприятие.'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleArchive = async (eventId) => {
    const confirmed = window.confirm('Отправить мероприятие в архив?');
    if (!confirmed) {
      return;
    }

    try {
      setArchivingId(eventId);
      setError('');
      setMessage('');
      await eventService.archiveEvent(eventId);
      await loadEvents({ withLoader: false });
      setMessage('Мероприятие отправлено в архив.');
    } catch (err) {
      setError(toUserErrorMessage(err, 'Не удалось отправить мероприятие в архив.'));
    } finally {
      setArchivingId(null);
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
              isArchiving={archivingId === event.id}
              onEdit={(id) => navigate(`/organizer/events/${id}/edit`)}
              onSessions={(id) => navigate(`/organizer/events/${id}/sessions`)}
              onArchive={handleArchive}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default OrganizerDashboardPage;

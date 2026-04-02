import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import AlertMessage from '../components/AlertMessage';
import Loader from '../components/Loader';
import OrganizerEventCard from '../components/OrganizerEventCard';
import { organizerService } from '../services/organizerService';
import { eventService } from '../services/eventService';
import { toUserErrorMessage } from '../utils/errorMessages';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { ROLE } from '../utils/roles';

const OrganizerDashboardPage = () => {
  const navigate = useNavigate();
  const { notifySuccess, notifyError, notifyInfo } = useNotification();
  const { hasRole } = useAuth();
  const canCreateEvent = hasRole([ROLE.ORGANIZER]) && !hasRole([ROLE.ADMIN]);

  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
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
      const message = toUserErrorMessage(err, 'Не удалось загрузить мероприятия организатора.');
      setError(message);
      notifyError(message);
    } finally {
      if (withLoader) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const handleDelete = async (eventId) => {
    const confirmed = window.confirm('Удалить мероприятие? Это действие нельзя отменить.');
    if (!confirmed) {
      notifyInfo('Удаление мероприятия отменено.');
      return;
    }

    try {
      setDeletingId(eventId);
      setError('');
      await eventService.deleteEvent(eventId);
      await loadEvents({ withLoader: false });
      notifySuccess('Мероприятие удалено.');
    } catch (err) {
      const message = toUserErrorMessage(err, 'Не удалось удалить мероприятие.');
      setError(message);
      notifyError(message);
    } finally {
      setDeletingId(null);
    }
  };

  const handleArchive = async (eventId) => {
    const confirmed = window.confirm('Отправить мероприятие в архив?');
    if (!confirmed) {
      notifyInfo('Архивирование мероприятия отменено.');
      return;
    }

    try {
      setArchivingId(eventId);
      setError('');
      await eventService.archiveEvent(eventId);
      await loadEvents({ withLoader: false });
      notifySuccess('Мероприятие отправлено в архив.');
    } catch (err) {
      const message = toUserErrorMessage(err, 'Не удалось отправить мероприятие в архив.');
      setError(message);
      notifyError(message);
    } finally {
      setArchivingId(null);
    }
  };

  return (
    <section className="container page">
      <div className="page-header-row">
        <h1>Кабинет организатора</h1>
        {canCreateEvent && (
          <button className="btn btn--primary" type="button" onClick={() => navigate('/organizer/events/create')}>
            Создать мероприятие
          </button>
        )}
      </div>

      {isLoading && <Loader text="Загружаем ваши мероприятия..." />}
      {error && <AlertMessage type="error" message={error} onClose={() => setError('')} />}

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

import { useEffect, useMemo, useState } from 'react';
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

const EVENT_STATUS_OPTIONS = [
  { value: 'ALL', label: 'Все статусы' },
  { value: 'PENDING_APPROVAL', label: 'На модерации' },
  { value: 'PUBLISHED', label: 'Опубликовано' },
  { value: 'REJECTED', label: 'Отклонено' },
  { value: 'ARCHIVED', label: 'В архиве' }
];

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
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

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

  const stats = useMemo(() => {
    const pending = events.filter((item) => item.status === 'PENDING_APPROVAL').length;
    const published = events.filter((item) => item.status === 'PUBLISHED').length;
    const archived = events.filter((item) => item.status === 'ARCHIVED').length;
    return {
      total: events.length,
      pending,
      published,
      archived
    };
  }, [events]);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return events.filter((event) => {
      const matchesTitle = !normalizedQuery || String(event.title || '').toLowerCase().includes(normalizedQuery);
      const matchesStatus = statusFilter === 'ALL' || event.status === statusFilter;
      return matchesTitle && matchesStatus;
    });
  }, [events, query, statusFilter]);

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
    <section className="container page organizer-dashboard">
      <div className="page-header-row">
        <h1>Кабинет организатора</h1>
        {canCreateEvent && (
          <button className="btn btn--primary" type="button" onClick={() => navigate('/organizer/events/create')}>
            Создать мероприятие
          </button>
        )}
      </div>
      <p className="page-subtitle">Управляйте мероприятиями, статусами и сеансами в одном месте.</p>

      <div className="panel organizer-summary">
        <div className="organizer-summary__stats">
          <article className="organizer-stat-card">
            <p className="organizer-stat-card__label">Всего мероприятий</p>
            <p className="organizer-stat-card__value">{stats.total}</p>
          </article>
          <article className="organizer-stat-card">
            <p className="organizer-stat-card__label">На модерации</p>
            <p className="organizer-stat-card__value">{stats.pending}</p>
          </article>
          <article className="organizer-stat-card">
            <p className="organizer-stat-card__label">Опубликовано</p>
            <p className="organizer-stat-card__value">{stats.published}</p>
          </article>
          <article className="organizer-stat-card">
            <p className="organizer-stat-card__label">В архиве</p>
            <p className="organizer-stat-card__value">{stats.archived}</p>
          </article>
        </div>
      </div>

      <div className="panel organizer-controls">
        <div className="organizer-controls__grid">
          <label>
            Поиск по названию
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Например, городской фестиваль"
            />
          </label>
          <label>
            Статус
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {EVENT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {isLoading && <Loader text="Загружаем ваши мероприятия..." />}
      {error && <AlertMessage type="error" message={error} onClose={() => setError('')} />}

      {!isLoading && !error && events.length === 0 && <EmptyState message="У вас пока нет мероприятий." />}

      {!isLoading && !error && events.length > 0 && filteredEvents.length === 0 && (
        <EmptyState message="По выбранным фильтрам мероприятия не найдены." />
      )}

      {!isLoading && !error && filteredEvents.length > 0 && (
        <div className="organizer-grid">
          {filteredEvents.map((event) => (
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

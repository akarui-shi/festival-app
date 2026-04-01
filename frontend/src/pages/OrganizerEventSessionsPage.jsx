import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import ErrorMessage from '../components/ErrorMessage';
import Loader from '../components/Loader';
import OrganizerSessionCard from '../components/OrganizerSessionCard';
import SessionForm from '../components/SessionForm';
import VenueForm from '../components/VenueForm';
import { organizerService } from '../services/organizerService';
import { sessionService } from '../services/sessionService';
import { venueService } from '../services/venueService';

const OrganizerEventSessionsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [venues, setVenues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showVenueForm, setShowVenueForm] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVenueSubmitting, setIsVenueSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError('');
      const [eventData, sessionsData, venuesData] = await Promise.all([
        organizerService.getMyEventById(id),
        sessionService.getEventSessions(id),
        venueService.getVenues()
      ]);

      setEvent(eventData);
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      setVenues(Array.isArray(venuesData) ? venuesData : []);
    } catch (err) {
      setError(err.message || 'Не удалось загрузить сеансы мероприятия.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const createInitialValues = useMemo(
    () => ({
      venueId: '',
      title: '',
      description: '',
      startAt: '',
      endAt: ''
    }),
    []
  );

  const handleCreateSession = async (payload) => {
    try {
      setIsSubmitting(true);
      setError('');
      setMessage('');
      await sessionService.createSession({ ...payload, eventId: Number(id) });
      setShowCreateForm(false);
      await loadData();
      setMessage('Сеанс создан.');
    } catch (err) {
      setError(err.message || 'Не удалось создать сеанс.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateSession = async (payload) => {
    if (!editingSession) {
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      setMessage('');
      await sessionService.updateSession(editingSession.id, { ...payload, eventId: Number(id) });
      setEditingSession(null);
      await loadData();
      setMessage('Сеанс обновлен.');
    } catch (err) {
      setError(err.message || 'Не удалось обновить сеанс.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSession = async (sessionId) => {
    const confirmed = window.confirm('Удалить сеанс?');
    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(sessionId);
      setError('');
      setMessage('');
      await sessionService.deleteSession(sessionId);
      setSessions((prev) => prev.filter((session) => session.id !== sessionId));
      setMessage('Сеанс удален.');
    } catch (err) {
      setError(err.message || 'Не удалось удалить сеанс.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCreateVenue = async (payload) => {
    try {
      setIsVenueSubmitting(true);
      setError('');
      setMessage('');
      await organizerService.createVenue(payload);
      setShowVenueForm(false);
      await loadData();
      setMessage('Площадка создана и доступна для выбора в сеансах.');
    } catch (err) {
      setError(err.message || 'Не удалось создать площадку.');
    } finally {
      setIsVenueSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="container page">
        <Loader text="Загружаем сеансы..." />
      </section>
    );
  }

  if (error && !event) {
    return (
      <section className="container page">
        <ErrorMessage message={error} />
      </section>
    );
  }

  return (
    <section className="container page">
      <div className="page-header-row">
        <h1>Сеансы мероприятия: {event?.title}</h1>
        <button type="button" className="btn btn--ghost" onClick={() => navigate('/organizer')}>
          Назад в кабинет
        </button>
      </div>

      {error && <ErrorMessage message={error} />}
      {message && <p className="page-note page-note--success">{message}</p>}

      <div className="inline-actions">
        <button type="button" className="btn btn--primary" onClick={() => setShowCreateForm((prev) => !prev)}>
          {showCreateForm ? 'Скрыть форму сеанса' : 'Добавить сеанс'}
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => setShowVenueForm((prev) => !prev)}>
          {showVenueForm ? 'Скрыть форму площадки' : 'Создать площадку'}
        </button>
      </div>

      {showCreateForm && (
        <SessionForm
          initialValues={createInitialValues}
          venues={venues}
          isSubmitting={isSubmitting}
          submitLabel="Создать сеанс"
          errorMessage={error}
          onCancel={() => {
            setShowCreateForm(false);
            setError('');
          }}
          onSubmit={handleCreateSession}
        />
      )}

      {showVenueForm && (
        <VenueForm
          initialValues={null}
          isSubmitting={isVenueSubmitting}
          errorMessage={error}
          submitLabel="Создать площадку"
          onCancel={() => {
            setShowVenueForm(false);
            setError('');
          }}
          onSubmit={handleCreateVenue}
        />
      )}

      {editingSession && (
        <SessionForm
          initialValues={editingSession}
          venues={venues}
          isSubmitting={isSubmitting}
          submitLabel="Сохранить сеанс"
          errorMessage={error}
          onCancel={() => {
            setEditingSession(null);
            setError('');
          }}
          onSubmit={handleUpdateSession}
        />
      )}

      {sessions.length === 0 ? (
        <EmptyState message="У мероприятия пока нет сеансов." />
      ) : (
        <div className="organizer-grid">
          {sessions.map((session) => (
            <OrganizerSessionCard
              key={session.id}
              session={session}
              isDeleting={deletingId === session.id}
              onEdit={(selected) => {
                setEditingSession(selected);
                setShowCreateForm(false);
                setError('');
              }}
              onDelete={handleDeleteSession}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default OrganizerEventSessionsPage;

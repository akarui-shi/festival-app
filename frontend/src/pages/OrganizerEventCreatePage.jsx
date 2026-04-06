import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EventForm from '../components/EventForm';
import Loader from '../components/Loader';
import AlertMessage from '../components/AlertMessage';
import { eventService } from '../services/eventService';
import { sessionService } from '../services/sessionService';
import { directoryService } from '../services/directoryService';
import { toUserErrorMessage } from '../utils/errorMessages';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { ROLE } from '../utils/roles';

const OrganizerEventCreatePage = () => {
  const navigate = useNavigate();
  const { notifySuccess, notifyError, notifyWarning } = useNotification();
  const { hasRole, currentUser } = useAuth();
  const isAdmin = hasRole([ROLE.ADMIN]);
  const organizationName = currentUser?.organization?.name?.trim() || '';

  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadDirectories = async () => {
    const categoriesData = await directoryService.getCategories();
    setCategories(Array.isArray(categoriesData) ? categoriesData : []);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError('');
        await loadDirectories();
      } catch (err) {
        const message = toUserErrorMessage(err, 'Не удалось загрузить справочники.');
        setError(message);
        notifyError(message);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSubmit = async (payload) => {
    try {
      setIsSubmitting(true);
      setError('');
      const { sessions = [], ...eventPayload } = payload;
      const createdEvent = await eventService.createEvent(eventPayload);

      let createdSessionsCount = 0;
      const sessionErrors = [];

      if (Array.isArray(sessions) && sessions.length > 0 && createdEvent?.id) {
        // Create sessions after event creation so organizer can publish everything in one flow.
        for (const session of sessions) {
          try {
            await sessionService.createSession({
              eventId: Number(createdEvent.id),
              startAt: session.startAt,
              endAt: session.endAt,
              capacity: session.capacity
            });
            createdSessionsCount += 1;
          } catch (sessionError) {
            sessionErrors.push(toUserErrorMessage(sessionError, 'Не удалось создать один из сеансов.'));
          }
        }
      }

      if (sessionErrors.length > 0) {
        notifyWarning(
          `Мероприятие создано, но добавлены не все сеансы (${createdSessionsCount}/${sessions.length}).`
        );
        notifyError(sessionErrors[0]);
      } else if (sessions.length > 0) {
        notifySuccess(`Мероприятие создано и отправлено на модерацию. Добавлено сеансов: ${createdSessionsCount}.`);
      } else {
        notifySuccess('Мероприятие создано и отправлено на модерацию.');
      }
      navigate('/organizer');
    } catch (err) {
      const message = toUserErrorMessage(err, 'Не удалось создать мероприятие.');
      setError(message);
      notifyError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="container page">
        <Loader text="Загружаем форму..." />
      </section>
    );
  }

  if (isAdmin) {
    return (
      <section className="container page">
        <AlertMessage type="error" message="Администратор не может создавать мероприятия." />
      </section>
    );
  }

  return (
    <section className="container page">
      <h1>Создание мероприятия</h1>
      <p className="page-subtitle">Укажите адрес проведения, выберите точку на карте и заполните описание мероприятия.</p>
      <p className="muted">Организация: {organizationName || 'Не привязана'}</p>

      {error && <AlertMessage type="error" message={error} onClose={() => setError('')} />}

      <EventForm
        categories={categories}
        allowSessionDrafts
        isSubmitting={isSubmitting}
        submitLabel="Создать мероприятие"
        onSubmit={handleSubmit}
      />
    </section>
  );
};

export default OrganizerEventCreatePage;

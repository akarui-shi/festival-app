import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import { publicationService } from '../services/publicationService';
import { organizerService } from '../services/organizerService';
import { useAuth } from '../context/AuthContext';
import { ROLE } from '../utils/roles';
import { toUserErrorMessage } from '../utils/errorMessages';

const PublicationCreatePage = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const isAdmin = hasRole([ROLE.ADMIN]);
  const isOrganizer = hasRole([ROLE.ORGANIZER]);
  const organizerMustChooseEvent = isOrganizer && !isAdmin;

  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    eventId: ''
  });

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await organizerService.getMyEvents();
        setEvents(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(toUserErrorMessage(err, 'Не удалось загрузить мероприятия для выбора.'));
      } finally {
        setIsLoading(false);
      }
    };

    loadEvents();
  }, []);

  const canSubmit = useMemo(() => {
    if (!formData.title.trim() || !formData.content.trim()) {
      return false;
    }
    if (organizerMustChooseEvent && !formData.eventId) {
      return false;
    }
    return true;
  }, [formData.title, formData.content, formData.eventId, organizerMustChooseEvent]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError('');

      const payload = {
        title: formData.title.trim(),
        content: formData.content.trim(),
        eventId: formData.eventId ? Number(formData.eventId) : null
      };

      const created = await publicationService.createPublication(payload);
      navigate(`/publications/${created.publicationId}`);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Не удалось создать публикацию.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="container page">
        <Loader text="Загружаем форму публикации..." />
      </section>
    );
  }

  return (
    <section className="container page">
      <h1>Создать публикацию</h1>
      <p className="page-subtitle">Добавьте новость или статью, связанную с мероприятием.</p>

      {error && <ErrorMessage message={error} />}

      <form className="panel form" onSubmit={handleSubmit}>
        <label>
          Заголовок
          <input
            type="text"
            value={formData.title}
            onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
            placeholder="Введите заголовок публикации"
            required
          />
        </label>

        <label>
          Текст публикации
          <textarea
            rows={8}
            value={formData.content}
            onChange={(event) => setFormData((prev) => ({ ...prev, content: event.target.value }))}
            placeholder="Опишите новость, анонс или полезную информацию"
            required
          />
        </label>

        <label>
          Мероприятие
          <select
            value={formData.eventId}
            onChange={(event) => setFormData((prev) => ({ ...prev, eventId: event.target.value }))}
            required={organizerMustChooseEvent}
          >
            {!organizerMustChooseEvent && <option value="">Без привязки к мероприятию</option>}
            {events.map((item) => (
              <option key={item.id} value={item.id}>
                {item.title}
              </option>
            ))}
          </select>
        </label>

        {organizerMustChooseEvent && events.length === 0 && (
          <p className="muted">У вас пока нет мероприятий. Сначала создайте мероприятие.</p>
        )}

        <div className="inline-actions">
          <button className="btn btn--primary" type="submit" disabled={!canSubmit || isSubmitting}>
            {isSubmitting ? 'Публикуем...' : 'Создать публикацию'}
          </button>
          <button type="button" className="btn btn--ghost" onClick={() => navigate('/publications')} disabled={isSubmitting}>
            Отмена
          </button>
        </div>
      </form>
    </section>
  );
};

export default PublicationCreatePage;

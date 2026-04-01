import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EventForm from '../components/EventForm';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import { eventService } from '../services/eventService';
import { organizerService } from '../services/organizerService';
import { directoryService } from '../services/directoryService';

const OrganizerEventEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError('');
        const [eventData, categoriesData] = await Promise.all([
          organizerService.getMyEventById(id),
          directoryService.getCategories()
        ]);
        setEvent(eventData);
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      } catch (err) {
        setError(err.message || 'Не удалось загрузить мероприятие.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [id]);

  const initialValues = useMemo(() => {
    if (!event) {
      return null;
    }
    return {
      title: event.title || '',
      shortDescription: event.shortDescription || '',
      fullDescription: event.fullDescription || '',
      ageRating: event.ageRating ?? 0,
      coverUrl: event.coverUrl || '',
      categoryIds: (event.categories || []).map((category) => category.id)
    };
  }, [event]);

  const handleSubmit = async (payload) => {
    try {
      setIsSubmitting(true);
      setError('');
      await eventService.updateEvent(id, payload);
      navigate('/organizer', { state: { message: 'Изменения сохранены. Мероприятие отправлено на модерацию.' } });
    } catch (err) {
      setError(err.message || 'Не удалось обновить мероприятие.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="container page">
        <Loader text="Загружаем данные мероприятия..." />
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
      <h1>Редактирование мероприятия</h1>

      <EventForm
        initialValues={initialValues}
        categories={categories}
        isSubmitting={isSubmitting}
        submitLabel="Сохранить изменения"
        errorMessage={error}
        onSubmit={handleSubmit}
      />
    </section>
  );
};

export default OrganizerEventEditPage;

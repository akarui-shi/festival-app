import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EventForm from '../components/EventForm';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import { eventService } from '../services/eventService';
import { organizerService } from '../services/organizerService';
import { directoryService } from '../services/directoryService';
import { toUserErrorMessage } from '../utils/errorMessages';

const OrganizerEventEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
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
        const [eventData] = await Promise.all([
          organizerService.getMyEventById(id),
        ]);
        setEvent(eventData);
        await loadDirectories();
      } catch (err) {
        setError(toUserErrorMessage(err, 'Не удалось загрузить мероприятие.'));
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
      eventImages: Array.isArray(event.eventImages) ? event.eventImages : [],
      venueId: event.venue?.id ?? null,
      venueAddress: event.venue?.address || '',
      venueLatitude: event.venue?.latitude ?? null,
      venueLongitude: event.venue?.longitude ?? null,
      venueCityId: event.venue?.cityId ?? null,
      venueCityName: event.venue?.cityName || '',
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
      setError(toUserErrorMessage(err, 'Не удалось обновить мероприятие.'));
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
      <p className="page-subtitle">Обновите описание мероприятия и место проведения через адрес и карту.</p>

      {error && <ErrorMessage message={error} />}

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

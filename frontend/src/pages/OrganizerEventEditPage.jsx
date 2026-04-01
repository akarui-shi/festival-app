import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EventForm from '../components/EventForm';
import Loader from '../components/Loader';
import AlertMessage from '../components/AlertMessage';
import { eventService } from '../services/eventService';
import { organizerService } from '../services/organizerService';
import { directoryService } from '../services/directoryService';
import { toUserErrorMessage } from '../utils/errorMessages';
import { useNotification } from '../context/NotificationContext';

const OrganizerEventEditPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notifySuccess, notifyError } = useNotification();

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
        const message = toUserErrorMessage(err, 'Не удалось загрузить мероприятие.');
        setError(message);
        notifyError(message);
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
      notifySuccess('Изменения сохранены. Мероприятие отправлено на модерацию.');
      navigate('/organizer');
    } catch (err) {
      const message = toUserErrorMessage(err, 'Не удалось обновить мероприятие.');
      setError(message);
      notifyError(message);
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
        <AlertMessage type="error" message={error} onClose={() => setError('')} />
      </section>
    );
  }

  return (
    <section className="container page">
      <h1>Редактирование мероприятия</h1>
      <p className="page-subtitle">Обновите описание мероприятия и место проведения через адрес и карту.</p>

      {error && <AlertMessage type="error" message={error} onClose={() => setError('')} />}

      <EventForm
        initialValues={initialValues}
        categories={categories}
        isSubmitting={isSubmitting}
        submitLabel="Сохранить изменения"
        onSubmit={handleSubmit}
      />
    </section>
  );
};

export default OrganizerEventEditPage;

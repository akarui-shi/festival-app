import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EventForm from '../components/EventForm';
import VenueForm from '../components/VenueForm';
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
  const [venues, setVenues] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVenueSubmitting, setIsVenueSubmitting] = useState(false);
  const [showVenueForm, setShowVenueForm] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadDirectories = async () => {
    const [categoriesData, venuesData] = await Promise.all([
      directoryService.getCategories(),
      directoryService.getVenues()
    ]);
    setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    setVenues(Array.isArray(venuesData) ? venuesData : []);
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
      venueId: event.venue?.id ?? '',
      categoryIds: (event.categories || []).map((category) => category.id)
    };
  }, [event]);

  const handleSubmit = async (payload) => {
    try {
      setIsSubmitting(true);
      setError('');
      setMessage('');
      await eventService.updateEvent(id, payload);
      navigate('/organizer', { state: { message: 'Изменения сохранены. Мероприятие отправлено на модерацию.' } });
    } catch (err) {
      setError(toUserErrorMessage(err, 'Не удалось обновить мероприятие.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateVenue = async (payload) => {
    try {
      setIsVenueSubmitting(true);
      setError('');
      setMessage('');
      await organizerService.createVenue(payload);
      await loadDirectories();
      setShowVenueForm(false);
      setMessage('Новая площадка создана. При необходимости выберите ее в форме мероприятия.');
    } catch (err) {
      setError(toUserErrorMessage(err, 'Не удалось создать площадку.'));
    } finally {
      setIsVenueSubmitting(false);
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

      <div className="inline-actions">
        <button type="button" className="btn btn--ghost" onClick={() => setShowVenueForm((prev) => !prev)}>
          {showVenueForm ? 'Скрыть форму площадки' : 'Создать новую площадку'}
        </button>
      </div>

      {error && <ErrorMessage message={error} />}
      {message && <p className="page-note page-note--success">{message}</p>}

      {showVenueForm && (
        <VenueForm
          initialValues={null}
          isSubmitting={isVenueSubmitting}
          errorMessage={error}
          submitLabel="Сохранить площадку"
          onCancel={() => setShowVenueForm(false)}
          onSubmit={handleCreateVenue}
        />
      )}

      <EventForm
        initialValues={initialValues}
        categories={categories}
        venues={venues}
        isSubmitting={isSubmitting}
        submitLabel="Сохранить изменения"
        errorMessage={error}
        onSubmit={handleSubmit}
      />
    </section>
  );
};

export default OrganizerEventEditPage;

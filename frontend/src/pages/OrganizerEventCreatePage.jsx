import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EventForm from '../components/EventForm';
import VenueForm from '../components/VenueForm';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import { eventService } from '../services/eventService';
import { organizerService } from '../services/organizerService';
import { directoryService } from '../services/directoryService';
import { toUserErrorMessage } from '../utils/errorMessages';

const OrganizerEventCreatePage = () => {
  const navigate = useNavigate();

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
        await loadDirectories();
      } catch (err) {
        setError(toUserErrorMessage(err, 'Не удалось загрузить справочники.'));
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
      setMessage('');
      await eventService.createEvent(payload);
      navigate('/organizer', { state: { message: 'Мероприятие создано и отправлено на модерацию.' } });
    } catch (err) {
      setError(toUserErrorMessage(err, 'Не удалось создать мероприятие.'));
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
      setMessage('Площадка создана. Теперь ее можно выбрать в форме мероприятия.');
    } catch (err) {
      setError(toUserErrorMessage(err, 'Не удалось создать площадку.'));
    } finally {
      setIsVenueSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <section className="container page">
        <Loader text="Загружаем форму..." />
      </section>
    );
  }

  return (
    <section className="container page">
      <h1>Создание мероприятия</h1>
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
        categories={categories}
        venues={venues}
        isSubmitting={isSubmitting}
        submitLabel="Создать мероприятие"
        errorMessage={error}
        onSubmit={handleSubmit}
      />
    </section>
  );
};

export default OrganizerEventCreatePage;

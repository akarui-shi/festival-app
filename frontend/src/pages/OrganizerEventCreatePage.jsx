import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EventForm from '../components/EventForm';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import { eventService } from '../services/eventService';
import { directoryService } from '../services/directoryService';
import { toUserErrorMessage } from '../utils/errorMessages';

const OrganizerEventCreatePage = () => {
  const navigate = useNavigate();

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
      await eventService.createEvent(payload);
      navigate('/organizer', { state: { message: 'Мероприятие создано и отправлено на модерацию.' } });
    } catch (err) {
      setError(toUserErrorMessage(err, 'Не удалось создать мероприятие.'));
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

  return (
    <section className="container page">
      <h1>Создание мероприятия</h1>
      <p className="page-subtitle">Укажите адрес проведения, выберите точку на карте и заполните описание мероприятия.</p>

      {error && <ErrorMessage message={error} />}

      <EventForm
        categories={categories}
        isSubmitting={isSubmitting}
        submitLabel="Создать мероприятие"
        errorMessage={error}
        onSubmit={handleSubmit}
      />
    </section>
  );
};

export default OrganizerEventCreatePage;

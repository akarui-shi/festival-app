import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EventForm from '../components/EventForm';
import Loader from '../components/Loader';
import { eventService } from '../services/eventService';
import { directoryService } from '../services/directoryService';

const OrganizerEventCreatePage = () => {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError('');
        const categoriesData = await directoryService.getCategories();
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      } catch (err) {
        setError(err.message || 'Не удалось загрузить справочники.');
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
      navigate('/organizer', { state: { message: 'Мероприятие создано.' } });
    } catch (err) {
      setError(err.message || 'Не удалось создать мероприятие.');
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

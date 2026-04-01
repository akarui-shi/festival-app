import { useEffect, useState } from 'react';
import EventCard from '../components/EventCard';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import { eventService } from '../services/eventService';

const EventsPage = () => {
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await eventService.getEvents();
        setEvents(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message || 'Не удалось загрузить мероприятия.');
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  return (
    <section className="container page">
      <h1>Мероприятия</h1>

      {isLoading && <Loader text="Загружаем мероприятия..." />}
      {error && <ErrorMessage message={error} />}

      {!isLoading && !error && events.length === 0 && <EmptyState message="Мероприятия не найдены." />}

      {!isLoading && !error && events.length > 0 && (
        <div className="event-grid">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </section>
  );
};

export default EventsPage;

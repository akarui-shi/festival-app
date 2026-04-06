import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import EventCard from '../components/EventCard';
import Loader from '../components/Loader';
import AlertMessage from '../components/AlertMessage';
import EmptyState from '../components/EmptyState';
import { eventService } from '../services/eventService';
import { toUserErrorMessage } from '../utils/errorMessages';

const OrganizationPage = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const excludeEventId = searchParams.get('excludeEventId');

  const [organization, setOrganization] = useState(null);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setError('');

        const [profile, organizationEvents] = await Promise.all([
          eventService.getOrganizationProfile(id),
          eventService.getOrganizationEvents(id)
        ]);

        setOrganization(profile || null);
        setEvents(Array.isArray(organizationEvents) ? organizationEvents : []);
      } catch (err) {
        setError(toUserErrorMessage(err, 'Не удалось загрузить страницу организации.'));
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [id]);

  const visibleEvents = useMemo(() => {
    if (!excludeEventId) {
      return events;
    }
    return events.filter((event) => String(event.id) !== String(excludeEventId));
  }, [events, excludeEventId]);

  if (isLoading) {
    return (
      <section className="container page">
        <Loader text="Загружаем профиль организации..." />
      </section>
    );
  }

  if (error) {
    return (
      <section className="container page">
        <AlertMessage type="error" message={error} onClose={() => setError('')} />
      </section>
    );
  }

  if (!organization) {
    return (
      <section className="container page">
        <EmptyState message="Организация не найдена." />
      </section>
    );
  }

  return (
    <section className="container page organization-page">
      <div className="panel organization-page__hero">
        <p className="organization-page__eyebrow">Профиль организации</p>
        <h1>{organization.name}</h1>
        <p className="organization-page__description">
          {organization.description || 'Описание организации пока не добавлено.'}
        </p>
        {organization.contacts && (
          <p className="organization-page__contacts">
            <strong>Контакты:</strong> {organization.contacts}
          </p>
        )}
        <div className="organization-page__actions">
          <Link to="/events" className="btn btn--ghost">
            К афише
          </Link>
        </div>
      </div>

      <div className="panel">
        <h2>Другие мероприятия организации</h2>
        <p className="page-subtitle">
          Всего опубликованных событий: <strong>{visibleEvents.length}</strong>
        </p>

        {visibleEvents.length === 0 ? (
          <EmptyState message="У этой организации пока нет других опубликованных мероприятий." />
        ) : (
          <div className="event-list">
            {visibleEvents.map((event) => (
              <EventCard key={event.id} event={event} layout="list" />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default OrganizationPage;

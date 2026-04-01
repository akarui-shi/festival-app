import { Link, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import { publicationService } from '../services/publicationService';
import { formatDateTime, formatStatus } from '../utils/formatters';
import { toUserErrorMessage } from '../utils/errorMessages';

const PublicationDetailsPage = () => {
  const { id } = useParams();
  const [publication, setPublication] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPublication = async () => {
      try {
        setIsLoading(true);
        setError('');
        const data = await publicationService.getPublicationById(id);
        setPublication(data);
      } catch (err) {
        setError(toUserErrorMessage(err, 'Не удалось загрузить публикацию.'));
      } finally {
        setIsLoading(false);
      }
    };

    loadPublication();
  }, [id]);

  if (isLoading) {
    return (
      <section className="container page">
        <Loader text="Загружаем публикацию..." />
      </section>
    );
  }

  if (error) {
    return (
      <section className="container page">
        <ErrorMessage message={error} />
      </section>
    );
  }

  if (!publication) {
    return null;
  }

  return (
    <section className="container page">
      <h1>{publication.title}</h1>
      <div className="panel details-grid">
        <p><strong>Автор:</strong> {publication.authorName || '-'}</p>
        <p><strong>Дата:</strong> {formatDateTime(publication.createdAt)}</p>
        <p><strong>Статус:</strong> {formatStatus(publication.status)}</p>
        {publication.eventId ? (
          <p>
            <strong>Мероприятие:</strong>{' '}
            <Link to={`/events/${publication.eventId}`}>{publication.eventTitle || `#${publication.eventId}`}</Link>
          </p>
        ) : (
          <p><strong>Мероприятие:</strong> не привязано</p>
        )}
      </div>

      <article className="panel publication-content">
        <p>{publication.content || 'Текст публикации отсутствует.'}</p>
      </article>
    </section>
  );
};

export default PublicationDetailsPage;

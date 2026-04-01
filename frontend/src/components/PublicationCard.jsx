import { Link } from 'react-router-dom';
import { formatDateTime } from '../utils/formatters';

const PublicationCard = ({ publication }) => {
  return (
    <article className="publication-card">
      <h3>
        <Link to={`/publications/${publication.publicationId}`}>{publication.title}</Link>
      </h3>

      <p className="publication-card__preview">{publication.preview || 'Краткое описание отсутствует.'}</p>

      <div className="publication-card__meta">
        <span>Автор: {publication.authorName || '-'}</span>
        <span>Дата: {formatDateTime(publication.createdAt)}</span>
      </div>

      {publication.eventId && (
        <p className="publication-card__event-link">
          Связано с мероприятием:{' '}
          <Link to={`/events/${publication.eventId}`}>перейти к мероприятию</Link>
        </p>
      )}
    </article>
  );
};

export default PublicationCard;

import { Link } from 'react-router-dom';
import { formatDateTime } from '../utils/formatters';
import AppIcon from './AppIcon';

const PublicationCard = ({ publication }) => {
  return (
    <article className="publication-card">
      {publication.imageUrl && (
        <Link to={`/publications/${publication.publicationId}`} className="publication-card__image-link">
          <img src={publication.imageUrl} alt={publication.title} className="publication-card__image" />
        </Link>
      )}

      <h3>
        <Link to={`/publications/${publication.publicationId}`}>{publication.title}</Link>
      </h3>

      <p className="publication-card__preview">{publication.preview || 'Краткое описание отсутствует.'}</p>

      <div className="publication-card__meta">
        <span className="publication-card__meta-item">
          <AppIcon name="user" size={14} />
          Автор: {publication.authorName || '-'}
        </span>
        <span className="publication-card__meta-item">
          <AppIcon name="clock" size={14} />
          Дата: {formatDateTime(publication.createdAt)}
        </span>
      </div>

      {publication.eventId && (
        <p className="publication-card__event-link">
          <AppIcon name="calendar" size={14} />
          Мероприятие:{' '}
          <Link to={`/events/${publication.eventId}`}>{publication.eventTitle || `#${publication.eventId}`}</Link>
        </p>
      )}
    </article>
  );
};

export default PublicationCard;

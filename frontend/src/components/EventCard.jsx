import { Link } from 'react-router-dom';
import { formatStatus } from '../utils/formatters';

const EventCard = ({ event, onFavoriteClick, favoriteButtonText, isFavoriteButtonLoading = false }) => {
  const resolvedFavoriteText = favoriteButtonText || 'В избранное';

  return (
    <article className="event-card">
      <div className="event-card__image-wrap">
        {event.coverUrl ? (
          <img src={event.coverUrl} alt={event.title} className="event-card__image" />
        ) : (
          <div className="event-card__placeholder">Нет изображения</div>
        )}
      </div>

      <div className="event-card__body">
        <h3>{event.title}</h3>
        <p className="event-card__description">{event.shortDescription || 'Описание пока не добавлено.'}</p>

        <div className="event-card__meta">
          <span>Возраст {event.ageRating ?? '-'}</span>
          <span>{formatStatus(event.status)}</span>
        </div>

        <div className="event-card__actions">
          <Link to={`/events/${event.id}`} className="btn btn--primary">
            Подробнее
          </Link>
          {onFavoriteClick && (
            <button className="btn btn--ghost" type="button" onClick={() => onFavoriteClick(event)} disabled={isFavoriteButtonLoading}>
              {isFavoriteButtonLoading ? 'Обработка...' : resolvedFavoriteText}
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default EventCard;

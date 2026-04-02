import { Link } from 'react-router-dom';
import { formatDateTime } from '../utils/formatters';

const EventCard = ({
  event,
  onFavoriteClick,
  favoriteButtonText,
  isFavoriteButtonLoading = false,
  layout = 'grid'
}) => {
  const resolvedFavoriteText = favoriteButtonText || 'В избранное';
  const resolvedCoverUrl = event.coverUrl
    || (Array.isArray(event.eventImages)
      ? event.eventImages.find((image) => image?.isCover)?.imageUrl || event.eventImages[0]?.imageUrl
      : '');
  const ageLabel = Number.isFinite(Number(event.ageRating))
    ? `${Number(event.ageRating)}+`
    : 'не указано';
  const venueAddress = event.venueAddress?.trim() || 'Адрес не указан';
  const createdAtLabel = event.createdAt ? formatDateTime(event.createdAt) : '';
  const organizerName = event.organizerName?.trim() || '';
  const isList = layout === 'list';

  return (
    <article className={`event-card ${isList ? 'event-card--list' : ''}`.trim()}>
      <div className="event-card__image-wrap">
        {resolvedCoverUrl ? (
          <img src={resolvedCoverUrl} alt={event.title} className="event-card__image" />
        ) : (
          <div className="event-card__placeholder">Нет изображения</div>
        )}
      </div>

      <div className="event-card__body">
        <h3>
          <Link to={`/events/${event.id}`} className="event-card__title-link">
            {event.title}
          </Link>
        </h3>
        <p className="event-card__description">{event.shortDescription || 'Описание пока не добавлено.'}</p>

        <div className={`event-card__meta ${isList ? 'event-card__meta--list' : ''}`.trim()}>
          <span>Возрастное ограничение: {ageLabel}</span>
          {createdAtLabel && <span className="event-card__date">Добавлено: {createdAtLabel}</span>}
          {organizerName && <span>Организатор: {organizerName}</span>}
          <span className="event-card__address">Адрес площадки: {venueAddress}</span>
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

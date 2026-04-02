import { Link } from 'react-router-dom';
import { formatDateTime } from '../utils/formatters';
import AppIcon from './AppIcon';

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
          <span className="event-card__meta-item">
            <AppIcon name="spark" size={14} />
            Возрастное ограничение: {ageLabel}
          </span>
          {createdAtLabel && (
            <span className="event-card__meta-item event-card__date">
              <AppIcon name="clock" size={14} />
              Добавлено: {createdAtLabel}
            </span>
          )}
          {organizerName && (
            <span className="event-card__meta-item">
              <AppIcon name="user" size={14} />
              Организатор: {organizerName}
            </span>
          )}
          <span className="event-card__meta-item event-card__address">
            <AppIcon name="mapPin" size={14} />
            Адрес площадки: {venueAddress}
          </span>
        </div>

        <div className="event-card__actions">
          <Link to={`/events/${event.id}`} className="btn btn--primary">
            <AppIcon name="calendar" size={15} />
            Подробнее
          </Link>
          {onFavoriteClick && (
            <button className="btn btn--ghost" type="button" onClick={() => onFavoriteClick(event)} disabled={isFavoriteButtonLoading}>
              <AppIcon name="heart" size={15} />
              {isFavoriteButtonLoading ? 'Обработка...' : resolvedFavoriteText}
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default EventCard;

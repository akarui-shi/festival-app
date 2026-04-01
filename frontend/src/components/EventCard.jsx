import { Link } from 'react-router-dom';

const EventCard = ({ event, onFavoriteClick, favoriteButtonText, isFavoriteButtonLoading = false }) => {
  const resolvedFavoriteText = favoriteButtonText || 'В избранное';
  const resolvedCoverUrl = event.coverUrl
    || (Array.isArray(event.eventImages)
      ? event.eventImages.find((image) => image?.isCover)?.imageUrl || event.eventImages[0]?.imageUrl
      : '');
  const ageLabel = Number.isFinite(Number(event.ageRating))
    ? `${Number(event.ageRating)}+`
    : 'не указано';
  const venueAddress = event.venueAddress?.trim() || 'Адрес не указан';

  return (
    <article className="event-card">
      <div className="event-card__image-wrap">
        {resolvedCoverUrl ? (
          <img src={resolvedCoverUrl} alt={event.title} className="event-card__image" />
        ) : (
          <div className="event-card__placeholder">Нет изображения</div>
        )}
      </div>

      <div className="event-card__body">
        <h3>{event.title}</h3>
        <p className="event-card__description">{event.shortDescription || 'Описание пока не добавлено.'}</p>

        <div className="event-card__meta">
          <span>Возрастное ограничение: {ageLabel}</span>
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

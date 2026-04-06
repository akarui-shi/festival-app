import { Link } from 'react-router-dom';
import { formatSessionDayLabel, formatTime } from '../utils/formatters';
import AppIcon from './AppIcon';

const EventCard = ({
  event,
  onFavoriteClick,
  favoriteButtonText,
  isFavoriteButtonLoading = false,
  layout = 'grid'
}) => {
  const fallbackCoverUrl = '/event-placeholder.svg';
  const resolvedFavoriteText = favoriteButtonText || 'В избранное';
  const resolvedCoverUrl = event.coverUrl
    || (Array.isArray(event.eventImages)
      ? event.eventImages.find((image) => image?.isCover)?.imageUrl || event.eventImages[0]?.imageUrl
      : '');
  const safeCoverUrl = resolvedCoverUrl || fallbackCoverUrl;
  const ageLabel = Number.isFinite(Number(event.ageRating))
    ? `${Number(event.ageRating)}+`
    : 'не указано';
  const venueAddress = event.venueAddress?.trim() || 'Адрес не указан';
  const organizationName = event.organizationName?.trim() || '';
  const sessionDates = Array.isArray(event.sessionDates) ? event.sessionDates.filter(Boolean) : [];
  const renderedSessionDates = sessionDates
    .slice(0, 2)
    .map((sessionDate) => `${formatSessionDayLabel(sessionDate)} ${formatTime(sessionDate)}`);
  const moreSessionsCount = Math.max(sessionDates.length - renderedSessionDates.length, 0);
  const sessionSummary = renderedSessionDates.length > 0
    ? `${renderedSessionDates.join(' • ')}${moreSessionsCount > 0 ? ` • еще ${moreSessionsCount}` : ''}`
    : '';
  const isList = layout === 'list';

  return (
    <article className={`event-card ${isList ? 'event-card--list' : ''}`.trim()}>
      <div className="event-card__image-wrap">
        <img
          src={safeCoverUrl}
          alt={event.title}
          className="event-card__image"
          onError={(eventTarget) => {
            eventTarget.currentTarget.onerror = null;
            eventTarget.currentTarget.src = fallbackCoverUrl;
          }}
        />
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
          {organizationName && (
            <span className="event-card__meta-item">
              <AppIcon name="user" size={14} />
              Организация: {organizationName}
            </span>
          )}
          {sessionSummary && (
            <span className="event-card__meta-item event-card__sessions">
              <AppIcon name="calendar" size={14} />
              Сеансы: {sessionSummary}
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

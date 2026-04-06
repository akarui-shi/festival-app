import { formatSessionDayLabel, formatStatus, formatTime } from '../utils/formatters';
import AppIcon from './AppIcon';

const OrganizerEventCard = ({
  event,
  isDeleting = false,
  isArchiving = false,
  onEdit,
  onSessions,
  onDelete,
  onArchive
}) => {
  const fallbackCoverUrl = '/event-placeholder.svg';
  const isArchived = event.status === 'ARCHIVED';
  const statusClass = String(event.status || '').toLowerCase().replace(/_/g, '-');
  const coverUrl = event.coverUrl || (Array.isArray(event.eventImages) ? event.eventImages.find((item) => item.isCover)?.imageUrl : '');
  const safeCoverUrl = coverUrl || fallbackCoverUrl;
  const ageLabel = Number.isFinite(Number(event.ageRating)) ? `${Number(event.ageRating)}+` : 'не указано';
  const sessionDates = Array.isArray(event.sessionDates) ? event.sessionDates.filter(Boolean) : [];
  const renderedSessionDates = sessionDates
    .slice(0, 2)
    .map((sessionDate) => `${formatSessionDayLabel(sessionDate)} ${formatTime(sessionDate)}`);
  const moreSessionsCount = Math.max(sessionDates.length - renderedSessionDates.length, 0);
  const sessionSummary = renderedSessionDates.length > 0
    ? `${renderedSessionDates.join(' • ')}${moreSessionsCount > 0 ? ` • еще ${moreSessionsCount}` : ''}`
    : '';

  return (
    <article className="event-card event-card--list organizer-event-card">
      <div className="event-card__image-wrap organizer-event-card__media">
        <img
          src={safeCoverUrl}
          alt={event.title}
          className="event-card__image organizer-event-card__image"
          onError={(eventTarget) => {
            eventTarget.currentTarget.onerror = null;
            eventTarget.currentTarget.src = fallbackCoverUrl;
          }}
        />
      </div>

      <div className="event-card__body organizer-event-card__body">
        <div className="organizer-event-card__head">
          <h3>{event.title}</h3>
          <span className={`organizer-status-badge organizer-status-badge--${statusClass}`}>
            {formatStatus(event.status)}
          </span>
        </div>

        <p className="event-card__description organizer-event-card__description">
          {event.shortDescription || 'Описание не добавлено.'}
        </p>

        <div className="event-card__meta event-card__meta--list organizer-event-card__meta">
          <span className="event-card__meta-item">
            <AppIcon name="spark" size={14} />
            Возрастное ограничение: {ageLabel}
          </span>
          {sessionSummary && (
            <span className="event-card__meta-item event-card__sessions">
              <AppIcon name="calendar" size={14} />
              Сеансы: {sessionSummary}
            </span>
          )}
          <span className="event-card__meta-item organizer-event-card__address">
            <AppIcon name="mapPin" size={14} />
            Адрес площадки: {event.venueAddress?.trim() || 'Не указан'}
          </span>
        </div>

        <div className="chips">
          {(event.categories || []).map((category) => (
            <span key={category.id} className="chip">
              {category.name}
            </span>
          ))}
          {(event.categories || []).length === 0 && <span className="muted">Категории не выбраны</span>}
        </div>

        <div className="event-card__actions organizer-event-card__actions">
          <button type="button" className="btn btn--ghost" onClick={() => onEdit(event.id)}>
            Редактировать
          </button>
          <button type="button" className="btn btn--primary" onClick={() => onSessions(event.id)}>
            Сеансы
          </button>
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => onArchive?.(event.id)}
            disabled={isArchived || isArchiving}
          >
            {isArchiving ? 'Архивируем...' : isArchived ? 'В архиве' : 'В архив'}
          </button>
          <button type="button" className="btn btn--danger" onClick={() => onDelete(event.id)} disabled={isDeleting}>
            {isDeleting ? 'Удаляем...' : 'Удалить'}
          </button>
        </div>
      </div>
    </article>
  );
};

export default OrganizerEventCard;

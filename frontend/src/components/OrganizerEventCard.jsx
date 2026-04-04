import { formatDateTime, formatStatus } from '../utils/formatters';
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
  const isArchived = event.status === 'ARCHIVED';
  const statusClass = String(event.status || '').toLowerCase().replace(/_/g, '-');
  const coverUrl = event.coverUrl || (Array.isArray(event.eventImages) ? event.eventImages.find((item) => item.isCover)?.imageUrl : '');
  const ageLabel = Number.isFinite(Number(event.ageRating)) ? `${Number(event.ageRating)}+` : 'не указано';
  const createdAtLabel = event.createdAt ? formatDateTime(event.createdAt) : '';

  return (
    <article className="event-card event-card--list organizer-event-card">
      <div className="event-card__image-wrap organizer-event-card__media">
        {coverUrl ? (
          <img src={coverUrl} alt={event.title} className="event-card__image organizer-event-card__image" />
        ) : (
          <div className="event-card__placeholder organizer-event-card__image-placeholder">Нет обложки</div>
        )}
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
          {createdAtLabel && (
            <span className="event-card__meta-item">
              <AppIcon name="clock" size={14} />
              Добавлено: {createdAtLabel}
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

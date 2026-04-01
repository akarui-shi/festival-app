import { formatStatus } from '../utils/formatters';

const OrganizerEventCard = ({ event, isDeleting = false, onEdit, onSessions, onDelete }) => {
  return (
    <article className="organizer-event-card">
      <h3>{event.title}</h3>
      <p className="organizer-event-card__description">{event.shortDescription || 'Описание не добавлено.'}</p>

      <div className="organizer-event-card__meta">
        <span>Статус: {formatStatus(event.status)}</span>
        <span>Возраст: {event.ageRating ?? '-'}</span>
      </div>

      <div className="chips">
        {(event.categories || []).map((category) => (
          <span key={category.id} className="chip">
            {category.name}
          </span>
        ))}
        {(event.categories || []).length === 0 && <span className="muted">Категории не выбраны</span>}
      </div>

      <div className="organizer-event-card__actions">
        <button type="button" className="btn btn--ghost" onClick={() => onEdit(event.id)}>
          Редактировать
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => onSessions(event.id)}>
          Сеансы
        </button>
        <button type="button" className="btn btn--danger" onClick={() => onDelete(event.id)} disabled={isDeleting}>
          {isDeleting ? 'Удаляем...' : 'Удалить'}
        </button>
      </div>
    </article>
  );
};

export default OrganizerEventCard;


import { formatDateTime } from '../utils/formatters';

const OrganizerSessionCard = ({ session, isDeleting = false, onEdit, onDelete }) => {
  return (
    <article className="organizer-session-card">
      <h3>{session.title}</h3>
      <p className="organizer-session-card__description">{session.description || 'Описание не добавлено.'}</p>

      <div className="organizer-session-card__meta">
        <p>
          <strong>Начало:</strong> {formatDateTime(session.startAt)}
        </p>
        <p>
          <strong>Окончание:</strong> {formatDateTime(session.endAt)}
        </p>
        <p>
          <strong>Площадка:</strong> {session.venueName || '-'}
        </p>
        <p>
          <strong>Доступно мест:</strong> {session.availableSeats ?? '-'}
        </p>
      </div>

      <div className="organizer-session-card__actions">
        <button type="button" className="btn btn--ghost" onClick={() => onEdit(session)}>
          Редактировать
        </button>
        <button type="button" className="btn btn--danger" onClick={() => onDelete(session.id)} disabled={isDeleting}>
          {isDeleting ? 'Удаляем...' : 'Удалить'}
        </button>
      </div>
    </article>
  );
};

export default OrganizerSessionCard;


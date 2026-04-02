import { formatDateTime, formatTimeRange } from '../utils/formatters';

const OrganizerSessionCard = ({ session, isDeleting = false, onEdit, onDelete }) => {
  return (
    <article className="organizer-session-card">
      <h3>{formatTimeRange(session.startAt, session.endAt)}</h3>

      <div className="organizer-session-card__meta">
        <p>
          <strong>Дата начала:</strong> {formatDateTime(session.startAt)}
        </p>
        <p>
          <strong>Дата окончания:</strong> {formatDateTime(session.endAt)}
        </p>
        <p>
          <strong>Площадка:</strong> {session.venueName || '-'}
        </p>
        <p>
          <strong>Мест:</strong> {session.availableSeats ?? '-'} / {session.totalCapacity ?? '-'}
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

import { formatDateTime } from '../utils/formatters';

const SessionCard = ({ session, onRegisterClick }) => {
  const hasAvailableSeats = (session.availableSeats ?? 0) > 0;

  return (
    <article className="session-card">
      <div className="session-card__body">
        <h3 className="session-card__title">{session.title}</h3>
        <p className="session-card__description">{session.description || 'Описание сеанса пока не добавлено.'}</p>

        <div className="session-card__meta">
          <p>
            <strong>Начало:</strong> {formatDateTime(session.startAt)}
          </p>
          <p>
            <strong>Окончание:</strong> {formatDateTime(session.endAt)}
          </p>
          <p>
            <strong>Площадка:</strong> {session.venueName} ({session.cityName})
          </p>
          <p>
            <strong>Доступные места:</strong> {session.availableSeats ?? '-'} / {session.totalCapacity ?? '-'}
          </p>
        </div>

        <div className="session-card__actions">
          <button
            className="btn btn--primary"
            type="button"
            onClick={() => onRegisterClick(session)}
            disabled={!hasAvailableSeats}
          >
            {hasAvailableSeats ? 'Записаться' : 'Мест нет'}
          </button>
        </div>
      </div>
    </article>
  );
};

export default SessionCard;


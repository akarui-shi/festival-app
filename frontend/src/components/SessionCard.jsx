import { formatTimeRange } from '../utils/formatters';

const SessionCard = ({ session, onRegisterClick }) => {
  const hasAvailableSeats = (session.availableSeats ?? 0) > 0;
  const timeRange = formatTimeRange(session.startAt, session.endAt);

  return (
    <article className="session-card">
      <div className="session-card__time-row">
        <button
          className="session-card__time-chip"
          type="button"
          onClick={() => onRegisterClick(session)}
          disabled={!hasAvailableSeats}
        >
          {timeRange}
        </button>
        <div className="session-card__details">
          <p className="session-card__title">{session.title}</p>
          <p className="session-card__availability">
            {hasAvailableSeats
              ? `Свободно мест: ${session.availableSeats ?? '-'} / ${session.totalCapacity ?? '-'}`
              : 'Мест нет'}
          </p>
          {session.description && <p className="session-card__description">{session.description}</p>}
        </div>
      </div>
    </article>
  );
};

export default SessionCard;

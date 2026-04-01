import { formatDateTime, formatStatus } from '../utils/formatters';

const RegistrationCard = ({ registration, onCancel, isCancelling }) => {
  const isCancelled = registration.status === 'CANCELLED';

  return (
    <article className="registration-card">
      <div className="registration-card__header">
        <h3>{registration.eventTitle}</h3>
        <span className="registration-status">{formatStatus(registration.status)}</span>
      </div>

      <div className="registration-card__meta">
        <p>
          <strong>Сеанс:</strong> {registration.sessionTitle}
        </p>
        <p>
          <strong>Площадка:</strong> {registration.venueName}
        </p>
        <p>
          <strong>Дата и время:</strong> {formatDateTime(registration.startAt)}
        </p>
        <p>
          <strong>Количество мест:</strong> {registration.quantity}
        </p>
        <p>
          <strong>Дата создания:</strong> {formatDateTime(registration.createdAt)}
        </p>
      </div>

      <div className="qr-token-block">
        <span className="qr-token-label">QR-токен</span>
        <code className="qr-token-value">{registration.qrToken || '-'}</code>
      </div>

      <div className="registration-card__actions">
        <button
          className="btn btn--ghost"
          type="button"
          onClick={() => onCancel(registration.registrationId)}
          disabled={isCancelling || isCancelled}
        >
          {isCancelled ? 'Регистрация отменена' : isCancelling ? 'Отменяем...' : 'Отменить регистрацию'}
        </button>
      </div>
    </article>
  );
};

export default RegistrationCard;


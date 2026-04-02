import { useEffect, useState } from 'react';
import ErrorMessage from './ErrorMessage';
import { formatDateTime, formatTimeRange } from '../utils/formatters';

const RegistrationFormModal = ({ open, session, event, isSubmitting, error, onClose, onSubmit }) => {
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (open) {
      setQuantity(1);
    }
  }, [open, session?.id]);

  if (!open || !session) {
    return null;
  }

  const availableSeats = session.availableSeats ?? 0;

  const handleSubmit = (event) => {
    event.preventDefault();
    const parsedQuantity = Number(quantity);
    if (!Number.isInteger(parsedQuantity) || parsedQuantity < 1) {
      return;
    }
    onSubmit({ sessionId: session.id, quantity: parsedQuantity });
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="registration-title">
      <div className="modal">
        <h3 id="registration-title">Подтверждение записи</h3>
        <p className="page-subtitle">Зарегистрироваться на этот сеанс?</p>

        <div className="session-confirm">
          <p>
            <strong>Мероприятие:</strong> {event?.title || '—'}
          </p>
          <p>
            <strong>Дата:</strong> {formatDateTime(session.startAt)}
          </p>
          <p>
            <strong>Время:</strong> {formatTimeRange(session.startAt, session.endAt)}
          </p>
          {event?.venue?.name && (
            <p>
              <strong>Площадка:</strong> {event.venue.name}
            </p>
          )}
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <label>
            Количество мест
            <input
              type="number"
              min="1"
              max={availableSeats > 0 ? availableSeats : undefined}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              required
            />
          </label>

          <p className="muted">Свободно мест: {availableSeats}</p>
          {error && <ErrorMessage message={error} />}

          <div className="modal__actions">
            <button className="btn btn--ghost" type="button" onClick={onClose} disabled={isSubmitting}>
              Отмена
            </button>
            <button className="btn btn--primary" type="submit" disabled={isSubmitting || availableSeats < 1}>
              {isSubmitting ? 'Отправляем...' : 'Подтвердить запись'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegistrationFormModal;

import { formatDateTime, formatStatus } from '../utils/formatters';

const ReviewModerationCard = ({ review, processingAction = '', onUpdateStatus }) => {
  return (
    <article className="admin-card">
      <div className="admin-card__head">
        <h3>Отзыв #{review.reviewId}</h3>
        <span className="admin-status">{formatStatus(review.status)}</span>
      </div>

      <div className="admin-card__meta">
        <p>
          <strong>Пользователь:</strong> {review.userDisplayName || `#${review.userId}`}
        </p>
        <p>
          <strong>Мероприятие ID:</strong> {review.eventId ?? '-'}
        </p>
        <p>
          <strong>Оценка:</strong> {review.rating}
        </p>
        <p>
          <strong>Дата:</strong> {formatDateTime(review.createdAt)}
        </p>
      </div>

      <p className="admin-card__text">{review.text || 'Текст отзыва отсутствует.'}</p>

      <div className="admin-card__actions">
        <button
          type="button"
          className="btn btn--ghost"
          disabled={processingAction !== ''}
          onClick={() => onUpdateStatus(review.reviewId, 'APPROVED')}
        >
          {processingAction === 'APPROVED' ? 'Сохраняем...' : 'Одобрить'}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          disabled={processingAction !== ''}
          onClick={() => onUpdateStatus(review.reviewId, 'REJECTED')}
        >
          {processingAction === 'REJECTED' ? 'Сохраняем...' : 'Отклонить'}
        </button>
        <button
          type="button"
          className="btn btn--danger"
          disabled={processingAction !== ''}
          onClick={() => onUpdateStatus(review.reviewId, 'DELETED')}
        >
          {processingAction === 'DELETED' ? 'Сохраняем...' : 'Удалить'}
        </button>
      </div>
    </article>
  );
};

export default ReviewModerationCard;


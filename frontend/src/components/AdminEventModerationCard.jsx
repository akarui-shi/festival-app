import { formatDateTime, formatStatus } from '../utils/formatters';

const AdminEventModerationCard = ({ event, processingAction = '', onUpdateStatus }) => {
  return (
    <article className="admin-card">
      <div className="admin-card__head">
        <h3>Мероприятие #{event.id}</h3>
        <span className="admin-status">{formatStatus(event.status)}</span>
      </div>

      <div className="admin-card__meta">
        <p>
          <strong>Название:</strong> {event.title}
        </p>
        <p>
          <strong>Организатор:</strong> {event.organizerName || '-'}
        </p>
        <p>
          <strong>Категории:</strong> {(event.categories || []).map((category) => category.name).join(', ') || '-'}
        </p>
        <p>
          <strong>Создано:</strong> {formatDateTime(event.createdAt)}
        </p>
      </div>

      <div className="admin-card__actions">
        <button
          type="button"
          className="btn btn--ghost"
          disabled={processingAction !== ''}
          onClick={() => onUpdateStatus(event.id, 'PUBLISHED')}
        >
          {processingAction === 'PUBLISHED' ? 'Сохраняем...' : 'Одобрить'}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          disabled={processingAction !== ''}
          onClick={() => onUpdateStatus(event.id, 'REJECTED')}
        >
          {processingAction === 'REJECTED' ? 'Сохраняем...' : 'Отклонить'}
        </button>
        <button
          type="button"
          className="btn btn--danger"
          disabled={processingAction !== ''}
          onClick={() => onUpdateStatus(event.id, 'ARCHIVED')}
        >
          {processingAction === 'ARCHIVED' ? 'Сохраняем...' : 'В архив'}
        </button>
      </div>
    </article>
  );
};

export default AdminEventModerationCard;

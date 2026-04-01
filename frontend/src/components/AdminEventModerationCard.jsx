import { formatDateTime, formatStatus } from '../utils/formatters';

const EVENT_STATUS_ACTIONS = {
  DRAFT: ['ARCHIVED'],
  PENDING_APPROVAL: ['PUBLISHED', 'REJECTED', 'ARCHIVED'],
  PUBLISHED: ['REJECTED', 'ARCHIVED'],
  REJECTED: ['PUBLISHED', 'ARCHIVED'],
  ARCHIVED: ['PUBLISHED']
};

const ACTION_LABELS = {
  PUBLISHED: 'Одобрить',
  REJECTED: 'Отклонить',
  ARCHIVED: 'В архив'
};

const ACTION_VARIANTS = {
  PUBLISHED: 'btn btn--ghost',
  REJECTED: 'btn btn--ghost',
  ARCHIVED: 'btn btn--danger'
};

const AdminEventModerationCard = ({ event, processingAction = '', onUpdateStatus }) => {
  const actions = EVENT_STATUS_ACTIONS[event.status] || [];

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
        {actions.length === 0 && <p className="muted">Для этого статуса нет доступных действий.</p>}

        {actions.map((action) => (
          <button
            key={action}
            type="button"
            className={ACTION_VARIANTS[action] || 'btn btn--ghost'}
            disabled={processingAction !== ''}
            onClick={() => onUpdateStatus(event.id, action)}
          >
            {processingAction === action ? 'Сохраняем...' : (ACTION_LABELS[action] || action)}
          </button>
        ))}
      </div>
    </article>
  );
};

export default AdminEventModerationCard;

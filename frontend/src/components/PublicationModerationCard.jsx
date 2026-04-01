import { formatDateTime, formatStatus } from '../utils/formatters';

const PUBLICATION_STATUS_ACTIONS = {
  PENDING: ['PUBLISHED', 'REJECTED', 'DELETED'],
  PUBLISHED: ['REJECTED', 'DELETED'],
  REJECTED: ['PUBLISHED', 'DELETED'],
  DELETED: []
};

const ACTION_LABELS = {
  PUBLISHED: 'Одобрить',
  REJECTED: 'Отклонить',
  DELETED: 'Архивировать'
};

const ACTION_VARIANTS = {
  PUBLISHED: 'btn btn--ghost',
  REJECTED: 'btn btn--ghost',
  DELETED: 'btn btn--danger'
};

const PublicationModerationCard = ({ publication, processingAction = '', onUpdateStatus }) => {
  const actions = PUBLICATION_STATUS_ACTIONS[publication.status] || [];

  return (
    <article className="admin-card">
      <div className="admin-card__head">
        <h3>Публикация #{publication.publicationId}</h3>
        <span className="admin-status">{formatStatus(publication.status)}</span>
      </div>

      <div className="admin-card__meta">
        <p>
          <strong>Заголовок:</strong> {publication.title}
        </p>
        <p>
          <strong>Автор:</strong> {publication.authorName || '-'}
        </p>
        <p>
          <strong>Мероприятие:</strong> {publication.eventTitle || (publication.eventId != null ? `#${publication.eventId}` : '-')}
        </p>
        <p>
          <strong>Дата:</strong> {formatDateTime(publication.createdAt)}
        </p>
      </div>

      {publication.imageUrl && (
        <img src={publication.imageUrl} alt={publication.title} className="admin-publication-image" />
      )}

      <div className="admin-card__actions">
        {actions.length === 0 && <p className="muted">Для этого статуса нет доступных действий.</p>}

        {actions.map((action) => (
          <button
            key={action}
            type="button"
            className={ACTION_VARIANTS[action] || 'btn btn--ghost'}
            disabled={processingAction !== ''}
            onClick={() => onUpdateStatus(publication.publicationId, action)}
          >
            {processingAction === action ? 'Сохраняем...' : (ACTION_LABELS[action] || action)}
          </button>
        ))}
      </div>
    </article>
  );
};

export default PublicationModerationCard;

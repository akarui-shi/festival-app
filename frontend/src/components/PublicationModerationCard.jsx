import { formatDateTime, formatStatus } from '../utils/formatters';

const PublicationModerationCard = ({ publication, processingAction = '', onUpdateStatus }) => {
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
          <strong>Мероприятие ID:</strong> {publication.eventId ?? '-'}
        </p>
        <p>
          <strong>Дата:</strong> {formatDateTime(publication.createdAt)}
        </p>
      </div>

      <div className="admin-card__actions">
        <button
          type="button"
          className="btn btn--ghost"
          disabled={processingAction !== ''}
          onClick={() => onUpdateStatus(publication.publicationId, 'PUBLISHED')}
        >
          {processingAction === 'PUBLISHED' ? 'Сохраняем...' : 'Опубликовать'}
        </button>
        <button
          type="button"
          className="btn btn--ghost"
          disabled={processingAction !== ''}
          onClick={() => onUpdateStatus(publication.publicationId, 'REJECTED')}
        >
          {processingAction === 'REJECTED' ? 'Сохраняем...' : 'Отклонить'}
        </button>
        <button
          type="button"
          className="btn btn--danger"
          disabled={processingAction !== ''}
          onClick={() => onUpdateStatus(publication.publicationId, 'DELETED')}
        >
          {processingAction === 'DELETED' ? 'Сохраняем...' : 'Удалить'}
        </button>
      </div>
    </article>
  );
};

export default PublicationModerationCard;


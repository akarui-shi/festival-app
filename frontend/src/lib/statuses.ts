export interface StatusBadgeView {
  label: string;
  className: string;
}

function normalizeStatus(status?: string | null): string {
  return String(status || '')
    .trim()
    .replace(/\s+/g, '_')
    .toUpperCase();
}

const EVENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  ЧЕРНОВИК: 'Черновик',
  PENDING: 'На модерации',
  PENDING_APPROVAL: 'На модерации',
  ON_MODERATION: 'На модерации',
  НА_РАССМОТРЕНИИ: 'На модерации',
  PUBLISHED: 'Опубликовано',
  ОПУБЛИКОВАНО: 'Опубликовано',
  REJECTED: 'Отклонено',
  ОТКЛОНЕНО: 'Отклонено',
  CANCELLED: 'Отменено',
  CANCELED: 'Отменено',
  ОТМЕНЕНО: 'Отменено',
  ARCHIVED: 'В архиве',
  ЗАВЕРШЕНО: 'В архиве',
  HIDDEN: 'Скрыто',
  DELETED: 'Удалено',
  АРХИВИРОВАНО: 'В архиве',
  СКРЫТО: 'Скрыто',
  УДАЛЕНО: 'Удалено',
};

const PUBLICATION_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  PENDING: 'На модерации',
  PUBLISHED: 'Опубликовано',
  REJECTED: 'Отклонено',
  DELETED: 'Удалено',
  ЧЕРНОВИК: 'Черновик',
  НА_РАССМОТРЕНИИ: 'На модерации',
  ОПУБЛИКОВАНО: 'Опубликовано',
  ОТКЛОНЕНО: 'Отклонено',
  УДАЛЕНО: 'Удалено',
};

const REGISTRATION_STATUS_LABELS: Record<string, string> = {
  CREATED: 'Подтверждено',
  ACTIVE: 'Активен',
  CONFIRMED: 'Подтверждено',
  ATTENDED: 'Посещено',
  USED: 'Использован',
  RETURNED: 'Возвращён',
  PENDING_PAYMENT: 'Ожидает оплаты',
  PENDING: 'В обработке',
  PAID: 'Оплачен',
  SUCCEEDED: 'Оплачен',
  CANCELLED: 'Отменено',
  CANCELED: 'Отменено',
  EXPIRED: 'Истёк',
  FAILED: 'Ошибка',
  АКТИВЕН: 'Активен',
  ПОДТВЕРЖДЕНО: 'Подтверждено',
  ПОСЕЩЕНО: 'Посещено',
  ИСПОЛЬЗОВАН: 'Использован',
  ВОЗВРАЩЕН: 'Возвращён',
  ВОЗВРАЩЁН: 'Возвращён',
  ОЖИДАЕТ_ОПЛАТЫ: 'Ожидает оплаты',
  ОПЛАЧЕН: 'Оплачен',
  ОТМЕНЕНО: 'Отменено',
};

const JOIN_REQUEST_STATUS_LABELS: Record<string, string> = {
  PENDING: 'На рассмотрении',
  APPROVED: 'Одобрена',
  REJECTED: 'Отклонена',
  НА_РАССМОТРЕНИИ: 'На рассмотрении',
  ОДОБРЕНА: 'Одобрена',
  ОТКЛОНЕНА: 'Отклонена',
};

function eventStatusClass(key: string): string {
  if (['DRAFT', 'ЧЕРНОВИК'].includes(key)) return 'bg-muted text-muted-foreground';
  if (['PENDING', 'PENDING_APPROVAL', 'ON_MODERATION', 'НА_РАССМОТРЕНИИ'].includes(key)) return 'bg-warning/10 text-warning';
  if (['PUBLISHED', 'ОПУБЛИКОВАНО'].includes(key)) return 'bg-success/10 text-success';
  if (['REJECTED', 'ОТКЛОНЕНО', 'CANCELLED', 'CANCELED', 'ОТМЕНЕНО'].includes(key)) return 'bg-destructive/10 text-destructive';
  return 'bg-muted text-muted-foreground';
}

function publicationStatusClass(key: string): string {
  if (['PENDING', 'НА_РАССМОТРЕНИИ'].includes(key)) return 'bg-warning/10 text-warning';
  if (['PUBLISHED', 'ОПУБЛИКОВАНО'].includes(key)) return 'bg-success/10 text-success';
  if (['REJECTED', 'ОТКЛОНЕНО'].includes(key)) return 'bg-destructive/10 text-destructive';
  return 'bg-muted text-muted-foreground';
}

function registrationStatusClass(key: string): string {
  if (['CREATED', 'ACTIVE', 'CONFIRMED', 'ATTENDED', 'USED', 'АКТИВЕН', 'ПОДТВЕРЖДЕНО', 'ПОСЕЩЕНО', 'ИСПОЛЬЗОВАН'].includes(key)) {
    return 'bg-primary/10 text-primary';
  }
  if (['PENDING_PAYMENT', 'PENDING', 'ОЖИДАЕТ_ОПЛАТЫ'].includes(key)) {
    return 'bg-warning/10 text-warning';
  }
  if (['CANCELLED', 'CANCELED', 'RETURNED', 'FAILED', 'EXPIRED', 'ОТМЕНЕНО', 'ВОЗВРАЩЕН', 'ВОЗВРАЩЁН'].includes(key)) {
    return 'bg-destructive/10 text-destructive';
  }
  return 'bg-muted text-muted-foreground';
}

export function getEventStatusBadge(status?: string | null): StatusBadgeView {
  const key = normalizeStatus(status);
  return {
    label: EVENT_STATUS_LABELS[key] || 'Статус не указан',
    className: eventStatusClass(key),
  };
}

export function getPublicationStatusBadge(status?: string | null): StatusBadgeView {
  const key = normalizeStatus(status);
  return {
    label: PUBLICATION_STATUS_LABELS[key] || 'Статус не указан',
    className: publicationStatusClass(key),
  };
}

export function getRegistrationStatusBadge(status?: string | null): StatusBadgeView {
  const key = normalizeStatus(status);
  return {
    label: REGISTRATION_STATUS_LABELS[key] || 'Неизвестно',
    className: registrationStatusClass(key),
  };
}

export function isRegistrationActive(status?: string | null): boolean {
  const key = normalizeStatus(status);
  return ['ACTIVE', 'CONFIRMED', 'АКТИВЕН', 'ПОДТВЕРЖДЕНО'].includes(key);
}

export function getJoinRequestStatusLabel(status?: string | null): string {
  const key = normalizeStatus(status);
  return JOIN_REQUEST_STATUS_LABELS[key] || 'Неизвестный статус';
}

export function isJoinRequestPending(status?: string | null): boolean {
  const key = normalizeStatus(status);
  return key === 'PENDING' || key === 'НА_РАССМОТРЕНИИ';
}

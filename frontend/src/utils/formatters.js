export const formatDateTime = (value) => {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleString('ru-RU');
  } catch {
    return value;
  }
};

const ROLE_LABELS = {
  RESIDENT: 'Житель',
  ORGANIZER: 'Организатор',
  ADMIN: 'Администратор'
};

const STATUS_LABELS = {
  PENDING_APPROVAL: 'На согласовании',
  DRAFT: 'Черновик',
  PENDING: 'На модерации',
  APPROVED: 'Одобрено',
  REJECTED: 'Отклонено',
  DELETED: 'Удалено',
  PUBLISHED: 'Опубликовано',
  CREATED: 'Создано',
  CONFIRMED: 'Подтверждено',
  CANCELLED: 'Отменено',
  ACTIVE: 'Активно',
  INACTIVE: 'Неактивно',
  PLANNED: 'Запланировано',
  ARCHIVED: 'В архиве'
};

export const formatRole = (role) => {
  if (!role) return '-';
  return ROLE_LABELS[role] || role;
};

export const formatStatus = (status) => {
  if (!status) return '-';
  return STATUS_LABELS[status] || status;
};

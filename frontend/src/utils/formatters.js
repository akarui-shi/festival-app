export const formatDateTime = (value) => {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleString('ru-RU');
  } catch {
    return value;
  }
};

export const formatTime = (value) => {
  if (!value) return '--:--';

  try {
    return new Date(value).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
};

export const formatTimeRange = (startAt, endAt) => `${formatTime(startAt)}-${formatTime(endAt)}`;

export const formatSessionDayLabel = (value) => {
  if (!value) return 'Дата не указана';

  try {
    return new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
  } catch {
    return value;
  }
};

const pluralizeDays = (count) => {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (mod10 === 1 && mod100 !== 11) {
    return `${count} день`;
  }
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} дня`;
  }
  return `${count} дней`;
};

export const formatRelativeSessionDate = (value) => {
  if (!value) return '';

  const start = new Date(value);
  if (Number.isNaN(start.getTime())) {
    return '';
  }

  const today = new Date();
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const diffDays = Math.round((startDay.getTime() - todayDay.getTime()) / (24 * 60 * 60 * 1000));

  if (diffDays < 0) return 'Уже прошло';
  if (diffDays === 0) return 'Сегодня';
  if (diffDays === 1) return 'Завтра';
  if (diffDays === 7) return 'Через неделю';
  if (diffDays === 14) return 'Через 2 недели';
  return `Через ${pluralizeDays(diffDays)}`;
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

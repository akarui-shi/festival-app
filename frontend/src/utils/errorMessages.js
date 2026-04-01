const MESSAGE_MAP = [
  { match: ['access denied'], message: 'Недостаточно прав для выполнения этого действия.' },
  { match: ['unauthorized', 'forbidden'], message: 'Требуется авторизация для выполнения действия.' },
  { match: ['event not found'], message: 'Мероприятие не найдено.' },
  { match: ['review not found'], message: 'Отзыв не найден.' },
  { match: ['publication not found'], message: 'Публикация не найдена.' },
  { match: ['duplicate review'], message: 'Вы уже оставили отзыв на это мероприятие.' },
  { match: ['duplicate favorite'], message: 'Это мероприятие уже добавлено в избранное.' },
  { match: ['нарушение целостности данных', 'data integrity violation'], message: 'Операция не выполнена: у мероприятия есть связанные данные.' },
  { match: ['could not execute statement', 'constraint'], message: 'Операция не выполнена: проверьте связанные данные.' },
  { match: ['validation failed'], message: 'Проверьте правильность заполнения полей.' }
];

export const toUserErrorMessage = (error, fallbackMessage) => {
  const raw = (error?.message || '').trim();
  if (!raw) {
    return fallbackMessage;
  }

  const lower = raw.toLowerCase();
  const mapped = MESSAGE_MAP.find((item) => item.match.some((keyword) => lower.includes(keyword)));
  if (mapped) {
    return mapped.message;
  }

  if (raw.startsWith('Ошибка запроса. Код:')) {
    return fallbackMessage;
  }

  return raw;
};

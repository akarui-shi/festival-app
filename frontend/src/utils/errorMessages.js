const MESSAGE_MAP = [
  { match: ['логин уже занят', 'login already exists'], message: 'Этот логин уже используется.' },
  { match: ['электронная почта уже используется', 'email already exists'], message: 'Эта электронная почта уже используется.' },
  { match: ['телефон уже используется'], message: 'Этот номер телефона уже используется.' },
  { match: ['неверный логин/email или пароль', 'invalid credentials'], message: 'Неверный логин (или email) либо пароль.' },
  { match: ['введите логин'], message: 'Введите логин.' },
  { match: ['введите электронную почту', 'email is required'], message: 'Введите электронную почту.' },
  { match: ['введите пароль', 'password is required'], message: 'Введите пароль.' },
  { match: ['корректный адрес электронной почты', 'must be a well-formed email address'], message: 'Введите корректную электронную почту.' },
  { match: ['логин должен содержать от 3 до 64 символов'], message: 'Логин должен содержать от 3 до 64 символов.' },
  { match: ['пароль должен содержать от 6 до 128 символов'], message: 'Пароль должен содержать от 6 до 128 символов.' },
  { match: ['size must be between 6 and 128'], message: 'Пароль должен содержать от 6 до 128 символов.' },
  { match: ['size must be between 3 and 64'], message: 'Логин должен содержать от 3 до 64 символов.' },
  { match: ['access denied'], message: 'Недостаточно прав для выполнения этого действия.' },
  { match: ['unauthorized', 'forbidden'], message: 'Требуется авторизация для выполнения действия.' },
  { match: ['event not found'], message: 'Мероприятие не найдено.' },
  { match: ['review not found'], message: 'Отзыв не найден.' },
  { match: ['publication not found'], message: 'Публикация не найдена.' },
  { match: ['duplicate review'], message: 'Вы уже оставили отзыв на это мероприятие.' },
  { match: ['duplicate favorite'], message: 'Это мероприятие уже добавлено в избранное.' },
  { match: ['only image files are allowed'], message: 'Можно загружать только изображения.' },
  { match: ['file size is too large', 'maximum upload size exceeded'], message: 'Размер файла превышает допустимый лимит.' },
  { match: ['file is required'], message: 'Выберите файл для загрузки.' },
  { match: ['нарушение целостности данных', 'data integrity violation'], message: 'Операция не выполнена: у мероприятия есть связанные данные.' },
  { match: ['could not execute statement', 'constraint'], message: 'Операция не выполнена: проверьте связанные данные.' },
  { match: ['validation failed', 'проверьте корректность заполнения полей'], message: 'Проверьте правильность заполнения полей.' }
];

const FIELD_LABELS = {
  login: 'Логин',
  email: 'Электронная почта',
  password: 'Пароль',
  firstName: 'Имя',
  lastName: 'Фамилия',
  phone: 'Телефон',
  loginOrEmail: 'Логин или электронная почта'
};

const formatValidationDetails = (error) => {
  const details = error?.payload?.details;
  if (!details || typeof details !== 'object') {
    return '';
  }

  const entries = Object.entries(details).filter(([, value]) => typeof value === 'string' && value.trim());
  if (entries.length === 0) {
    return '';
  }

  const [field, message] = entries[0];
  const label = FIELD_LABELS[field] || field;
  return `${label}: ${message.trim()}`;
};

export const toUserErrorMessage = (error, fallbackMessage) => {
  const validationDetailsMessage = formatValidationDetails(error);
  if (validationDetailsMessage) {
    return validationDetailsMessage;
  }

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

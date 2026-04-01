export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';

export const YANDEX_MAPS_API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY || '';
export const YANDEX_MAPS_SUGGEST_API_KEY = import.meta.env.VITE_YANDEX_MAPS_SUGGEST_API_KEY || '';
export const YANDEX_MAPS_LANG = import.meta.env.VITE_YANDEX_MAPS_LANG || 'ru_RU';

export const buildYandexMapsQuery = () => {
  const query = {
    lang: YANDEX_MAPS_LANG,
    load: 'package.full'
  };

  if (YANDEX_MAPS_API_KEY) {
    query.apikey = YANDEX_MAPS_API_KEY;
  }
  if (YANDEX_MAPS_SUGGEST_API_KEY) {
    query.suggest_apikey = YANDEX_MAPS_SUGGEST_API_KEY;
  }

  return query;
};

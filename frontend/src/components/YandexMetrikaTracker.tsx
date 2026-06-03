import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackYandexPageView } from '@/services/yandex-metrika';

export function YandexMetrikaTracker() {
  const location = useLocation();

  useEffect(() => {
    trackYandexPageView(`${location.pathname}${location.search}${location.hash}`);
  }, [location.pathname, location.search, location.hash]);

  return null;
}

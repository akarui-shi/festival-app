import { useEffect, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import { useCity } from '@/contexts/CityContext';
import { Button } from '@/components/ui/button';
import type { City } from '@/types';

/**
 * Баннер «Ваш город — Москва? Да / Нет».
 *
 * Логика:
 * 1. Срабатывает только если у пользователя ещё не выбран город (после очистки кэша
 *    или первого визита) и список городов уже загружен.
 * 2. Делает один запрос к бесплатному IP-геолокатору (ipapi.co), достаёт название
 *    города и регион, ищет соответствие в нашем справочнике.
 * 3. Если нашёлся — показывает баннер с подтверждением.
 * 4. Пользователь может: «Да» — выбрать предложенный город; «Нет» — спрятать
 *    баннер (откроется обычный модальный селектор города из PublicLayout).
 * 5. Решение «Нет» запоминается в localStorage, чтобы баннер не появлялся снова
 *    при каждом обновлении страницы.
 */
const DISMISS_KEY = 'festival.cityAutodetectDismissed';
const GEO_TIMEOUT_MS = 4000;

interface DetectedLocation {
  city: string | null;
  region: string | null;
}

async function detectLocation(): Promise<DetectedLocation | null> {
  // ipapi.co отдаёт результат бесплатно без API-ключа, ограничение ~1000 запросов в день с одного IP.
  // Делаем короткий таймаут, чтобы баннер не задерживал UX, если сервис недоступен.
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), GEO_TIMEOUT_MS);
  try {
    const response = await fetch('https://ipapi.co/json/', { signal: controller.signal });
    if (!response.ok) return null;
    const data = await response.json();
    return {
      city: typeof data.city === 'string' ? data.city : null,
      region: typeof data.region === 'string' ? data.region : null,
    };
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

function findMatchingCity(cities: City[], detected: DetectedLocation): City | null {
  if (!detected.city) return null;
  const wanted = detected.city.trim().toLowerCase();
  // Ищем сперва точное совпадение по имени; если ничего, пробуем по подстроке.
  const exact = cities.find((city) => city.name.trim().toLowerCase() === wanted);
  if (exact) return exact;
  const partial = cities.find((city) => city.name.trim().toLowerCase().includes(wanted));
  return partial ?? null;
}

export function CityAutoDetectBanner() {
  const { cities, selectedCity, loading, setSelectedCityById } = useCity();
  const [suggestion, setSuggestion] = useState<City | null>(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    // Не работаем, пока список городов ещё не пришёл.
    if (loading || selectedCity || cities.length === 0) return;
    // Пользователь уже однажды отказался — не беспокоим.
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === '1';
    } catch {
      // localStorage может быть недоступен (private mode) — игнорируем.
    }
    if (dismissed) return;

    let cancelled = false;
    detectLocation().then((detected) => {
      if (cancelled || !detected) return;
      const match = findMatchingCity(cities, detected);
      if (match) {
        setSuggestion(match);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loading, selectedCity, cities]);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // ignore
    }
    setHidden(true);
  };

  if (hidden || !suggestion || selectedCity) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 z-[70] w-[min(92vw,420px)] -translate-x-1/2 rounded-2xl border border-border bg-card p-4 shadow-card">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <MapPin className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-base text-foreground">
            Ваш город — {suggestion.name}?
          </p>
          {suggestion.region && (
            <p className="mt-0.5 text-xs text-muted-foreground">{suggestion.region}</p>
          )}
          <div className="mt-3 flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => {
                setSelectedCityById(String(suggestion.id));
                setSuggestion(null);
              }}
            >
              Да
            </Button>
            <Button size="sm" variant="ghost" onClick={dismiss}>
              Нет, выбрать другой
            </Button>
          </div>
        </div>
        <button
          type="button"
          aria-label="Закрыть баннер автоопределения города"
          className="-m-1 rounded p-1 text-muted-foreground transition-colors hover:text-foreground"
          onClick={dismiss}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

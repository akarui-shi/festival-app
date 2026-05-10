import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Loader2, MapPin, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { imageSrc } from '@/lib/image';
import { loadYandexMapsApi } from '@/services/yandex-maps-service';
import { applyMinimalYandexMapUi, createClustererOptions, createPlacemarkOptions, YANDEX_MAP_MINIMAL_OPTIONS } from '@/lib/yandex-map-ui';
import type { Event } from '@/types';

interface Props {
  events: Event[];
}

function resolveCoords(event: Event): [number, number] | null {
  const lat = event.latitude ?? event.venue?.latitude ?? null;
  const lng = event.longitude ?? event.venue?.longitude ?? null;
  if (lat != null && lng != null && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
    return [Number(lat), Number(lng)];
  }
  return null;
}

function formatPrice(event: Event): string {
  if (event.free || event.isFree) return 'Бесплатно';
  if (typeof event.minPrice === 'number') return `от ${event.minPrice.toLocaleString('ru-RU')} ₽`;
  return 'Цена уточняется';
}

// Округление до 5 знаков (~1 м) — единый ключ группировки совпадающих по точке событий.
function coordKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)}|${lng.toFixed(5)}`;
}

/** Простая русская плюрализация: 1 мероприятие, 2 мероприятия, 5 мероприятий. */
function pluralize(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

export function EventsCatalogMap({ events }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const clustererRef = useRef<any>(null);
  // Map<eventId, Placemark> — нужен, чтобы менять иконку конкретной метки при выборе.
  const placemarksRef = useRef<Map<string, any>>(new Map());

  const [mapState, setMapState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [activeCoordKey, setActiveCoordKey] = useState<string | null>(null);

  // Группируем события по координате (метка одна на точку, в попапе — список).
  const eventsByCoord = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const e of events) {
      const coords = resolveCoords(e);
      if (!coords) continue;
      const key = coordKey(coords[0], coords[1]);
      const arr = map.get(key);
      if (arr) arr.push(e);
      else map.set(key, [e]);
    }
    return map;
  }, [events]);

  const eventsWithCoords = useMemo(
    () => events.filter((e) => resolveCoords(e) !== null),
    [events],
  );

  const activeEvents = activeCoordKey ? eventsByCoord.get(activeCoordKey) ?? [] : [];
  const hasStacks = useMemo(
    () => Array.from(eventsByCoord.values()).some((list) => list.length > 1),
    [eventsByCoord],
  );

  // Инициализация карты + кластеризатор. Запускаем один раз — далее метки
  // перерисовываются отдельным эффектом по изменению eventsByCoord.
  useEffect(() => {
    let destroyed = false;

    loadYandexMapsApi()
      .then((ymaps) => {
        if (destroyed || !containerRef.current) return;

        const firstCoords = eventsWithCoords.length > 0
          ? resolveCoords(eventsWithCoords[0])!
          : [55.751244, 37.618423];

        const map = new ymaps.Map(
          containerRef.current,
          { center: firstCoords as [number, number], zoom: 11, controls: ['zoomControl'] },
          YANDEX_MAP_MINIMAL_OPTIONS,
        );
        applyMinimalYandexMapUi(map);
        mapRef.current = map;

        const clusterer = new ymaps.Clusterer(createClustererOptions(ymaps));
        clustererRef.current = clusterer;
        map.geoObjects.add(clusterer);

        // Клик по пустому месту карты — скрываем попап.
        map.events.add('click', () => setActiveCoordKey(null));

        if (!destroyed) setMapState('ready');
      })
      .catch(() => {
        if (!destroyed) setMapState('error');
      });

    return () => {
      destroyed = true;
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
        clustererRef.current = null;
        placemarksRef.current.clear();
      }
    };
    // Намеренно пустые зависимости: карта создаётся один раз, метки добавляются ниже.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Перерисовка меток при изменении группировки событий.
  useEffect(() => {
    if (mapState !== 'ready' || !mapRef.current || !clustererRef.current || !window.ymaps) return;
    const ymaps = window.ymaps;
    clustererRef.current.removeAll();
    placemarksRef.current.clear();

    const placemarks: any[] = [];
    for (const [key, list] of eventsByCoord.entries()) {
      const head = list[0];
      const coords = resolveCoords(head)!;
      const hint = list.length === 1
        ? head.title
        : `${list.length} ${pluralize(list.length, ['мероприятие', 'мероприятия', 'мероприятий'])} в этой точке`;

      const pm = new ymaps.Placemark(
        coords,
        { hintContent: hint },
        createPlacemarkOptions({ count: list.length }),
      );
      pm.events.add('click', (e: any) => {
        e.stopPropagation?.();
        setActiveCoordKey(key);
      });
      for (const ev of list) {
        placemarksRef.current.set(String(ev.id), pm);
      }
      placemarks.push(pm);
    }
    clustererRef.current.add(placemarks);

    // Авто-фит границ при наличии нескольких меток.
    if (placemarks.length > 1) {
      try {
        const bounds = mapRef.current.geoObjects.getBounds();
        if (bounds) {
          mapRef.current.setBounds(bounds, { checkZoomRange: true, zoomMargin: 40 });
        }
      } catch {
        // bounds могут быть недоступны до рендеринга — игнорируем.
      }
    } else if (placemarks.length === 1) {
      const head = Array.from(eventsByCoord.values())[0][0];
      const coords = resolveCoords(head)!;
      mapRef.current.setCenter(coords, 13, { duration: 400 });
    }
  }, [eventsByCoord, mapState]);

  // Подсветка активной метки — золотистая, увеличенная.
  useEffect(() => {
    if (mapState !== 'ready') return;
    for (const [, pm] of placemarksRef.current) {
      const coords = pm.geometry?.getCoordinates?.();
      let count = 1;
      if (Array.isArray(coords)) {
        const k = coordKey(coords[0], coords[1]);
        count = eventsByCoord.get(k)?.length ?? 1;
      }
      pm.options.set(createPlacemarkOptions({ active: false, count }));
    }
    if (activeCoordKey) {
      const list = eventsByCoord.get(activeCoordKey);
      if (list && list.length > 0) {
        const pm = placemarksRef.current.get(String(list[0].id));
        if (pm) pm.options.set(createPlacemarkOptions({ active: true, count: list.length }));
      }
    }
  }, [activeCoordKey, eventsByCoord, mapState]);

  // Empty-state.
  if (eventsWithCoords.length === 0) {
    return (
      <div className="flex h-[520px] flex-col items-center justify-center rounded-2xl border border-border bg-muted text-center">
        <MapPin className="h-10 w-10 text-muted-foreground/40" />
        <p className="mt-3 text-sm font-medium text-foreground">Нет мероприятий с указанными координатами</p>
        <p className="mt-1 text-xs text-muted-foreground">Координаты задаются при создании мероприятия</p>
      </div>
    );
  }

  return (
    <div className="ymap-clean relative overflow-hidden rounded-2xl border border-border">
      <div ref={containerRef} className="h-[520px] w-full" />

      {mapState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/70">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {mapState === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/70">
          <p className="text-sm text-muted-foreground">Не удалось загрузить карту</p>
        </div>
      )}

      {/* Счётчик в правом верхнем углу: количество меток + флажок «есть стопки». */}
      <div className="absolute right-4 top-4 flex items-center gap-2">
        <div className="rounded-full bg-card/90 px-3 py-1 text-xs font-semibold text-foreground shadow backdrop-blur-sm">
          {eventsWithCoords.length} на карте
        </div>
        {hasStacks && (
          <div className="inline-flex items-center gap-1 rounded-full bg-card/90 px-2.5 py-1 text-xs text-muted-foreground shadow backdrop-blur-sm">
            <Layers className="h-3 w-3 text-primary" />
            Есть точки с несколькими событиями
          </div>
        )}
      </div>

      {/* Попап с одним или несколькими событиями выбранной точки. */}
      {activeEvents.length > 0 && (
        <div className="absolute bottom-4 left-4 z-10 max-h-[60vh] w-[min(92%,360px)] overflow-hidden rounded-2xl border border-border bg-card shadow-card">
          <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
              {activeEvents.length > 1 ? (
                <>
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  {activeEvents.length} {pluralize(activeEvents.length, ['мероприятие', 'мероприятия', 'мероприятий'])} в одной точке
                </>
              ) : (
                <>
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  Мероприятие
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setActiveCoordKey(null)}
              className="-mr-1 rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Закрыть"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <ul className="max-h-[calc(60vh-3rem)] divide-y divide-border overflow-y-auto">
            {activeEvents.map((event) => {
              const thumbId = event.coverImageId ?? event.eventImages?.[0]?.imageId ?? null;
              return (
                <li key={event.id} className="px-4 py-3">
                  <Link
                    to={`/events/${event.id}`}
                    className="-m-1 flex items-start gap-3 rounded-lg p-1 transition-colors hover:bg-muted/60"
                  >
                    {thumbId != null ? (
                      <img
                        src={imageSrc(Number(thumbId))}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <MapPin className="h-5 w-5 text-primary/60" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold text-foreground">{event.title}</p>
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {event.cityName ?? event.city?.name ?? 'Город уточняется'}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">{formatPrice(event)}</Badge>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Layers, MapPin, Search, X } from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCity } from '@/contexts/CityContext';
import { eventService } from '@/services/event-service';
import { loadYandexMapsApi } from '@/services/yandex-maps-service';
import { applyMinimalYandexMapUi, createClustererOptions, createPlacemarkOptions, YANDEX_MAP_MINIMAL_OPTIONS } from '@/lib/yandex-map-ui';
import { imageSrc } from '@/lib/image';
import type { Event, Id } from '@/types';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' }).format(date);
}

// Округляем координаты до 5 знаков (~1 метр на экваторе) — это ключ группировки
// событий в одной точке. Без округления два события со «случайно» одинаковым адресом,
// но микроскопически разными lat/lng не сгруппируются.
function coordKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)}|${lng.toFixed(5)}`;
}

export default function EventMapPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const clustererRef = useRef<any>(null);
  const hasInitialFitRef = useRef(false);
  const cityZoomedRef = useRef(false);
  // Map<eventId, Placemark> — нужен, чтобы менять иконку конкретной метки
  // при выборе/наведении из бокового списка.
  const placemarksRef = useRef<Map<string, any>>(new Map());
  // Map<eventId, ref на DOM-карточку слева> — для авто-скролла к выбранному.
  const cardRefs = useRef<Map<string, HTMLButtonElement | null>>(new Map());

  const { selectedCity } = useCity();
  const [events, setEvents] = useState<Event[]>([]);
  const [filtered, setFiltered] = useState<Event[]>([]);
  const [search, setSearch] = useState('');
  // Идентификатор активной точки (а не одного события): когда в точке несколько
  // событий, попап показывает список всех.
  const [activeCoordKey, setActiveCoordKey] = useState<string | null>(null);
  // Hover-подсветка из бокового списка (без открытия попапа).
  const [hoveredEventId, setHoveredEventId] = useState<Id | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState('');

  // Загружаем мероприятия выбранного города (или все, если город не выбран).
  useEffect(() => {
    hasInitialFitRef.current = false;
    cityZoomedRef.current = false;
    eventService.getEvents({ size: 200, cityId: selectedCity?.id })
      .then((res) => {
        const withCoords = res.content.filter((e) => e.latitude != null && e.longitude != null);
        setEvents(withCoords);
        setFiltered(withCoords);
      })
      .catch(() => {});
  }, [selectedCity?.id]);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    setFiltered(
      q
        ? events.filter((e) => e.title?.toLowerCase().includes(q) || e.venueName?.toLowerCase().includes(q))
        : events,
    );
  }, [search, events]);

  // Группировка событий по координатам — Map<coordKey, Event[]>.
  // Это то, что мы рисуем на карте: ОДНА метка на координату, в попапе СПИСОК событий.
  const eventsByCoord = useMemo(() => {
    const map = new Map<string, Event[]>();
    for (const e of filtered) {
      if (e.latitude == null || e.longitude == null) continue;
      const key = coordKey(e.latitude, e.longitude);
      const arr = map.get(key);
      if (arr) arr.push(e);
      else map.set(key, [e]);
    }
    return map;
  }, [filtered]);

  // Для каждого события — его coord-key, чтобы клик по карточке слева находил нужную метку.
  const eventCoordKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const [key, list] of eventsByCoord.entries()) {
      for (const e of list) map.set(String(e.id), key);
    }
    return map;
  }, [eventsByCoord]);

  // Активные события для попапа.
  const activeEvents = activeCoordKey ? eventsByCoord.get(activeCoordKey) ?? [] : [];

  // Инициализация карты — один раз.
  useEffect(() => {
    let destroyed = false;

    loadYandexMapsApi()
      .then((ymaps) => {
        if (destroyed || !mapContainerRef.current) return;

        const map = new ymaps.Map(
          mapContainerRef.current,
          { center: [55.75, 37.57], zoom: 5, controls: ['zoomControl'] },
          YANDEX_MAP_MINIMAL_OPTIONS,
        );
        applyMinimalYandexMapUi(map);
        mapRef.current = map;

        const clusterer = new ymaps.Clusterer(createClustererOptions(ymaps));
        clustererRef.current = clusterer;
        map.geoObjects.add(clusterer);

        // Клик по пустому месту карты — скрываем попап.
        map.events.add('click', () => setActiveCoordKey(null));

        setMapLoaded(true);
      })
      .catch(() => setMapError('Не удалось загрузить карту'));

    return () => {
      destroyed = true;
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
        clustererRef.current = null;
        placemarksRef.current.clear();
      }
    };
  }, []);

  // Перерисовка меток при изменении группировки. Каждая метка соответствует
  // ОДНОЙ координате — на ней может быть до N событий, в попапе будет список.
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !clustererRef.current || !window.ymaps) return;

    const ymaps = window.ymaps;
    clustererRef.current.removeAll();
    placemarksRef.current.clear();

    const placemarks: any[] = [];
    for (const [key, list] of eventsByCoord.entries()) {
      const head = list[0];
      const lat = head.latitude!;
      const lng = head.longitude!;
      const hint = list.length === 1
        ? head.title
        : `${list.length} ${pluralize(list.length, ['мероприятие', 'мероприятия', 'мероприятий'])} в этой точке`;
      const pm = new ymaps.Placemark(
        [lat, lng],
        { hintContent: hint },
        createPlacemarkOptions({ count: list.length }),
      );
      pm.events.add('click', (e: any) => {
        // Останавливаем всплытие, чтобы клик по самой карте не закрыл попап.
        e.stopPropagation?.();
        setActiveCoordKey(key);
      });
      // Привязываем метку к каждому id событий, чтобы можно было найти по eventId.
      for (const ev of list) {
        placemarksRef.current.set(String(ev.id), pm);
      }
      placemarks.push(pm);
    }

    clustererRef.current.add(placemarks);

    if (!hasInitialFitRef.current && placemarks.length > 0) {
      hasInitialFitRef.current = true;
      if (placemarks.length === 1) {
        const head = Array.from(eventsByCoord.values())[0][0];
        mapRef.current.setCenter([head.latitude!, head.longitude!], 14, { duration: 500 });
      } else {
        try {
          const bounds = mapRef.current.geoObjects.getBounds();
          if (bounds) {
            mapRef.current.setBounds(bounds, {
              checkZoomRange: true,
              zoomMargin: 48,
              duration: 500,
            });
          }
        } catch {
          // Bounds can be unavailable during the first render tick.
        }
      }
    }
  }, [eventsByCoord, mapLoaded]);

  // Подсветка активной/наведённой метки. Работает напрямую через options.set:
  // меняем иконку без перерисовки всей кластеризации.
  useEffect(() => {
    if (!mapLoaded) return;
    const highlightedKey = activeCoordKey
      ?? (hoveredEventId ? eventCoordKey.get(String(hoveredEventId)) ?? null : null);

    // Сбрасываем все метки в дефолт, активную/наведённую делаем «active».
    for (const [, pm] of placemarksRef.current) {
      // count берём по координате этой метки.
      const coords = pm.geometry?.getCoordinates?.();
      let count = 1;
      if (Array.isArray(coords)) {
        const k = coordKey(coords[0], coords[1]);
        count = eventsByCoord.get(k)?.length ?? 1;
      }
      pm.options.set(createPlacemarkOptions({ active: false, count }));
    }
    if (highlightedKey) {
      const list = eventsByCoord.get(highlightedKey);
      if (list && list.length > 0) {
        // Все ивенты этой точки указывают на ОДНУ метку — берём первую.
        const pm = placemarksRef.current.get(String(list[0].id));
        if (pm) {
          pm.options.set(createPlacemarkOptions({ active: true, count: list.length }));
        }
      }
    }
  }, [activeCoordKey, hoveredEventId, eventsByCoord, eventCoordKey, mapLoaded]);

  // Авто-зум на выбранный город.
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !selectedCity || cityZoomedRef.current) return;

    loadYandexMapsApi().then((ymaps) => {
      ymaps.geocode(`${selectedCity.name}, Россия`, { results: 1, kind: 'locality' })
        .then((result: any) => {
          if (!mapRef.current || cityZoomedRef.current) return;
          const obj = result.geoObjects.get(0);
          if (!obj) return;
          if (eventsByCoord.size > 0) {
            cityZoomedRef.current = true;
            return;
          }

          const bounds = obj.properties.get('boundedBy');
          if (bounds) {
            mapRef.current.setBounds(bounds, { checkZoomRange: true, zoomMargin: 30, duration: 600 });
          } else {
            const coords = obj.geometry.getCoordinates();
            if (coords) mapRef.current.setCenter(coords, 10, { duration: 600 });
          }
          cityZoomedRef.current = true;
        })
        .catch(() => {});
    });
  }, [eventsByCoord.size, mapLoaded, selectedCity]);

  // При выборе точки — скроллим к первой её карточке в боковом списке,
  // если карточка вне видимой области.
  useEffect(() => {
    if (!activeCoordKey) return;
    const list = eventsByCoord.get(activeCoordKey);
    if (!list || list.length === 0) return;
    const node = cardRefs.current.get(String(list[0].id));
    node?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeCoordKey, eventsByCoord]);

  /**
   * Клик по карточке слева:
   * - центрирует карту на координатах события (без излишнего зума, если уже близко),
   * - открывает попап в этой точке (где могут быть и другие события).
   */
  const flyTo = (event: Event) => {
    const key = eventCoordKey.get(String(event.id));
    if (!key) return;
    setActiveCoordKey(key);
    if (mapRef.current && event.latitude != null && event.longitude != null) {
      const currentZoom = mapRef.current.getZoom?.() ?? 10;
      const targetZoom = currentZoom < 14 ? 14 : currentZoom;
      mapRef.current.setCenter([event.latitude, event.longitude], targetZoom, { duration: 500 });
    }
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="font-heading text-3xl text-foreground">Карта мероприятий</h1>
          <p className="mt-1 text-muted-foreground">
            {selectedCity
              ? `События в городе ${selectedCity.name}`
              : 'Найдите события рядом с вами'}
          </p>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Sidebar — список мероприятий с поиском. */}
          <aside className="flex w-full flex-col gap-3 lg:w-80 lg:shrink-0">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск по названию или месту..."
                className="pl-9"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Очистить поиск"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Найдено: {filtered.length}</span>
              {/* Подсказка о точках со стопками — появляется, когда есть совпадающие координаты. */}
              {Array.from(eventsByCoord.values()).some((list) => list.length > 1) && (
                <span className="inline-flex items-center gap-1 text-xs">
                  <Layers className="h-3 w-3" />
                  Есть точки с несколькими событиями
                </span>
              )}
            </div>

            <div className="max-h-[calc(100vh-22rem)] space-y-2 overflow-y-auto pr-1">
              {filtered.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {selectedCity
                    ? `В городе ${selectedCity.name} пока нет мероприятий с координатами`
                    : 'Нет мероприятий с координатами'}
                </p>
              )}
              {filtered.map((e) => {
                const key = eventCoordKey.get(String(e.id));
                const stackSize = key ? eventsByCoord.get(key)?.length ?? 1 : 1;
                const isActive = key !== undefined && key === activeCoordKey;
                return (
                  <button
                    key={e.id}
                    ref={(node) => {
                      cardRefs.current.set(String(e.id), node);
                    }}
                    type="button"
                    onClick={() => flyTo(e)}
                    onMouseEnter={() => setHoveredEventId(e.id)}
                    onMouseLeave={() => setHoveredEventId((prev) => (prev === e.id ? null : prev))}
                    className={`w-full rounded-xl border p-3 text-left transition-all hover:border-primary/40 hover:shadow-soft ${
                      isActive ? 'border-primary/50 bg-primary/5 shadow-soft' : 'border-border bg-card'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-1 flex-1 text-sm font-semibold text-foreground">{e.title}</p>
                      {/* Бейдж «эта точка содержит N событий» — подсказка, что метка кликабельна. */}
                      {stackSize > 1 && (
                        <Badge variant="outline" className="shrink-0 gap-1 px-1.5 text-[10px]">
                          <Layers className="h-2.5 w-2.5" />
                          {stackSize}
                        </Badge>
                      )}
                    </div>
                    {e.venueName && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="line-clamp-1">{e.venueName}</span>
                      </p>
                    )}
                    {e.startDate && (
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 shrink-0" />
                        {formatDate(e.startDate)}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Карта + всплывающий попап с одним или несколькими событиями. */}
          <div className="relative flex-1">
            <div
              ref={mapContainerRef}
              className="ymap-clean h-[500px] w-full overflow-hidden rounded-2xl border border-border lg:h-[calc(100vh-14rem)]"
            />

            {mapError && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-muted/80">
                <p className="text-sm text-muted-foreground">{mapError}</p>
              </div>
            )}

            {!mapLoaded && !mapError && (
              <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-muted/60">
                <p className="text-sm text-muted-foreground animate-pulse">Загрузка карты...</p>
              </div>
            )}

            {activeEvents.length > 0 && (
              <div className="absolute bottom-4 left-4 right-4 max-h-[60vh] overflow-hidden rounded-2xl border border-border bg-card shadow-card lg:left-auto lg:right-4 lg:w-80">
                {/* Заголовок попапа: показывает, сколько событий в этой точке. */}
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

                {/* Список (с прокруткой, если событий больше 2-3). */}
                <ul className="max-h-[calc(60vh-3rem)] divide-y divide-border overflow-y-auto">
                  {activeEvents.map((event) => {
                    // Источник миниатюры: сперва coverImageId, иначе первое изображение из eventImages.
                    const thumbId = event.coverImageId
                      ?? event.eventImages?.[0]?.imageId
                      ?? null;
                    return (
                    <li key={event.id} className="px-4 py-3">
                      <Link
                        to={`/events/${event.id}`}
                        className="flex items-start gap-3 rounded-lg p-1 -m-1 transition-colors hover:bg-muted/60"
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
                          {event.venueName && (
                            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{event.venueName}</p>
                          )}
                          {event.startDate && (
                            <Badge variant="secondary" className="mt-1 text-[10px]">
                              {formatDate(event.startDate)}
                            </Badge>
                          )}
                        </div>
                      </Link>
                    </li>
                    );
                  })}
                </ul>

                {/* Если в попапе одно событие — отдельная большая кнопка «Подробнее»
                    (когда много, переход уже встроен в каждый элемент списка). */}
                {activeEvents.length === 1 && (
                  <div className="border-t border-border p-3">
                    <Button asChild size="sm" className="w-full">
                      <Link to={`/events/${activeEvents[0].id}`}>Подробнее</Link>
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

/** Простая русская плюрализация: 1 мероприятие, 2 мероприятия, 5 мероприятий. */
function pluralize(n: number, forms: [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

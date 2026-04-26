import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, MapPin } from 'lucide-react';
import { imageSrc } from '@/lib/image';
import { loadYandexMapsApi } from '@/services/yandex-maps-service';
import { applyMinimalYandexMapUi, createPlacemarkOptions, YANDEX_MAP_MINIMAL_OPTIONS } from '@/lib/yandex-map-ui';
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

export function EventsCatalogMap({ events }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const [mapState, setMapState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [selected, setSelected] = useState<Event | null>(null);

  useEffect(() => {
    let destroyed = false;

    loadYandexMapsApi()
      .then((ymaps) => {
        if (destroyed || !containerRef.current) return;

        const eventsWithCoords = events.filter((e) => resolveCoords(e) !== null);

        const defaultCenter: [number, number] = eventsWithCoords.length > 0
          ? resolveCoords(eventsWithCoords[0])!
          : [55.751244, 37.618423];

        const map = new ymaps.Map(
          containerRef.current,
          { center: defaultCenter, zoom: 11, controls: ['zoomControl', 'fullscreenControl'] },
          YANDEX_MAP_MINIMAL_OPTIONS,
        );

        if (!destroyed) {
          mapRef.current = map;
          applyMinimalYandexMapUi(map);
        }

        eventsWithCoords.forEach((event) => {
          const coords = resolveCoords(event)!;
          const placemark = new ymaps.Placemark(
            coords,
            { hintContent: event.title },
            createPlacemarkOptions(),
          );

          placemark.events.add('click', () => {
            if (!destroyed) setSelected(event);
          });

          map.geoObjects.add(placemark);
        });

        if (eventsWithCoords.length > 1) {
          map.setBounds(map.geoObjects.getBounds(), { checkZoomRange: true, zoomMargin: 40 });
        }

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
      }
    };
  }, [events]);

  const eventsWithCoords = events.filter((e) => resolveCoords(e) !== null);

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
    <div className="relative overflow-hidden rounded-2xl border border-border">
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

      {selected && (
        <div className="absolute bottom-4 left-4 right-4 z-10 max-w-sm overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <button
            type="button"
            className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
            onClick={() => setSelected(null)}
            aria-label="Закрыть"
          >
            ✕
          </button>
          <Link to={`/events/${selected.id}`} className="flex gap-3 p-3">
            <img
              src={imageSrc(selected.coverImageId ?? null)}
              alt={selected.title}
              className="h-16 w-16 shrink-0 rounded-lg object-cover"
            />
            <div className="min-w-0">
              <p className="line-clamp-2 text-sm font-semibold text-foreground">{selected.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {selected.cityName ?? selected.city?.name ?? 'Город уточняется'}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-primary">{formatPrice(selected)}</p>
            </div>
          </Link>
        </div>
      )}

      <div className="absolute right-4 top-4 rounded-full bg-card/90 px-3 py-1 text-xs font-semibold text-foreground shadow backdrop-blur-sm">
        {eventsWithCoords.length} на карте
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Search, X } from 'lucide-react';
import { PublicLayout } from '@/layouts/PublicLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCity } from '@/contexts/CityContext';
import { eventService } from '@/services/event-service';
import { loadYandexMapsApi } from '@/services/yandex-maps-service';
import { applyMinimalYandexMapUi, createClustererOptions, createPlacemarkOptions, YANDEX_MAP_MINIMAL_OPTIONS } from '@/lib/yandex-map-ui';
import { imageSrc } from '@/lib/image';
import type { Event } from '@/types';

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: 'short' }).format(date);
}

export default function EventMapPage() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const clustererRef = useRef<any>(null);
  const cityZoomedRef = useRef(false);

  const { selectedCity } = useCity();
  const [events, setEvents] = useState<Event[]>([]);
  const [filtered, setFiltered] = useState<Event[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Event | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState('');

  useEffect(() => {
    eventService.getEvents({ size: 200 })
      .then((res) => {
        const withCoords = res.content.filter((e) => e.latitude != null && e.longitude != null);
        setEvents(withCoords);
        setFiltered(withCoords);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const q = search.trim().toLowerCase();
    setFiltered(
      q
        ? events.filter((e) => e.title?.toLowerCase().includes(q) || e.venueName?.toLowerCase().includes(q))
        : events,
    );
  }, [search, events]);

  useEffect(() => {
    let destroyed = false;

    loadYandexMapsApi()
      .then((ymaps) => {
        if (destroyed || !mapContainerRef.current) return;

        const map = new ymaps.Map(
          mapContainerRef.current,
          { center: [55.75, 37.57], zoom: 5, controls: ['zoomControl', 'fullscreenControl'] },
          YANDEX_MAP_MINIMAL_OPTIONS,
        );
        applyMinimalYandexMapUi(map);
        mapRef.current = map;

        const clusterer = new ymaps.Clusterer(createClustererOptions(ymaps));
        clustererRef.current = clusterer;
        map.geoObjects.add(clusterer);

        setMapLoaded(true);
      })
      .catch(() => setMapError('Не удалось загрузить карту'));

    return () => {
      destroyed = true;
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
        clustererRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !clustererRef.current || !window.ymaps) return;

    const ymaps = window.ymaps;
    clustererRef.current.removeAll();

    const placemarks = filtered
      .filter((e) => e.latitude != null && e.longitude != null)
      .map((e) => {
        const pm = new ymaps.Placemark(
          [e.latitude!, e.longitude!],
          { hintContent: e.title },
          createPlacemarkOptions(),
        );
        pm.events.add('click', () => setSelected(e));
        return pm;
      });

    clustererRef.current.add(placemarks);
  }, [filtered, mapLoaded]);

  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !selectedCity || cityZoomedRef.current) return;

    loadYandexMapsApi().then((ymaps) => {
      ymaps.geocode(`${selectedCity.name}, Россия`, { results: 1, kind: 'locality' })
        .then((result: any) => {
          if (!mapRef.current || cityZoomedRef.current) return;
          const obj = result.geoObjects.get(0);
          if (!obj) return;
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
  }, [mapLoaded, selectedCity]);

  const flyTo = (event: Event) => {
    setSelected(event);
    if (mapRef.current && event.latitude != null && event.longitude != null) {
      mapRef.current.setCenter([event.latitude, event.longitude], 14, { duration: 500 });
    }
  };

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="font-heading text-3xl text-foreground">Карта мероприятий</h1>
          <p className="mt-1 text-muted-foreground">Найдите события рядом с вами</p>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row">
          {/* Sidebar */}
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
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Найдено: {filtered.length}
              </span>
            </div>

            <div className="max-h-[calc(100vh-22rem)] overflow-y-auto space-y-2 pr-1">
              {filtered.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">Нет мероприятий с координатами</p>
              )}
              {filtered.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => flyTo(e)}
                  className={`w-full rounded-xl border p-3 text-left transition-all hover:border-primary/40 hover:shadow-soft ${
                    selected?.id === e.id ? 'border-primary/50 bg-primary/5' : 'border-border bg-card'
                  }`}
                >
                  <p className="line-clamp-1 text-sm font-semibold text-foreground">{e.title}</p>
                  {e.venueName && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3 shrink-0" />
                      {e.venueName}
                    </p>
                  )}
                  {e.startDate && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 shrink-0" />
                      {formatDate(e.startDate)}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </aside>

          {/* Map + popup */}
          <div className="relative flex-1">
            <div
              ref={mapContainerRef}
              className="h-[500px] w-full overflow-hidden rounded-2xl border border-border lg:h-[calc(100vh-14rem)]"
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

            {selected && (
              <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-border bg-card p-4 shadow-card lg:left-auto lg:right-4 lg:w-72">
                <div className="flex items-start gap-3">
                  {selected.images && selected.images[0] ? (
                    <img
                      src={imageSrc(Number(selected.images[0].imageId))}
                      alt=""
                      className="h-16 w-16 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                      <MapPin className="h-6 w-6 text-primary/60" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-foreground">{selected.title}</p>
                    {selected.venueName && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{selected.venueName}</p>
                    )}
                    {selected.startDate && (
                      <Badge variant="secondary" className="mt-1 text-[10px]">
                        {formatDate(selected.startDate)}
                      </Badge>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelected(null)}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <Button asChild size="sm" className="mt-3 w-full">
                  <Link to={`/events/${selected.id}`}>Подробнее</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}

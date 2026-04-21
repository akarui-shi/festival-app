import { useEffect, useRef } from 'react';
import { applyMinimalYandexMapUi, YANDEX_MAP_MINIMAL_OPTIONS } from '@/lib/yandex-map-ui';
import { loadYandexMapsApi } from '@/services/yandex-maps-service';

const MOSCOW_CENTER: [number, number] = [55.751244, 37.618423];

interface LocationPickerMapProps {
  latitude?: number;
  longitude?: number;
  initialCenter?: [number, number];
  onPick: (latitude: number, longitude: number) => void;
}

export function LocationPickerMap({ latitude, longitude, initialCenter, onPick }: LocationPickerMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const placemarkRef = useRef<any>(null);
  const ymapsRef = useRef<any>(null);
  const onPickRef = useRef(onPick);

  const normalizedLatitude = latitude == null ? undefined : Number(latitude);
  const normalizedLongitude = longitude == null ? undefined : Number(longitude);
  const hasExactPoint = Number.isFinite(normalizedLatitude) && Number.isFinite(normalizedLongitude);

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  const center: [number, number] = hasExactPoint
    ? [normalizedLatitude as number, normalizedLongitude as number]
    : initialCenter || MOSCOW_CENTER;

  useEffect(() => {
    let destroyed = false;

    loadYandexMapsApi()
      .then((ymaps) => {
        if (!containerRef.current || destroyed || mapRef.current) {
          return;
        }

        ymapsRef.current = ymaps;

        const map = new ymaps.Map(
          containerRef.current,
          {
            center,
            zoom: 12,
            controls: ['zoomControl', 'fullscreenControl'],
          },
          YANDEX_MAP_MINIMAL_OPTIONS,
        );
        applyMinimalYandexMapUi(map);

        map.events.add('click', (event: any) => {
          const coords = event.get('coords') as [number, number];
          onPickRef.current(Number(coords[0]), Number(coords[1]));
        });

        mapRef.current = map;

        const initialMarkerCoordinates: [number, number] | null = hasExactPoint
          ? [normalizedLatitude as number, normalizedLongitude as number]
          : initialCenter || null;
        const initialIsPickedPoint = hasExactPoint;
        if (initialMarkerCoordinates) {
          placemarkRef.current = new ymaps.Placemark(
            initialMarkerCoordinates,
            {},
            {
              preset: initialIsPickedPoint ? 'islands#redDotIcon' : 'islands#grayDotIcon',
            },
          );
          map.geoObjects.add(placemarkRef.current);
        }
      })
      .catch(() => {
        // ignore init errors in component; parent handles UX through validations
      });

    return () => {
      destroyed = true;
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
      placemarkRef.current = null;
      ymapsRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.setCenter(center, 12, { duration: 200 });

    const markerCoordinates: [number, number] | null = hasExactPoint
      ? [normalizedLatitude as number, normalizedLongitude as number]
      : initialCenter || null;
    const isPickedPoint = hasExactPoint;

    if (!markerCoordinates) {
      if (placemarkRef.current) {
        map.geoObjects.remove(placemarkRef.current);
        placemarkRef.current = null;
      }
      return;
    }

    if (!placemarkRef.current) {
      const ymaps = ymapsRef.current;
      if (!ymaps) return;

      placemarkRef.current = new ymaps.Placemark(
        markerCoordinates,
        {},
        {
          preset: isPickedPoint ? 'islands#redDotIcon' : 'islands#grayDotIcon',
        },
      );
      map.geoObjects.add(placemarkRef.current);
      return;
    }

    placemarkRef.current.geometry.setCoordinates(markerCoordinates);
    placemarkRef.current.options.set('preset', isPickedPoint ? 'islands#redDotIcon' : 'islands#grayDotIcon');
  }, [center, hasExactPoint, initialCenter, normalizedLatitude, normalizedLongitude]);

  return (
    <div className="ymap-clean overflow-hidden rounded-xl border border-border">
      <div ref={containerRef} className="h-64 w-full" />
    </div>
  );
}

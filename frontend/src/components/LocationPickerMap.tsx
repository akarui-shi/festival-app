import { useEffect, useRef } from 'react';
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

  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  const center: [number, number] = latitude != null && longitude != null
    ? [latitude, longitude]
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
          {
            suppressMapOpenBlock: true,
          },
        );

        map.events.add('click', (event: any) => {
          const coords = event.get('coords') as [number, number];
          onPickRef.current(Number(coords[0]), Number(coords[1]));
        });

        mapRef.current = map;
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

    const markerCoordinates: [number, number] | null = latitude != null && longitude != null
      ? [latitude, longitude]
      : initialCenter || null;
    const isPickedPoint = latitude != null && longitude != null;

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
  }, [center, initialCenter, latitude, longitude]);

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div ref={containerRef} className="h-64 w-full" />
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import { loadYandexMapsApi, yandexMapsService } from '@/services/yandex-maps-service';

type Coordinates = [number, number];

interface EventLocationMapProps {
  address?: string;
  latitude?: number;
  longitude?: number;
  title?: string;
}

function buildYandexMapsLink(address?: string, coordinates?: Coordinates | null): string | null {
  if (coordinates) {
    return `https://yandex.ru/maps/?ll=${coordinates[1]},${coordinates[0]}&z=16&pt=${coordinates[1]},${coordinates[0]},pm2rdm`;
  }

  if (address?.trim()) {
    return `https://yandex.ru/maps/?text=${encodeURIComponent(address.trim())}`;
  }

  return null;
}

export function EventLocationMap({ address, latitude, longitude, title }: EventLocationMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const placemarkRef = useRef<any>(null);
  const explicitCoordinates = useMemo<Coordinates | null>(() => {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    return [Number(latitude), Number(longitude)];
  }, [latitude, longitude]);

  const [resolvedCoordinates, setResolvedCoordinates] = useState<Coordinates | null>(explicitCoordinates);
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    explicitCoordinates ? 'ready' : address?.trim() ? 'loading' : 'idle',
  );
  const [mapState, setMapState] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    explicitCoordinates ? 'loading' : 'idle',
  );

  useEffect(() => {
    if (explicitCoordinates) {
      setResolvedCoordinates(explicitCoordinates);
      setLookupState('ready');
      return;
    }

    const normalizedAddress = address?.trim();
    if (!normalizedAddress) {
      setResolvedCoordinates(null);
      setLookupState('idle');
      return;
    }

    let cancelled = false;
    setLookupState('loading');

    yandexMapsService.searchAddressSuggestions(normalizedAddress, 1)
      .then((suggestions) => {
        if (cancelled) return;

        const first = suggestions[0];
        if (!first) {
          setResolvedCoordinates(null);
          setLookupState('error');
          return;
        }

        setResolvedCoordinates([first.latitude, first.longitude]);
        setLookupState('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setResolvedCoordinates(null);
        setLookupState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [address, explicitCoordinates]);

  useEffect(() => {
    if (!resolvedCoordinates) {
      setMapState('idle');
      return;
    }

    let destroyed = false;
    setMapState('loading');

    loadYandexMapsApi()
      .then((ymaps) => {
        if (destroyed || !containerRef.current) {
          return;
        }

        const map = mapRef.current || new ymaps.Map(
          containerRef.current,
          {
            center: resolvedCoordinates,
            zoom: 15,
            controls: ['zoomControl', 'fullscreenControl'],
          },
          {
            suppressMapOpenBlock: true,
          },
        );

        if (!mapRef.current) {
          mapRef.current = map;
          map.behaviors.disable('scrollZoom');
          map.behaviors.disable('drag');
          map.behaviors.disable('multiTouch');
        }

        map.setCenter(resolvedCoordinates, 15, { duration: 200 });

        const placemarkProperties = {
          hintContent: title || address || 'Место проведения',
          balloonContentHeader: title || 'Место проведения',
          balloonContentBody: address || 'Адрес мероприятия',
        };

        if (!placemarkRef.current) {
          placemarkRef.current = new ymaps.Placemark(
            resolvedCoordinates,
            placemarkProperties,
            {
              preset: 'islands#redIcon',
            },
          );
          map.geoObjects.add(placemarkRef.current);
        } else {
          placemarkRef.current.geometry.setCoordinates(resolvedCoordinates);
          placemarkRef.current.properties.set(placemarkProperties);
        }

        setMapState('ready');
      })
      .catch(() => {
        if (!destroyed) {
          setMapState('error');
        }
      });

    return () => {
      destroyed = true;
    };
  }, [address, resolvedCoordinates, title]);

  useEffect(() => () => {
    if (mapRef.current) {
      mapRef.current.destroy();
      mapRef.current = null;
    }

    placemarkRef.current = null;
  }, []);

  const externalLink = buildYandexMapsLink(address, resolvedCoordinates);

  if (!address?.trim() && !resolvedCoordinates) {
    return (
      <div className="flex h-72 flex-col items-center justify-center rounded-2xl border border-border bg-muted px-6 text-center">
        <MapPin className="h-8 w-8 text-muted-foreground/50" />
        <p className="mt-3 text-sm font-medium text-foreground">Адрес мероприятия пока не указан</p>
      </div>
    );
  }

  if (lookupState === 'loading' && !resolvedCoordinates) {
    return (
      <div className="flex h-72 flex-col items-center justify-center rounded-2xl border border-border bg-muted px-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="mt-3 text-sm font-medium text-foreground">Подгружаем карту мероприятия</p>
      </div>
    );
  }

  if (!resolvedCoordinates || lookupState === 'error' || mapState === 'error') {
    return (
      <div className="flex h-72 flex-col items-center justify-center rounded-2xl border border-border bg-muted px-6 text-center">
        <MapPin className="h-8 w-8 text-muted-foreground/50" />
        <p className="mt-3 text-sm font-medium text-foreground">Не удалось отобразить карту</p>
        {address && <p className="mt-1 text-xs text-muted-foreground">{address}</p>}
        {externalLink && (
          <a
            href={externalLink}
            target="_blank"
            rel="noreferrer"
            className="mt-4 text-sm font-semibold text-primary hover:underline"
          >
            Открыть в Яндекс Картах
          </a>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative">
        <div ref={containerRef} className="h-72 w-full" />
        {mapState !== 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-[1px]">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </div>
      <div className="flex items-start justify-between gap-3 border-t border-border px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{title || 'Место проведения'}</p>
          {address && <p className="truncate text-xs text-muted-foreground">{address}</p>}
        </div>
        {externalLink && (
          <a
            href={externalLink}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 text-sm font-semibold text-primary hover:underline"
          >
            Открыть
          </a>
        )}
      </div>
    </div>
  );
}

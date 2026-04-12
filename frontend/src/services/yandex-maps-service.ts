const YANDEX_MAPS_API_KEY = import.meta.env.VITE_YANDEX_MAPS_API_KEY as string | undefined;
const YANDEX_MAPS_SCRIPT_ID = 'yandex-maps-sdk-script';

export interface YandexAddressSuggestion {
  id: string;
  label: string;
  address: string;
  latitude: number;
  longitude: number;
  cityName?: string;
  region?: string;
  country?: string;
}

declare global {
  interface Window {
    ymaps?: any;
    __ymapsLoadingPromise?: Promise<any>;
  }
}

function extractComponent(components: Array<{ kind?: string; name?: string }> | undefined, kinds: string[]): string {
  if (!components) return '';
  const matched = components.find((item) => kinds.includes(item.kind || ''));
  return matched?.name || '';
}

function parseGeoObject(geoObject: any, idPrefix: string, index: number): YandexAddressSuggestion | null {
  const coordinates = geoObject?.geometry?.getCoordinates?.();
  if (!coordinates || coordinates.length < 2) {
    return null;
  }

  const metadata = geoObject?.properties?.get?.('metaDataProperty.GeocoderMetaData');
  const addressData = metadata?.Address;
  const components = addressData?.Components as Array<{ kind?: string; name?: string }> | undefined;
  const label = metadata?.text || geoObject?.getAddressLine?.() || '';
  const address = addressData?.formatted || label;
  const cityName = extractComponent(components, ['locality', 'area']);
  const region = extractComponent(components, ['province', 'area']);
  const country = extractComponent(components, ['country']);

  return {
    id: `${idPrefix}-${index}`,
    label: label || address,
    address: address || label,
    latitude: Number(coordinates[0]),
    longitude: Number(coordinates[1]),
    cityName: cityName || undefined,
    region: region || undefined,
    country: country || undefined,
  };
}

export function loadYandexMapsApi(): Promise<any> {
  if (window.ymaps && typeof window.ymaps.ready === 'function') {
    return new Promise((resolve) => {
      window.ymaps.ready(() => resolve(window.ymaps));
    });
  }

  if (window.__ymapsLoadingPromise) {
    return window.__ymapsLoadingPromise;
  }

  window.__ymapsLoadingPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById(YANDEX_MAPS_SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        if (!window.ymaps) {
          reject(new Error('Yandex Maps API not available'));
          return;
        }
        window.ymaps.ready(() => resolve(window.ymaps));
      });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Yandex Maps script')));
      return;
    }

    const script = document.createElement('script');
    script.id = YANDEX_MAPS_SCRIPT_ID;
    const query = new URLSearchParams({ lang: 'ru_RU' });
    if (YANDEX_MAPS_API_KEY) {
      query.set('apikey', YANDEX_MAPS_API_KEY);
    }
    script.src = `https://api-maps.yandex.ru/2.1/?${query.toString()}`;
    script.async = true;
    script.onload = () => {
      if (!window.ymaps) {
        reject(new Error('Yandex Maps API not available'));
        return;
      }
      window.ymaps.ready(() => resolve(window.ymaps));
    };
    script.onerror = () => reject(new Error('Failed to load Yandex Maps script'));
    document.head.appendChild(script);
  }).catch((error) => {
    window.__ymapsLoadingPromise = undefined;
    throw error;
  });

  return window.__ymapsLoadingPromise;
}

export const yandexMapsService = {
  async searchAddressSuggestions(query: string, limit = 7): Promise<YandexAddressSuggestion[]> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) return [];

    const ymaps = await loadYandexMapsApi();
    const result = await ymaps.geocode(normalizedQuery, { results: limit });
    const suggestions: YandexAddressSuggestion[] = [];

    result.geoObjects.each((geoObject: any, index: number) => {
      const parsed = parseGeoObject(geoObject, 'search', index);
      if (parsed) {
        suggestions.push(parsed);
      }
    });

    return suggestions;
  },

  async reverseGeocode(latitude: number, longitude: number): Promise<YandexAddressSuggestion | null> {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    const ymaps = await loadYandexMapsApi();
    const result = await ymaps.geocode([latitude, longitude], {
      kind: 'house',
      results: 1,
    });

    const firstGeoObject = result.geoObjects.get(0);
    if (!firstGeoObject) {
      return null;
    }

    return parseGeoObject(firstGeoObject, 'reverse', 0);
  },
};


import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { directoryService } from '@/services/directory-service';
import type { City } from '@/types';

const STORAGE_KEY = 'festival.selectedCityId';

interface CityContextValue {
  cities: City[];
  selectedCity: City | null;
  loading: boolean;
  setSelectedCityById: (cityId: string) => void;
}

const CityContext = createContext<CityContextValue | null>(null);

function readStoredCityId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStoredCityId(cityId: string | null): void {
  try {
    if (!cityId) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, cityId);
  } catch {
    // ignore storage errors
  }
}

export function CityProvider({ children }: { children: ReactNode }) {
  const [cities, setCities] = useState<City[]>([]);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    directoryService
      .getCities()
      .then((cityList) => {
        setCities(cityList);

        const storedCityId = readStoredCityId();
        if (!storedCityId) {
          setSelectedCity(null);
          return;
        }

        const storedCity = cityList.find((city) => String(city.id) === storedCityId) || null;
        setSelectedCity(storedCity);

        if (!storedCity) {
          writeStoredCityId(null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

const setSelectedCityById = (cityId: string) => {
    const city = cities.find((candidate) => String(candidate.id) === String(cityId)) || null;
    setSelectedCity(city);
    writeStoredCityId(city ? String(city.id) : null);
  };

  const value = useMemo<CityContextValue>(
    () => ({
      cities,
      selectedCity,
      loading,
      setSelectedCityById,
    }),
    [cities, loading, selectedCity],
  );

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
}

export function useCity() {
  const context = useContext(CityContext);
  if (!context) {
    throw new Error('useCity must be used within CityProvider');
  }
  return context;
}

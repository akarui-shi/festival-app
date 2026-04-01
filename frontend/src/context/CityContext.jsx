import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { cityService } from '../services/cityService';
import { authStorage } from '../utils/storage';

const FALLBACK_CITY_QUERIES = ['Москва', 'Санкт-Петербург', 'Коломна'];

const CityContext = createContext(null);

const normalizeCity = (city) => {
  if (!city || city.id === undefined || city.id === null || city.id === '') {
    return null;
  }

  const numericId = Number(city.id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return null;
  }

  return {
    id: numericId,
    name: city.name || '',
    region: city.region || '',
    country: city.country || ''
  };
};

const findBestCandidate = (cities, query) => {
  if (!Array.isArray(cities) || cities.length === 0) {
    return null;
  }

  const normalizedQuery = query.trim().toLowerCase();
  const exact = cities.find((city) => (city?.name || '').trim().toLowerCase() === normalizedQuery);
  return normalizeCity(exact || cities[0]);
};

const detectDefaultCity = async () => {
  for (const query of FALLBACK_CITY_QUERIES) {
    try {
      const cities = await cityService.searchCities({ q: query, limit: 10 });
      const candidate = findBestCandidate(cities, query);
      if (candidate) {
        return candidate;
      }
    } catch {
      // Move to next candidate and keep detection resilient.
    }
  }
  return null;
};

export const CityProvider = ({ children }) => {
  const [selectedCity, setSelectedCity] = useState(() => normalizeCity(authStorage.getSelectedCity()));
  const [suggestedCity, setSuggestedCity] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInitialChoiceRequired, setIsInitialChoiceRequired] = useState(false);
  const [modalMode, setModalMode] = useState('confirm');
  const [error, setError] = useState('');

  const saveCity = useCallback((city) => {
    const normalized = normalizeCity(city);
    if (!normalized) {
      return;
    }

    setSelectedCity(normalized);
    authStorage.setSelectedCity(normalized);
    setError('');
    setIsModalOpen(false);
    setIsInitialChoiceRequired(false);
    setModalMode('confirm');
  }, []);

  const openCityModal = useCallback((mode = 'search') => {
    setError('');
    setModalMode(mode);
    setIsModalOpen(true);
  }, []);

  const closeCityModal = useCallback(() => {
    if (isInitialChoiceRequired) {
      return;
    }
    setIsModalOpen(false);
    setError('');
    setModalMode('confirm');
  }, [isInitialChoiceRequired]);

  const switchToSearchMode = useCallback(() => {
    setError('');
    setModalMode('search');
    setIsModalOpen(true);
  }, []);

  const confirmSuggestedCity = useCallback(() => {
    if (!suggestedCity) {
      switchToSearchMode();
      return;
    }
    saveCity(suggestedCity);
  }, [saveCity, suggestedCity, switchToSearchMode]);

  useEffect(() => {
    let isActive = true;

    const initializeCity = async () => {
      try {
        setIsLoading(true);
        const storedCity = normalizeCity(authStorage.getSelectedCity());
        if (!isActive) {
          return;
        }

        if (storedCity) {
          setSelectedCity(storedCity);
          setSuggestedCity(storedCity);
          setIsInitialChoiceRequired(false);
          setIsModalOpen(false);
          return;
        }

        const detectedCity = await detectDefaultCity();
        if (!isActive) {
          return;
        }

        setSuggestedCity(detectedCity);
        setIsInitialChoiceRequired(true);
        setModalMode(detectedCity ? 'confirm' : 'search');
        setIsModalOpen(true);
        if (!detectedCity) {
          setError('Не удалось определить город автоматически. Выберите город вручную.');
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    initializeCity();

    return () => {
      isActive = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      selectedCity,
      selectedCityId: selectedCity?.id || null,
      suggestedCity,
      isLoading,
      isModalOpen,
      isInitialChoiceRequired,
      modalMode,
      error,
      saveCity,
      openCityModal,
      closeCityModal,
      switchToSearchMode,
      confirmSuggestedCity
    }),
    [
      selectedCity,
      suggestedCity,
      isLoading,
      isModalOpen,
      isInitialChoiceRequired,
      modalMode,
      error,
      saveCity,
      openCityModal,
      closeCityModal,
      switchToSearchMode,
      confirmSuggestedCity
    ]
  );

  return <CityContext.Provider value={value}>{children}</CityContext.Provider>;
};

export const useCity = () => {
  const context = useContext(CityContext);
  if (!context) {
    throw new Error('useCity должен использоваться внутри CityProvider');
  }
  return context;
};

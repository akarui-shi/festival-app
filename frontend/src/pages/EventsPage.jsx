import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EventCard from '../components/EventCard';
import Loader from '../components/Loader';
import AlertMessage from '../components/AlertMessage';
import EmptyState from '../components/EmptyState';
import { eventService } from '../services/eventService';
import { favoriteService } from '../services/favoriteService';
import { categoryService } from '../services/categoryService';
import { useAuth } from '../context/AuthContext';
import { useCity } from '../context/CityContext';
import { toUserErrorMessage } from '../utils/errorMessages';

const DEFAULT_FILTERS = {
  title: '',
  categoryId: ''
};

const buildEventQueryParams = (filters, cityId) => ({
  title: filters.title.trim() || undefined,
  categoryId: filters.categoryId || undefined,
  cityId: cityId || undefined
});

const EventsPage = () => {
  const { isAuthenticated } = useAuth();
  const { selectedCity, selectedCityId, isLoading: isCityLoading } = useCity();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltersLoading, setIsFiltersLoading] = useState(true);
  const [error, setError] = useState('');
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [favoriteActionEventId, setFavoriteActionEventId] = useState(null);
  const [message, setMessage] = useState('');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(DEFAULT_FILTERS);

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        appliedFilters.title ||
        appliedFilters.categoryId
      ),
    [appliedFilters]
  );

  const loadEvents = useCallback(async (currentFilters, cityId) => {
    if (!cityId) {
      setEvents([]);
      setError('');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      const data = await eventService.getEvents(buildEventQueryParams(currentFilters, cityId));
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(toUserErrorMessage(err, 'Не удалось загрузить мероприятия.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadDictionaries = async () => {
      try {
        setIsFiltersLoading(true);
        const [categoriesResult] = await Promise.allSettled([categoryService.getCategories()]);

        setCategories(categoriesResult.status === 'fulfilled' && Array.isArray(categoriesResult.value) ? categoriesResult.value : []);
      } finally {
        setIsFiltersLoading(false);
      }
    };

    loadDictionaries();
  }, []);

  useEffect(() => {
    if (isCityLoading) {
      return;
    }
    loadEvents(appliedFilters, selectedCityId);
  }, [appliedFilters, loadEvents, selectedCityId, isCityLoading]);

  const loadFavorites = useCallback(async () => {
    if (!isAuthenticated) {
      setFavoriteIds([]);
      return;
    }

    try {
      const data = await favoriteService.getMyFavorites();
      const ids = Array.isArray(data) ? data.map((item) => item.eventId).filter(Boolean) : [];
      setFavoriteIds(ids);
    } catch {
      // Do not block event list rendering in case favorites loading fails.
      setFavoriteIds([]);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const onFavoriteClick = async (event) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/events' } });
      return;
    }

    const eventId = event.id;
    const isFavorite = favoriteIds.includes(eventId);

    try {
      setError('');
      setMessage('');
      setFavoriteActionEventId(eventId);

      if (isFavorite) {
        await favoriteService.removeFromFavorites(eventId);
        setFavoriteIds((prev) => prev.filter((id) => id !== eventId));
        setMessage('Удалено из избранного.');
      } else {
        await favoriteService.addToFavorites(eventId);
        setFavoriteIds((prev) => (prev.includes(eventId) ? prev : [...prev, eventId]));
        setMessage('Добавлено в избранное.');
      }
    } catch (err) {
      setError(toUserErrorMessage(err, 'Не удалось обновить избранное.'));
    } finally {
      setFavoriteActionEventId(null);
    }
  };

  const handleFilterInput = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = (event) => {
    event.preventDefault();
    setAppliedFilters({ ...filters, title: filters.title.trim() });
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
  };

  return (
    <section className="container page">
      <h1>Мероприятия</h1>
      <p className="page-subtitle">
        {selectedCity ? `Показываем события в городе ${selectedCity.name}.` : 'Выберите город в шапке приложения.'}
      </p>

      <form className="events-filters panel" onSubmit={handleApplyFilters}>
        <div className="events-filters__grid">
          <label>
            Поиск по названию
            <input
              type="text"
              name="title"
              value={filters.title}
              onChange={handleFilterInput}
              placeholder="Например, джаз или фестиваль"
            />
          </label>

          <label>
            Категория
            <select name="categoryId" value={filters.categoryId} onChange={handleFilterInput} disabled={isFiltersLoading}>
              <option value="">Все категории</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="events-filters__actions">
          <button type="submit" className="btn btn--primary" disabled={isLoading}>
            Применить фильтры
          </button>
          <button type="button" className="btn btn--ghost" onClick={handleResetFilters} disabled={!hasActiveFilters}>
            Сбросить фильтры
          </button>
        </div>
      </form>

      {isCityLoading && <Loader text="Определяем выбранный город..." />}
      {isLoading && <Loader text="Загружаем мероприятия..." />}
      {error && <AlertMessage type="error" message={error} onClose={() => setError('')} />}
      {message && (
        <AlertMessage
          type="success"
          message={message}
          autoHideMs={2600}
          onClose={() => setMessage('')}
        />
      )}

      {!isCityLoading && !selectedCity && <EmptyState message="Выберите город в шапке, чтобы увидеть афишу." />}

      {!isLoading && !isCityLoading && selectedCity && !error && events.length === 0 && <EmptyState message="Мероприятия не найдены." />}

      {!isLoading && !isCityLoading && !error && events.length > 0 && (
        <div className="event-grid">
          {events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              onFavoriteClick={onFavoriteClick}
              favoriteButtonText={favoriteIds.includes(event.id) ? 'В избранном' : 'В избранное'}
              isFavoriteButtonLoading={favoriteActionEventId === event.id}
            />
          ))}
        </div>
      )}
    </section>
  );
};

export default EventsPage;

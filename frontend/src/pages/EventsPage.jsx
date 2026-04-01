import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EventCard from '../components/EventCard';
import Loader from '../components/Loader';
import ErrorMessage from '../components/ErrorMessage';
import EmptyState from '../components/EmptyState';
import SearchableCitySelect from '../components/SearchableCitySelect';
import { eventService } from '../services/eventService';
import { favoriteService } from '../services/favoriteService';
import { categoryService } from '../services/categoryService';
import { venueService } from '../services/venueService';
import { useAuth } from '../context/AuthContext';

const DEFAULT_FILTERS = {
  title: '',
  categoryId: '',
  cityId: '',
  venueId: '',
  status: ''
};

const EVENT_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

const buildEventQueryParams = (filters) => ({
  title: filters.title.trim() || undefined,
  categoryId: filters.categoryId || undefined,
  cityId: filters.cityId || undefined,
  venueId: filters.venueId || undefined,
  status: filters.status || undefined
});

const EventsPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [venues, setVenues] = useState([]);
  const [selectedCity, setSelectedCity] = useState(null);
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
          appliedFilters.categoryId ||
          appliedFilters.cityId ||
          appliedFilters.venueId ||
          appliedFilters.status
      ),
    [appliedFilters]
  );

  const loadEvents = useCallback(async (currentFilters) => {
    try {
      setIsLoading(true);
      setError('');
      const data = await eventService.getEvents(buildEventQueryParams(currentFilters));
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Не удалось загрузить мероприятия.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadDictionaries = async () => {
      try {
        setIsFiltersLoading(true);
        const [categoriesResult, venuesResult] = await Promise.allSettled([
          categoryService.getCategories(),
          venueService.getVenues()
        ]);

        setCategories(categoriesResult.status === 'fulfilled' && Array.isArray(categoriesResult.value) ? categoriesResult.value : []);
        setVenues(venuesResult.status === 'fulfilled' && Array.isArray(venuesResult.value) ? venuesResult.value : []);
      } finally {
        setIsFiltersLoading(false);
      }
    };

    loadDictionaries();
  }, []);

  useEffect(() => {
    loadEvents(appliedFilters);
  }, [appliedFilters, loadEvents]);

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
      setError(err.message || 'Не удалось обновить избранное.');
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
    setSelectedCity(null);
  };

  return (
    <section className="container page">
      <h1>Мероприятия</h1>
      <p className="page-subtitle">Найдите событие по названию, категории, городу, площадке или статусу.</p>

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

          <SearchableCitySelect
            label="Город"
            selectedCity={selectedCity}
            onSelect={(city) => {
              setSelectedCity(city);
              setFilters((prev) => ({ ...prev, cityId: String(city.id) }));
            }}
            onClear={() => {
              setSelectedCity(null);
              setFilters((prev) => ({ ...prev, cityId: '' }));
            }}
            disabled={isFiltersLoading}
          />

          <label>
            Площадка
            <select name="venueId" value={filters.venueId} onChange={handleFilterInput} disabled={isFiltersLoading}>
              <option value="">Все площадки</option>
              {venues.map((venue) => (
                <option key={venue.id} value={venue.id}>
                  {venue.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Статус
            <select name="status" value={filters.status} onChange={handleFilterInput}>
              <option value="">Все статусы</option>
              {EVENT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="events-filters__actions">
          <button type="submit" className="btn btn--primary" disabled={isLoading}>
            Применить фильтры
          </button>
          <button type="button" className="btn btn--ghost" onClick={handleResetFilters} disabled={!hasActiveFilters && !filters.title && !filters.categoryId && !filters.cityId && !filters.venueId && !filters.status}>
            Сбросить фильтры
          </button>
        </div>
      </form>

      {isLoading && <Loader text="Загружаем мероприятия..." />}
      {error && <ErrorMessage message={error} />}
      {message && <p className="page-note page-note--success">{message}</p>}

      {!isLoading && !error && events.length === 0 && <EmptyState message="Мероприятия не найдены." />}

      {!isLoading && !error && events.length > 0 && (
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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
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
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { selectedCity, selectedCityId, isLoading: isCityLoading } = useCity();
  const navigate = useNavigate();
  const initialTitleFromQuery = (searchParams.get('title') || '').trim();
  const initialCategoryFromQuery = (searchParams.get('categoryId') || '').trim();

  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFiltersLoading, setIsFiltersLoading] = useState(true);
  const [error, setError] = useState('');
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [favoriteActionEventId, setFavoriteActionEventId] = useState(null);
  const [message, setMessage] = useState('');
  const [filters, setFilters] = useState({
    title: initialTitleFromQuery,
    categoryId: initialCategoryFromQuery
  });
  const [appliedFilters, setAppliedFilters] = useState({
    title: initialTitleFromQuery,
    categoryId: initialCategoryFromQuery
  });

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

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextTitle = (params.get('title') || '').trim();
    const nextCategory = (params.get('categoryId') || '').trim();

    setFilters((prev) =>
      prev.title === nextTitle && prev.categoryId === nextCategory
        ? prev
        : { ...prev, title: nextTitle, categoryId: nextCategory }
    );
    setAppliedFilters((prev) =>
      prev.title === nextTitle && prev.categoryId === nextCategory
        ? prev
        : { ...prev, title: nextTitle, categoryId: nextCategory }
    );
  }, [location.search]);

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
    const nextFilters = { ...filters, title: filters.title.trim() };
    setAppliedFilters(nextFilters);

    const nextParams = {};
    if (nextFilters.title) {
      nextParams.title = nextFilters.title;
    }
    if (nextFilters.categoryId) {
      nextParams.categoryId = nextFilters.categoryId;
    }
    setSearchParams(nextParams, { replace: true });
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setSearchParams({}, { replace: true });
  };

  return (
    <section className="container page events-page">
      <div className="events-page__head">
        <h1>Афиша мероприятий</h1>
        <p className="page-subtitle">
          {selectedCity ? `Город: ${selectedCity.name}` : 'Выберите город в шапке приложения.'}
        </p>
      </div>

      <div className="events-discovery">
        <aside className="events-sidebar panel">
          <h2 className="events-sidebar__title">Фильтры</h2>
          <form className="events-filters" onSubmit={handleApplyFilters}>
            <div className="events-filters__grid">
              <label>
                Поиск по названию
                <input
                  type="text"
                  name="title"
                  value={filters.title}
                  onChange={handleFilterInput}
                  placeholder="Например, концерт"
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
                Показать
              </button>
              <button type="button" className="btn btn--ghost" onClick={handleResetFilters} disabled={!hasActiveFilters}>
                Сбросить
              </button>
            </div>
          </form>
        </aside>

        <div className="events-feed">
          <div className="events-feed__header panel">
            <p className="events-feed__summary">
              {isLoading ? 'Загружаем подборку…' : `Найдено событий: ${events.length}`}
            </p>
            <div className="events-feed__chips">
              {appliedFilters.title && <span className="chip">Поиск: {appliedFilters.title}</span>}
              {appliedFilters.categoryId && (
                <span className="chip">
                  Категория:{' '}
                  {categories.find((item) => String(item.id) === String(appliedFilters.categoryId))?.name || 'выбрана'}
                </span>
              )}
            </div>
          </div>

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

          {!isLoading && !isCityLoading && selectedCity && !error && events.length === 0 && (
            <EmptyState message="Мероприятия не найдены." />
          )}

          {!isLoading && !isCityLoading && !error && events.length > 0 && (
            <div className="event-list">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  layout="list"
                  onFavoriteClick={onFavoriteClick}
                  favoriteButtonText={favoriteIds.includes(event.id) ? 'В избранном' : 'В избранное'}
                  isFavoriteButtonLoading={favoriteActionEventId === event.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default EventsPage;

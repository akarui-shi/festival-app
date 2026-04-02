import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import EventCard from '../components/EventCard';
import Loader from '../components/Loader';
import AlertMessage from '../components/AlertMessage';
import EmptyState from '../components/EmptyState';
import DatePickerField from '../components/DatePickerField';
import { eventService } from '../services/eventService';
import { favoriteService } from '../services/favoriteService';
import { categoryService } from '../services/categoryService';
import { useAuth } from '../context/AuthContext';
import { useCity } from '../context/CityContext';
import { toUserErrorMessage } from '../utils/errorMessages';

const DEFAULT_SORT = {
  sortBy: 'createdAt',
  sortDir: 'desc'
};

const DEFAULT_FILTERS = {
  title: '',
  categoryId: '',
  date: '',
  ...DEFAULT_SORT
};

const buildEventQueryParams = (filters, cityId) => ({
  title: filters.title.trim() || undefined,
  categoryId: filters.categoryId || undefined,
  cityId: cityId || undefined,
  date: filters.date || undefined,
  sortBy: filters.sortBy || DEFAULT_SORT.sortBy,
  sortDir: filters.sortDir || DEFAULT_SORT.sortDir
});

const normalizeSortBy = (value) => {
  if (value === 'title' || value === 'createdAt') {
    return value;
  }
  return DEFAULT_SORT.sortBy;
};

const normalizeSortDir = (value) => {
  const lowered = String(value || '').toLowerCase();
  if (lowered === 'asc' || lowered === 'desc') {
    return lowered;
  }
  return DEFAULT_SORT.sortDir;
};

const toSortKey = (sortBy, sortDir) => `${normalizeSortBy(sortBy)}:${normalizeSortDir(sortDir)}`;

const fromSortKey = (sortKey) => {
  const [sortBy, sortDir] = String(sortKey || '').split(':');
  return {
    sortBy: normalizeSortBy(sortBy),
    sortDir: normalizeSortDir(sortDir)
  };
};

const sortLabel = (sortBy, sortDir) => {
  const key = toSortKey(sortBy, sortDir);
  if (key === 'createdAt:asc') return 'Сначала старые';
  if (key === 'title:asc') return 'Название: А-Я';
  if (key === 'title:desc') return 'Название: Я-А';
  return 'Сначала новые';
};

const formatDateChip = (isoDate) => {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return '';
  }
  const [year, month, day] = isoDate.split('-');
  return `${day}.${month}.${year}`;
};

const EventsPage = () => {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { selectedCity, selectedCityId, isLoading: isCityLoading } = useCity();
  const navigate = useNavigate();
  const initialTitleFromQuery = (searchParams.get('title') || '').trim();
  const initialCategoryFromQuery = (searchParams.get('categoryId') || '').trim();
  const initialDateFromQuery = (searchParams.get('dateFrom') || '').trim();
  const initialDateToQuery = (searchParams.get('dateTo') || '').trim();
  const initialDateQuery = (searchParams.get('date') || '').trim() || (initialDateFromQuery === initialDateToQuery ? initialDateFromQuery : '');
  const initialSortByQuery = normalizeSortBy((searchParams.get('sortBy') || DEFAULT_SORT.sortBy).trim());
  const initialSortDirQuery = normalizeSortDir((searchParams.get('sortDir') || DEFAULT_SORT.sortDir).trim());

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
    categoryId: initialCategoryFromQuery,
    date: initialDateQuery,
    sortBy: initialSortByQuery,
    sortDir: initialSortDirQuery
  });
  const [appliedFilters, setAppliedFilters] = useState({
    title: initialTitleFromQuery,
    categoryId: initialCategoryFromQuery,
    date: initialDateQuery,
    sortBy: initialSortByQuery,
    sortDir: initialSortDirQuery
  });

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        appliedFilters.title ||
        appliedFilters.categoryId ||
        appliedFilters.date ||
        appliedFilters.sortBy !== DEFAULT_SORT.sortBy ||
        appliedFilters.sortDir !== DEFAULT_SORT.sortDir
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
    const nextDateFrom = (params.get('dateFrom') || '').trim();
    const nextDateTo = (params.get('dateTo') || '').trim();
    const nextDate = (params.get('date') || '').trim() || (nextDateFrom === nextDateTo ? nextDateFrom : '');
    const nextSortBy = normalizeSortBy((params.get('sortBy') || DEFAULT_SORT.sortBy).trim());
    const nextSortDir = normalizeSortDir((params.get('sortDir') || DEFAULT_SORT.sortDir).trim());
    const nextFilters = {
      title: nextTitle,
      categoryId: nextCategory,
      date: nextDate,
      sortBy: nextSortBy,
      sortDir: nextSortDir
    };

    setFilters((prev) =>
      prev.title === nextTitle &&
      prev.categoryId === nextCategory &&
      prev.date === nextDate &&
      prev.sortBy === nextSortBy &&
      prev.sortDir === nextSortDir
        ? prev
        : nextFilters
    );
    setAppliedFilters((prev) =>
      prev.title === nextTitle &&
      prev.categoryId === nextCategory &&
      prev.date === nextDate &&
      prev.sortBy === nextSortBy &&
      prev.sortDir === nextSortDir
        ? prev
        : nextFilters
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
    if (name === 'sortKey') {
      const nextSort = fromSortKey(value);
      setFilters((prev) => ({ ...prev, ...nextSort }));
      return;
    }
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleApplyFilters = (event) => {
    event.preventDefault();
    setError('');
    const nextFilters = {
      ...filters,
      title: filters.title.trim(),
      sortBy: normalizeSortBy(filters.sortBy),
      sortDir: normalizeSortDir(filters.sortDir)
    };
    setAppliedFilters(nextFilters);

    const nextParams = {};
    if (nextFilters.title) {
      nextParams.title = nextFilters.title;
    }
    if (nextFilters.categoryId) {
      nextParams.categoryId = nextFilters.categoryId;
    }
    if (nextFilters.date) {
      nextParams.date = nextFilters.date;
    }
    if (nextFilters.sortBy !== DEFAULT_SORT.sortBy) {
      nextParams.sortBy = nextFilters.sortBy;
    }
    if (nextFilters.sortDir !== DEFAULT_SORT.sortDir) {
      nextParams.sortDir = nextFilters.sortDir;
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

              <label>
                Дата мероприятия
                <DatePickerField
                  value={filters.date}
                  onChange={(nextDate) => setFilters((prev) => ({ ...prev, date: nextDate }))}
                  placeholder="Выбрать дату"
                />
              </label>

              <label>
                Сортировка
                <select name="sortKey" value={toSortKey(filters.sortBy, filters.sortDir)} onChange={handleFilterInput}>
                  <option value="createdAt:desc">Сначала новые</option>
                  <option value="createdAt:asc">Сначала старые</option>
                  <option value="title:asc">Название: А-Я</option>
                  <option value="title:desc">Название: Я-А</option>
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
              {appliedFilters.date && <span className="chip">Дата: {formatDateChip(appliedFilters.date)}</span>}
              <span className="chip">Сортировка: {sortLabel(appliedFilters.sortBy, appliedFilters.sortDir)}</span>
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

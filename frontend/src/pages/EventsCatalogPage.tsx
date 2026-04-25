import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarRange, LayoutList, Map, Search, SlidersHorizontal, Tag, X } from 'lucide-react';
import { toast } from 'sonner';
import { EventsCatalogMap } from '@/components/EventsCatalogMap';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EventCard } from '@/components/EventCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/StateDisplays';
import { PublicLayout } from '@/layouts/PublicLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useCity } from '@/contexts/CityContext';
import { eventService } from '@/services/event-service';
import { directoryService } from '@/services/directory-service';
import { favoriteService } from '@/services/favorite-service';
import type { Category, Event, Id } from '@/types';

interface CatalogFilters {
  search: string;
  categoryId: string;
  dateFrom: string;
  dateTo: string;
  participationType: string;
  priceFrom: string;
  priceTo: string;
}

const EMPTY_FILTERS: CatalogFilters = {
  search: '',
  categoryId: '',
  dateFrom: '',
  dateTo: '',
  participationType: '',
  priceFrom: '',
  priceTo: '',
};

function parseFilters(searchParams: URLSearchParams): CatalogFilters {
  return {
    search: searchParams.get('search') || '',
    categoryId: searchParams.get('category') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    participationType: searchParams.get('participationType') || '',
    priceFrom: searchParams.get('priceFrom') || '',
    priceTo: searchParams.get('priceTo') || '',
  };
}

function normalizeFilters(filters: CatalogFilters): CatalogFilters {
  return {
    ...filters,
    search: filters.search.trim(),
    priceFrom: filters.priceFrom.trim(),
    priceTo: filters.priceTo.trim(),
  };
}

function sameFilters(a: CatalogFilters, b: CatalogFilters): boolean {
  return a.search === b.search
    && a.categoryId === b.categoryId
    && a.dateFrom === b.dateFrom
    && a.dateTo === b.dateTo
    && a.participationType === b.participationType
    && a.priceFrom === b.priceFrom
    && a.priceTo === b.priceTo;
}

export default function EventsCatalogPage() {
  const { user } = useAuth();
  const { selectedCity } = useCity();
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [eventsLoading, setEventsLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [draftFilters, setDraftFilters] = useState<CatalogFilters>(() => parseFilters(searchParams));
  const [appliedFilters, setAppliedFilters] = useState<CatalogFilters>(() => parseFilters(searchParams));
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const {
    search,
    categoryId,
    dateFrom,
    dateTo,
    participationType,
    priceFrom,
    priceTo,
  } = appliedFilters;

  useEffect(() => {
    let active = true;
    setCategoriesLoading(true);

    directoryService
      .getCategories()
      .then((categoriesResponse) => {
        if (!active) return;
        setCategories(categoriesResponse);
      })
      .finally(() => {
        if (active) setCategoriesLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setEventsLoading(true);

    eventService
      .getEvents({
        size: 400,
        search: search || undefined,
        categoryId: categoryId || undefined,
        cityId: selectedCity?.id || undefined,
        startDate: dateFrom || undefined,
        endDate: dateTo || undefined,
        participationType: participationType || undefined,
        priceFrom: priceFrom ? Number(priceFrom) : undefined,
        priceTo: priceTo ? Number(priceTo) : undefined,
        registrationOpen: true,
        status: 'PUBLISHED',
      })
      .then((eventsResponse) => {
        if (!active) return;
        setEvents(eventsResponse.content);
      })
      .finally(() => {
        if (active) setEventsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    selectedCity?.id,
    search,
    categoryId,
    dateFrom,
    dateTo,
    participationType,
    priceFrom,
    priceTo,
  ]);

  useEffect(() => {
    let active = true;

    if (!user) {
      setFavoriteIds(new Set());
      return () => {
        active = false;
      };
    }

    favoriteService
      .getMyFavorites(user.id)
      .then((favorites) => {
        if (!active) return;
        setFavoriteIds(new Set(favorites.map((favorite) => String(favorite.eventId))));
      })
      .catch(() => {
        if (!active) return;
        setFavoriteIds(new Set());
      });

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    const nextParams: Record<string, string> = {};

    if (appliedFilters.search) nextParams.search = appliedFilters.search;
    if (appliedFilters.categoryId) nextParams.category = appliedFilters.categoryId;
    if (appliedFilters.dateFrom) nextParams.dateFrom = appliedFilters.dateFrom;
    if (appliedFilters.dateTo) nextParams.dateTo = appliedFilters.dateTo;
    if (appliedFilters.participationType) nextParams.participationType = appliedFilters.participationType;
    if (appliedFilters.priceFrom) nextParams.priceFrom = appliedFilters.priceFrom;
    if (appliedFilters.priceTo) nextParams.priceTo = appliedFilters.priceTo;

    setSearchParams(nextParams, { replace: true });
  }, [appliedFilters, setSearchParams]);

  const filteredEvents = useMemo(() => events, [events]);

  const loading = eventsLoading || categoriesLoading;
  const selectedCityLabel = selectedCity
    ? `${selectedCity.name}${selectedCity.region ? `, ${selectedCity.region}` : ''}`
    : '';

  const hasAppliedFilters = Boolean(
    appliedFilters.search
      || appliedFilters.categoryId
      || appliedFilters.dateFrom
      || appliedFilters.dateTo
      || appliedFilters.participationType
      || appliedFilters.priceFrom
      || appliedFilters.priceTo,
  );

  const isDirty = useMemo(
    () => !sameFilters(draftFilters, appliedFilters),
    [draftFilters, appliedFilters],
  );

  const updateDraftFilter = (key: keyof CatalogFilters, value: string) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setAppliedFilters(normalizeFilters(draftFilters));
  };

  const clearFilters = () => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  };

  const activeFilterTags = useMemo(() => {
    const tags: string[] = [];
    if (appliedFilters.search) tags.push(`Поиск: ${appliedFilters.search}`);
    if (appliedFilters.categoryId) {
      const categoryName = categories.find((item) => String(item.id) === appliedFilters.categoryId)?.name;
      if (categoryName) tags.push(`Категория: ${categoryName}`);
    }
    if (appliedFilters.dateFrom || appliedFilters.dateTo) {
      tags.push(`Дата: ${appliedFilters.dateFrom || '…'} - ${appliedFilters.dateTo || '…'}`);
    }
    if (appliedFilters.participationType) {
      tags.push(appliedFilters.participationType === 'free' ? 'Только бесплатные' : 'Только платные');
    }
    if (appliedFilters.priceFrom || appliedFilters.priceTo) {
      tags.push(`Цена: ${appliedFilters.priceFrom || '0'} - ${appliedFilters.priceTo || '∞'} ₽`);
    }
    return tags;
  }, [appliedFilters, categories]);

  const toggleFavorite = async (eventId: Id) => {
    if (!user) {
      toast.info('Войдите, чтобы добавлять события в избранное');
      return;
    }

    const key = String(eventId);
    const isFavorite = favoriteIds.has(key);

    try {
      if (isFavorite) {
        await favoriteService.removeFavorite(user.id, eventId);
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        toast.success('Удалено из избранного');
        return;
      }

      await favoriteService.addFavorite(user.id, eventId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });
      toast.success('Добавлено в избранное');
    } catch (error: any) {
      toast.error(error?.message || 'Не удалось обновить избранное');
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <LoadingState />
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-heading text-3xl text-foreground sm:text-4xl">Мероприятия</h1>
          <p className="mt-1 text-muted-foreground">
            {selectedCity
              ? `Подборка мероприятий: ${selectedCityLabel}`
              : 'Найдите интересные культурные события рядом с вами'}
          </p>
        </div>

        <div className="surface-panel mb-8 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={draftFilters.search}
                onChange={(event) => updateDraftFilter('search', event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') applyFilters();
                }}
                placeholder="Поиск мероприятий, организаций и артистов…"
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button variant={isDirty ? 'default' : 'outline'} onClick={applyFilters}>
                Показать
              </Button>
              <Button
                variant="outline"
                className="gap-2 sm:hidden"
                onClick={() => setShowFilters((prev) => !prev)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Фильтры
              </Button>
            </div>
          </div>

          {isDirty && (
            <p className="text-xs text-warning">
              Изменения фильтров ещё не применены
            </p>
          )}

          <div className={`space-y-4 ${showFilters ? 'block' : 'hidden sm:block'}`}>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => updateDraftFilter('categoryId', '')}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-all ${
                  draftFilters.categoryId === ''
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                Все категории
              </button>

              {categories.map((category) => (
                <button
                  type="button"
                  key={category.id}
                  onClick={() => updateDraftFilter('categoryId', String(category.id))}
                  className={`rounded-full border px-3.5 py-1.5 text-sm transition-all ${
                    draftFilters.categoryId === String(category.id)
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <div className="space-y-1">
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarRange className="h-3.5 w-3.5" />
                  Дата с
                </label>
                <Input
                  type="date"
                  value={draftFilters.dateFrom}
                  onChange={(event) => updateDraftFilter('dateFrom', event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarRange className="h-3.5 w-3.5" />
                  Дата по
                </label>
                <Input
                  type="date"
                  value={draftFilters.dateTo}
                  onChange={(event) => updateDraftFilter('dateTo', event.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Тип участия</label>
                <select
                  value={draftFilters.participationType}
                  onChange={(event) => updateDraftFilter('participationType', event.target.value)}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Любой</option>
                  <option value="free">Бесплатно</option>
                  <option value="paid">Платно</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Цена от, ₽</label>
                <Input
                  type="number"
                  min={0}
                  value={draftFilters.priceFrom}
                  onChange={(event) => updateDraftFilter('priceFrom', event.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Цена до, ₽</label>
                <Input
                  type="number"
                  min={0}
                  value={draftFilters.priceTo}
                  onChange={(event) => updateDraftFilter('priceTo', event.target.value)}
                  placeholder="5000"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={applyFilters}>Применить фильтры</Button>
              {hasAppliedFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="mr-1 h-4 w-4" />
                  Сбросить
                </Button>
              )}
            </div>
          </div>
        </div>

        {activeFilterTags.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Tag className="h-3.5 w-3.5" />
              Активные фильтры:
            </span>
            {activeFilterTags.map((tag) => (
              <span key={tag} className="rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground">
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {filteredEvents.length > 0 ? `Найдено: ${filteredEvents.length}` : ''}
          </p>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-label="Список"
            >
              <LayoutList className="h-4 w-4" />
              <span className="hidden sm:inline">Список</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                viewMode === 'map'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              aria-label="Карта"
            >
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">Карта</span>
            </button>
          </div>
        </div>

        {viewMode === 'map' ? (
          <EventsCatalogMap events={filteredEvents} />
        ) : filteredEvents.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                isFavorite={favoriteIds.has(String(event.id))}
                onFavoriteToggle={toggleFavorite}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Search}
            title="Нет мероприятий"
            description={selectedCity
              ? `Для города ${selectedCityLabel} пока нет подходящих мероприятий`
              : 'Попробуйте изменить параметры поиска'}
          />
        )}
      </div>
    </PublicLayout>
  );
}

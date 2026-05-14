import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowDownUp, CalendarRange, LayoutList, Map, Search, SlidersHorizontal, Tag, X } from 'lucide-react';
import { toast } from 'sonner';
import { EventsCatalogMap } from '@/components/EventsCatalogMap';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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

// Поддерживаемые варианты сортировки. Значение `value` — это конкатенация sortBy:sortDir,
// которое потом расщепляется при отправке запроса. Так удобно держать всё в одном select.
const SORT_OPTIONS: Array<{ value: string; label: string; sortBy: string; sortDir: 'asc' | 'desc' }> = [
  { value: 'date-asc',  label: 'Дата: ближайшие сначала', sortBy: 'nextSessionAt', sortDir: 'asc'  },
  { value: 'date-desc', label: 'Дата: поздние сначала',   sortBy: 'nextSessionAt', sortDir: 'desc' },
  { value: 'price-asc', label: 'Цена: дешевле сначала',   sortBy: 'price',         sortDir: 'asc'  },
  { value: 'price-desc',label: 'Цена: дороже сначала',    sortBy: 'price',         sortDir: 'desc' },
  { value: 'title-asc', label: 'Название: А → Я',         sortBy: 'title',         sortDir: 'asc'  },
  { value: 'title-desc',label: 'Название: Я → А',         sortBy: 'title',         sortDir: 'desc' },
  { value: 'new-desc',  label: 'Новые сначала',           sortBy: 'createdAt',     sortDir: 'desc' },
];
const DEFAULT_SORT = 'date-asc';

interface CatalogFilters {
  search: string;
  categoryId: string;
  dateFrom: string;
  dateTo: string;
  participationType: string;
  priceFrom: string;
  priceTo: string;
  sort: string;
}

const EMPTY_FILTERS: CatalogFilters = {
  search: '',
  categoryId: '',
  dateFrom: '',
  dateTo: '',
  participationType: '',
  priceFrom: '',
  priceTo: '',
  sort: DEFAULT_SORT,
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
    sort: searchParams.get('sort') || DEFAULT_SORT,
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
    && a.priceTo === b.priceTo
    && a.sort === b.sort;
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
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const {
    search,
    categoryId,
    dateFrom,
    dateTo,
    participationType,
    priceFrom,
    priceTo,
    sort,
  } = appliedFilters;
  const currentSort = SORT_OPTIONS.find((opt) => opt.value === sort) ?? SORT_OPTIONS[0];

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
        sortBy: currentSort.sortBy as any,
        sortDir: currentSort.sortDir,
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
    sort,
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
    if (appliedFilters.sort && appliedFilters.sort !== DEFAULT_SORT) nextParams.sort = appliedFilters.sort;

    setSearchParams(nextParams, { replace: true });
  }, [appliedFilters, setSearchParams]);

  useEffect(() => {
    const query = draftFilters.search.trim();
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      eventService
        .getEvents({ search: query, size: 6, status: 'PUBLISHED', cityId: selectedCity?.id || undefined })
        .then((res) => {
          const titles = [...new Set(res.content.map((e) => e.title))].slice(0, 6);
          setSuggestions(titles);
          setShowSuggestions(titles.length > 0);
        })
        .catch(() => setSuggestions([]));
    }, 280);

    return () => clearTimeout(timer);
  }, [draftFilters.search, selectedCity?.id]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

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

  // Чипы-теги активных фильтров. Каждый знает, как сбросить только себя
  // (вместо общего «Сбросить всё»). Так пользователю удобнее снимать ошибочный фильтр.
  const activeFilterTags = useMemo(() => {
    const tags: Array<{ key: string; label: string; onRemove: () => void }> = [];
    if (appliedFilters.search) {
      tags.push({
        key: 'search',
        label: `Поиск: ${appliedFilters.search}`,
        onRemove: () => {
          setDraftFilters((prev) => ({ ...prev, search: '' }));
          setAppliedFilters((prev) => ({ ...prev, search: '' }));
        },
      });
    }
    if (appliedFilters.categoryId) {
      const categoryName = categories.find((item) => String(item.id) === appliedFilters.categoryId)?.name;
      if (categoryName) {
        tags.push({
          key: 'category',
          label: `Категория: ${categoryName}`,
          onRemove: () => {
            setDraftFilters((prev) => ({ ...prev, categoryId: '' }));
            setAppliedFilters((prev) => ({ ...prev, categoryId: '' }));
          },
        });
      }
    }
    if (appliedFilters.dateFrom || appliedFilters.dateTo) {
      tags.push({
        key: 'date',
        label: `Дата: ${appliedFilters.dateFrom || '…'} — ${appliedFilters.dateTo || '…'}`,
        onRemove: () => {
          setDraftFilters((prev) => ({ ...prev, dateFrom: '', dateTo: '' }));
          setAppliedFilters((prev) => ({ ...prev, dateFrom: '', dateTo: '' }));
        },
      });
    }
    if (appliedFilters.participationType) {
      tags.push({
        key: 'participation',
        label: appliedFilters.participationType === 'free' ? 'Только бесплатные' : 'Только платные',
        onRemove: () => {
          setDraftFilters((prev) => ({ ...prev, participationType: '' }));
          setAppliedFilters((prev) => ({ ...prev, participationType: '' }));
        },
      });
    }
    if (appliedFilters.priceFrom || appliedFilters.priceTo) {
      tags.push({
        key: 'price',
        label: `Цена: ${appliedFilters.priceFrom || '0'} — ${appliedFilters.priceTo || '∞'} ₽`,
        onRemove: () => {
          setDraftFilters((prev) => ({ ...prev, priceFrom: '', priceTo: '' }));
          setAppliedFilters((prev) => ({ ...prev, priceFrom: '', priceTo: '' }));
        },
      });
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
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(var(--warm-cream))] via-background to-[hsl(var(--golden-light)/0.2)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_80%_-20%,hsl(var(--terracotta)/0.06),transparent)]" />
        <div className="container relative mx-auto px-4 py-10">
          <h1 className="page-title">Мероприятия</h1>
          <p className="mt-1.5 text-muted-foreground">
            {selectedCity
              ? `Подборка мероприятий: ${selectedCityLabel}`
              : 'Найдите интересные культурные события рядом с вами'}
          </p>
        </div>
      </section>

      <div className="container mx-auto px-4 py-8">
        <div className="surface-panel mb-6 space-y-4">
          {/* Верхняя строка: поиск + автоподсказки + сортировка + кнопка раскрытия панели фильтров. */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div ref={searchContainerRef} className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={draftFilters.search}
                onChange={(event) => {
                  updateDraftFilter('search', event.target.value);
                  setShowSuggestions(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    setShowSuggestions(false);
                    applyFilters();
                  }
                  if (event.key === 'Escape') setShowSuggestions(false);
                }}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                placeholder="Найдите мероприятие по названию…"
                className="h-11 pl-9 pr-9"
                autoComplete="off"
              />
              {draftFilters.search && (
                <button
                  type="button"
                  onClick={() => {
                    updateDraftFilter('search', '');
                    setShowSuggestions(false);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                  aria-label="Очистить поиск"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {/* Автоподсказки с названиями реальных мероприятий — появляются после 2 символов. */}
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-card">
                  {suggestions.map((title) => (
                    <li key={title}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          updateDraftFilter('search', title);
                          setShowSuggestions(false);
                          setAppliedFilters(normalizeFilters({ ...draftFilters, search: title }));
                        }}
                      >
                        <Search className="h-3.5 w-3.5 shrink-0 text-primary/50" />
                        <span className="truncate">{title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Сортировка: всегда видна, применяется сразу при выборе. */}
            <div className="flex items-center gap-2">
              <ArrowDownUp className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Select
                value={sort}
                onValueChange={(next) => {
                  setDraftFilters((prev) => ({ ...prev, sort: next }));
                  setAppliedFilters((prev) => ({ ...prev, sort: next }));
                }}
              >
                <SelectTrigger className="h-11 w-full lg:w-60" aria-label="Сортировка">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="h-11 gap-2"
                onClick={() => setShowFilters((prev) => !prev)}
                aria-expanded={showFilters}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Фильтры
                {hasAppliedFilters && (
                  <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
                    {activeFilterTags.length}
                  </span>
                )}
              </Button>
              <Button
                variant={isDirty ? 'default' : 'outline'}
                className="h-11"
                onClick={applyFilters}
                disabled={!isDirty}
              >
                Показать
              </Button>
            </div>
          </div>

          {/* Раскрывающаяся панель: категории + три аккуратные группы (даты / тип / цена). */}
          {showFilters && (
            <div className="space-y-5 rounded-xl border border-border/60 bg-background/50 p-4">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase leading-none tracking-wider text-muted-foreground">
                  Категория
                </p>
                <div className="flex flex-wrap gap-2">
                  {[{ id: '', name: 'Все категории' }, ...categories].map((category) => {
                    const active = draftFilters.categoryId === String(category.id === '' ? '' : category.id);
                    return (
                      <button
                        type="button"
                        key={category.id}
                        onClick={() => updateDraftFilter('categoryId', category.id === '' ? '' : String(category.id))}
                        className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-150 ${
                          active
                            ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                            : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground'
                        }`}
                      >
                        {category.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Тип участия — чипы (3 значения, удобнее одним кликом, чем выпадашкой). */}
              <div>
                <p className="mb-2 text-xs font-semibold uppercase leading-none tracking-wider text-muted-foreground">
                  Тип участия
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: '', label: 'Любой' },
                    { value: 'free', label: 'Бесплатные' },
                    { value: 'paid', label: 'Платные' },
                  ].map((option) => {
                    const active = draftFilters.participationType === option.value;
                    return (
                      <button
                        type="button"
                        key={option.label}
                        onClick={() => updateDraftFilter('participationType', option.value)}
                        className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-150 ${
                          active
                            ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                            : 'border-border bg-card text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground'
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Даты + цена: одна линия колонок на md (равные половины и одинаковый gap между всеми четырьмя полями). */}
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <p className="text-xs font-semibold uppercase leading-none tracking-wider text-muted-foreground">
                    Даты
                  </p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0">
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <label className="flex min-h-[1.125rem] items-center gap-1 text-xs text-muted-foreground">
                        <CalendarRange className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span>с</span>
                      </label>
                      <DatePicker
                        value={draftFilters.dateFrom}
                        onChange={(v) => updateDraftFilter('dateFrom', v)}
                        placeholder="с"
                      />
                    </div>
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <label className="flex min-h-[1.125rem] items-center gap-1 text-xs text-muted-foreground">
                        <CalendarRange className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span>по</span>
                      </label>
                      <DatePicker
                        value={draftFilters.dateTo}
                        onChange={(v) => updateDraftFilter('dateTo', v)}
                        placeholder="по"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <p className="text-xs font-semibold uppercase leading-none tracking-wider text-muted-foreground">
                    Цена, ₽
                  </p>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-0">
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <label className="flex min-h-[1.125rem] items-center gap-1 text-xs text-muted-foreground">
                        <span className="inline-block h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span>от</span>
                      </label>
                      <Input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        className="w-full min-w-0 h-10 tabular-nums"
                        value={draftFilters.priceFrom}
                        onChange={(event) => updateDraftFilter('priceFrom', event.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <label className="flex min-h-[1.125rem] items-center gap-1 text-xs text-muted-foreground">
                        <span className="inline-block h-3.5 w-3.5 shrink-0" aria-hidden />
                        <span>до</span>
                      </label>
                      <Input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        className="w-full min-w-0 h-10 tabular-nums"
                        value={draftFilters.priceTo}
                        onChange={(event) => updateDraftFilter('priceTo', event.target.value)}
                        placeholder="∞"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 py-3">
                {hasAppliedFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    <X className="mr-1 h-4 w-4" />
                    Сбросить всё
                  </Button>
                )}
                <Button size="sm" onClick={applyFilters} disabled={!isDirty}>
                  Применить
                </Button>
              </div>
            </div>
          )}

          {isDirty && !showFilters && (
            <p className="text-xs text-warning">Изменения фильтров ещё не применены</p>
          )}
        </div>

        {/* Чипы активных фильтров: каждый удаляется по клику на «×». */}
        {activeFilterTags.length > 0 && (
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Tag className="h-3.5 w-3.5" />
              Активные:
            </span>
            {activeFilterTags.map((tag) => (
              <span
                key={tag.key}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs text-foreground"
              >
                {tag.label}
                <button
                  type="button"
                  onClick={tag.onRemove}
                  className="-mr-1 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label={`Убрать фильтр: ${tag.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
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

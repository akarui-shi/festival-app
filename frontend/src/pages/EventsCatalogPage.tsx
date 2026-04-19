import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
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

export default function EventsCatalogPage() {
  const { user } = useAuth();
  const { selectedCity } = useCity();
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [eventsLoading, setEventsLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [categoryId, setCategoryId] = useState(searchParams.get('category') || '');
  const [dateFrom, setDateFrom] = useState(searchParams.get('dateFrom') || '');
  const [dateTo, setDateTo] = useState(searchParams.get('dateTo') || '');
  const [participationType, setParticipationType] = useState(searchParams.get('participationType') || '');
  const [priceFrom, setPriceFrom] = useState(searchParams.get('priceFrom') || '');
  const [priceTo, setPriceTo] = useState(searchParams.get('priceTo') || '');
  const [showFilters, setShowFilters] = useState(false);

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
        search,
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
  }, [selectedCity?.id, search, categoryId, dateFrom, dateTo, participationType, priceFrom, priceTo]);

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

    if (search) nextParams.search = search;
    if (categoryId) nextParams.category = categoryId;
    if (dateFrom) nextParams.dateFrom = dateFrom;
    if (dateTo) nextParams.dateTo = dateTo;
    if (participationType) nextParams.participationType = participationType;
    if (priceFrom) nextParams.priceFrom = priceFrom;
    if (priceTo) nextParams.priceTo = priceTo;

    setSearchParams(nextParams, { replace: true });
  }, [search, categoryId, dateFrom, dateTo, participationType, priceFrom, priceTo, setSearchParams]);

  const filteredEvents = useMemo(() => events, [events]);

  const loading = eventsLoading || categoriesLoading;
  const selectedCityLabel = selectedCity
    ? `${selectedCity.name}${selectedCity.region ? `, ${selectedCity.region}` : ''}`
    : '';

  const hasFilters = Boolean(search || categoryId || dateFrom || dateTo || participationType || priceFrom || priceTo);

  const clearFilters = () => {
    setSearch('');
    setCategoryId('');
    setDateFrom('');
    setDateTo('');
    setParticipationType('');
    setPriceFrom('');
    setPriceTo('');
  };

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

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск мероприятий, организаций и артистов…"
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            className="gap-2 sm:hidden"
            onClick={() => setShowFilters((prev) => !prev)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Фильтры
          </Button>
        </div>

        <div className={`mb-8 space-y-4 ${showFilters ? 'block' : 'hidden sm:block'}`}>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategoryId('')}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-all ${
                categoryId === ''
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
                onClick={() => setCategoryId(String(category.id))}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-all ${
                  categoryId === String(category.id)
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} placeholder="Дата с" />
            <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} placeholder="Дата по" />
            <select
              value={participationType}
              onChange={(event) => setParticipationType(event.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">Тип участия</option>
              <option value="free">Бесплатно</option>
              <option value="paid">Платно</option>
            </select>
            <Input type="number" min={0} value={priceFrom} onChange={(event) => setPriceFrom(event.target.value)} placeholder="Цена от" />
            <Input type="number" min={0} value={priceTo} onChange={(event) => setPriceTo(event.target.value)} placeholder="Цена до" />
          </div>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-muted-foreground">
              Сбросить фильтры
            </Button>
          )}
        </div>

        {filteredEvents.length > 0 ? (
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

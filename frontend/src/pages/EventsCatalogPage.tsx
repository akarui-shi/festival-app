import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { EventCard } from '@/components/EventCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/StateDisplays';
import { PublicLayout } from '@/layouts/PublicLayout';
import { eventService } from '@/services/event-service';
import { directoryService } from '@/services/directory-service';
import type { Category, City, Event } from '@/types';

export default function EventsCatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [categoryId, setCategoryId] = useState(searchParams.get('category') || '');
  const [cityId, setCityId] = useState(searchParams.get('city') || '');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    Promise.all([
      eventService.getEvents({ size: 60 }),
      directoryService.getCategories(),
      directoryService.getCities(),
    ])
      .then(([eventsResponse, categoriesResponse, citiesResponse]) => {
        setEvents(eventsResponse.content);
        setCategories(categoriesResponse);
        setCities(citiesResponse);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const nextParams: Record<string, string> = {};

    if (search) nextParams.search = search;
    if (categoryId) nextParams.category = categoryId;
    if (cityId) nextParams.city = cityId;

    setSearchParams(nextParams);
  }, [search, categoryId, cityId, setSearchParams]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const normalizedSearch = search.trim().toLowerCase();
      const matchesSearch =
        normalizedSearch.length === 0
        || event.title.toLowerCase().includes(normalizedSearch)
        || event.shortDescription.toLowerCase().includes(normalizedSearch);
      const matchesCategory = !categoryId || event.categoryId === categoryId;
      const matchesCity = !cityId || event.cityId === cityId;

      return matchesSearch && matchesCategory && matchesCity;
    });
  }, [events, search, categoryId, cityId]);

  const hasFilters = Boolean(search || categoryId || cityId);

  const clearFilters = () => {
    setSearch('');
    setCategoryId('');
    setCityId('');
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
          <p className="mt-1 text-muted-foreground">Найдите интересные культурные события рядом с вами</p>
        </div>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Поиск мероприятий..."
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
                onClick={() => setCategoryId(category.id)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-all ${
                  categoryId === category.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                }`}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCityId('')}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-all ${
                cityId === ''
                  ? 'border-primary bg-primary/10 font-semibold text-primary'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40'
              }`}
            >
              Все города
            </button>

            {cities.map((city) => (
              <button
                type="button"
                key={city.id}
                onClick={() => setCityId(city.id)}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-all ${
                  cityId === city.id
                    ? 'border-primary bg-primary/10 font-semibold text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40'
                }`}
              >
                {city.name}
              </button>
            ))}
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
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Search}
            title="Нет мероприятий"
            description="Попробуйте изменить параметры поиска или выбрать другой город"
          />
        )}
      </div>
    </PublicLayout>
  );
}

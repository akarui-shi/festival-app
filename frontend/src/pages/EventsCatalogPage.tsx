import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { EventCard } from '@/components/EventCard';
import { LoadingState, EmptyState } from '@/components/StateDisplays';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { eventService } from '@/services/event-service';
import { directoryService } from '@/services/directory-service';
import type { Event, Category, City } from '@/types';
import { Search, X, SlidersHorizontal } from 'lucide-react';

export default function EventsCatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<Event[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [categoryId, setCategoryId] = useState(searchParams.get('category') || '');
  const [cityId, setCityId] = useState(searchParams.get('city') || '');
  const [format, setFormat] = useState(searchParams.get('format') || '');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    Promise.all([
      eventService.getEvents({ size: 50 }),
      directoryService.getCategories(),
      directoryService.getCities(),
    ]).then(([res, cats, cits]) => {
      setEvents(res.content);
      setCategories(cats);
      setCities(cits);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    let result = events;
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(e => e.title.toLowerCase().includes(s) || e.shortDescription.toLowerCase().includes(s));
    }
    if (categoryId) result = result.filter(e => e.categoryId === categoryId);
    if (cityId) result = result.filter(e => e.cityId === cityId);
    if (format) result = result.filter(e => e.format === format);
    return result;
  }, [events, search, categoryId, cityId, format]);

  const hasFilters = categoryId || cityId || format || search;

  const clearFilters = () => {
    setSearch(''); setCategoryId(''); setCityId(''); setFormat('');
    setSearchParams({});
  };

  if (loading) return <PublicLayout><LoadingState /></PublicLayout>;

  return (
    <PublicLayout>
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="font-heading text-3xl md:text-4xl font-bold mb-2">Мероприятия</h1>
          <p className="text-muted-foreground">Найдите интересное событие рядом с вами</p>
        </div>

        {/* Search & Filters */}
        <div className="space-y-4 mb-8">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Поиск по названию..." value={search}
                onChange={e => setSearch(e.target.value)} className="pl-10" />
            </div>
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="md:hidden">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </div>

          <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${showFilters ? '' : 'hidden md:grid'}`}>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Категория" /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={cityId} onValueChange={setCityId}>
              <SelectTrigger><SelectValue placeholder="Город" /></SelectTrigger>
              <SelectContent>
                {cities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={format} onValueChange={setFormat}>
              <SelectTrigger><SelectValue placeholder="Формат" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="OFFLINE">Офлайн</SelectItem>
                <SelectItem value="ONLINE">Онлайн</SelectItem>
                <SelectItem value="HYBRID">Гибрид</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
              <X className="h-3.5 w-3.5 mr-1" />Сбросить фильтры
            </Button>
          )}
        </div>

        {/* Results */}
        {filtered.length === 0 ? (
          <EmptyState icon="🔍" title="Ничего не найдено" description="Попробуйте изменить параметры поиска" action={hasFilters ? <Button variant="outline" onClick={clearFilters}>Сбросить фильтры</Button> : undefined} />
        ) : (
          <>
            <p className="text-sm text-muted-foreground mb-4">Найдено: {filtered.length}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(event => <EventCard key={event.id} event={event} />)}
            </div>
          </>
        )}
      </div>
    </PublicLayout>
  );
}

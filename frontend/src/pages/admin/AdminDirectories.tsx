import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { directoryService } from '@/services/directory-service';
import { LoadingState } from '@/components/StateDisplays';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Category, City, Venue } from '@/types';

export default function AdminDirectories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCat, setNewCat] = useState({ name: '', slug: '' });
  const [newCity, setNewCity] = useState({ name: '', region: '' });
  const [newVenue, setNewVenue] = useState({ name: '', address: '', cityId: '', capacity: '' });

  useEffect(() => {
    Promise.all([directoryService.getCategories(), directoryService.getCities(), directoryService.getVenues()])
      .then(([categoryResponse, cityResponse, venueResponse]) => {
        setCategories(categoryResponse);
        setCities(cityResponse);
        setVenues(venueResponse);
        setLoading(false);
      });
  }, []);

  const addCategory = async () => {
    if (!newCat.name) return;
    const cat = await directoryService.createCategory({
      name: newCat.name,
      slug: newCat.slug || newCat.name.toLowerCase(),
    });
    setCategories((prev) => [...prev, cat]);
    setNewCat({ name: '', slug: '' });
    toast.success('Категория добавлена');
  };

  const addCity = async () => {
    if (!newCity.name) return;
    const city = await directoryService.createCity(newCity);
    setCities((prev) => [...prev, city]);
    setNewCity({ name: '', region: '' });
    toast.success('Город добавлен');
  };

  const addVenue = async () => {
    if (!newVenue.name || !newVenue.cityId) return;
    const venue = await directoryService.createVenue({ ...newVenue, capacity: Number(newVenue.capacity) || undefined });
    setVenues((prev) => [...prev, venue]);
    setNewVenue({ name: '', address: '', cityId: '', capacity: '' });
    toast.success('Площадка добавлена');
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="font-heading text-3xl text-foreground sm:text-4xl">Справочники</h1>
        <p className="mt-1 text-muted-foreground">Категории, города и площадки для мероприятий</p>
      </section>

      <Tabs defaultValue="categories">
        <TabsList className="h-auto rounded-xl bg-muted/70 p-1">
          <TabsTrigger value="categories">Категории ({categories.length})</TabsTrigger>
          <TabsTrigger value="cities">Города ({cities.length})</TabsTrigger>
          <TabsTrigger value="venues">Площадки ({venues.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-4 space-y-4">
          <div className="grid gap-3 rounded-xl border border-border bg-card p-4 shadow-soft sm:grid-cols-[1fr_220px_auto] sm:items-end">
            <div>
              <Label>Название</Label>
              <Input
                value={newCat.name}
                onChange={(event) => setNewCat((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Новая категория"
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                value={newCat.slug}
                onChange={(event) => setNewCat((prev) => ({ ...prev, slug: event.target.value }))}
                placeholder="slug"
              />
            </div>
            <Button onClick={addCategory} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Добавить
            </Button>
          </div>

          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm shadow-soft">
                <span>{category.icon}</span>
                <span className="font-medium text-foreground">{category.name}</span>
                <span className="text-muted-foreground">{category.slug}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="cities" className="mt-4 space-y-4">
          <div className="grid gap-3 rounded-xl border border-border bg-card p-4 shadow-soft sm:grid-cols-[1fr_260px_auto] sm:items-end">
            <div>
              <Label>Название</Label>
              <Input
                value={newCity.name}
                onChange={(event) => setNewCity((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Город"
              />
            </div>
            <div>
              <Label>Регион</Label>
              <Input
                value={newCity.region}
                onChange={(event) => setNewCity((prev) => ({ ...prev, region: event.target.value }))}
                placeholder="Область"
              />
            </div>
            <Button onClick={addCity} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Добавить
            </Button>
          </div>

          <div className="space-y-2">
            {cities.map((city) => (
              <div key={city.id} className="rounded-xl border border-border bg-card p-3 text-sm shadow-soft">
                <span className="font-medium text-foreground">{city.name}</span>
                {city.region && <span className="ml-2 text-muted-foreground">{city.region}</span>}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="venues" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 items-end gap-3 rounded-xl border border-border bg-card p-4 shadow-soft sm:grid-cols-4">
            <div>
              <Label>Название</Label>
              <Input
                value={newVenue.name}
                onChange={(event) => setNewVenue((prev) => ({ ...prev, name: event.target.value }))}
              />
            </div>
            <div>
              <Label>Адрес</Label>
              <Input
                value={newVenue.address}
                onChange={(event) => setNewVenue((prev) => ({ ...prev, address: event.target.value }))}
              />
            </div>
            <div>
              <Label>Город</Label>
              <select
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={newVenue.cityId}
                onChange={(event) => setNewVenue((prev) => ({ ...prev, cityId: event.target.value }))}
              >
                <option value="">Выберите</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={addVenue} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Добавить
            </Button>
          </div>

          <div className="space-y-2">
            {venues.map((venue) => (
              <div key={venue.id} className="rounded-xl border border-border bg-card p-3 text-sm shadow-soft">
                <span className="font-medium text-foreground">{venue.name}</span>
                <span className="ml-2 text-muted-foreground">{venue.address}</span>
                {venue.city && <span className="ml-2 text-muted-foreground">· {venue.city.name}</span>}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { directoryService } from '@/services/directory-service';
import { LoadingState } from '@/components/StateDisplays';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Category, City, Venue } from '@/types';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

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
      .then(([c, ci, v]) => { setCategories(c); setCities(ci); setVenues(v); setLoading(false); });
  }, []);

  const addCategory = async () => {
    if (!newCat.name) return;
    const cat = await directoryService.createCategory({ name: newCat.name, slug: newCat.slug || newCat.name.toLowerCase() });
    setCategories(prev => [...prev, cat]);
    setNewCat({ name: '', slug: '' });
    toast.success('Категория добавлена');
  };

  const addCity = async () => {
    if (!newCity.name) return;
    const city = await directoryService.createCity(newCity);
    setCities(prev => [...prev, city]);
    setNewCity({ name: '', region: '' });
    toast.success('Город добавлен');
  };

  const addVenue = async () => {
    if (!newVenue.name || !newVenue.cityId) return;
    const venue = await directoryService.createVenue({ ...newVenue, capacity: Number(newVenue.capacity) || undefined });
    setVenues(prev => [...prev, venue]);
    setNewVenue({ name: '', address: '', cityId: '', capacity: '' });
    toast.success('Площадка добавлена');
  };

  if (loading) return <LoadingState />;

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold mb-6">Справочники</h1>

      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Категории ({categories.length})</TabsTrigger>
          <TabsTrigger value="cities">Города ({cities.length})</TabsTrigger>
          <TabsTrigger value="venues">Площадки ({venues.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-4 space-y-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1"><Label>Название</Label><Input value={newCat.name} onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))} placeholder="Новая категория" /></div>
            <div className="w-40"><Label>Slug</Label><Input value={newCat.slug} onChange={e => setNewCat(p => ({ ...p, slug: e.target.value }))} placeholder="slug" /></div>
            <Button onClick={addCategory}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-2">
            {categories.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card text-sm">
                <span>{c.icon}</span><span className="font-medium">{c.name}</span><span className="text-muted-foreground">{c.slug}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="cities" className="mt-4 space-y-4">
          <div className="flex gap-3 items-end">
            <div className="flex-1"><Label>Название</Label><Input value={newCity.name} onChange={e => setNewCity(p => ({ ...p, name: e.target.value }))} placeholder="Город" /></div>
            <div className="w-48"><Label>Регион</Label><Input value={newCity.region} onChange={e => setNewCity(p => ({ ...p, region: e.target.value }))} placeholder="Область" /></div>
            <Button onClick={addCity}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-2">
            {cities.map(c => (
              <div key={c.id} className="p-3 rounded-lg border border-border bg-card text-sm">
                <span className="font-medium">{c.name}</span>{c.region && <span className="text-muted-foreground ml-2">{c.region}</span>}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="venues" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <div><Label>Название</Label><Input value={newVenue.name} onChange={e => setNewVenue(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Адрес</Label><Input value={newVenue.address} onChange={e => setNewVenue(p => ({ ...p, address: e.target.value }))} /></div>
            <div><Label>Город</Label>
              <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={newVenue.cityId} onChange={e => setNewVenue(p => ({ ...p, cityId: e.target.value }))}>
                <option value="">Выберите</option>
                {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Button onClick={addVenue}><Plus className="h-4 w-4" /></Button>
          </div>
          <div className="space-y-2">
            {venues.map(v => (
              <div key={v.id} className="p-3 rounded-lg border border-border bg-card text-sm">
                <span className="font-medium">{v.name}</span>
                <span className="text-muted-foreground ml-2">{v.address}</span>
                {v.city && <span className="text-muted-foreground ml-2">· {v.city.name}</span>}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

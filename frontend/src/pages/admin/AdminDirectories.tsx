import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { directoryService } from '@/services/directory-service';
import { yandexMapsService, type YandexAddressSuggestion } from '@/services/yandex-maps-service';
import { LoadingState } from '@/components/StateDisplays';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LocationPickerMap } from '@/components/LocationPickerMap';
import type { Category, City, Venue } from '@/types';

export default function AdminDirectories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCat, setNewCat] = useState({ name: '' });
  const [newCity, setNewCity] = useState({ name: '', region: '' });
  const [newVenue, setNewVenue] = useState({
    name: '',
    address: '',
    cityId: '',
    capacity: '',
    latitude: '',
    longitude: '',
  });
  const [venueAddressSuggestions, setVenueAddressSuggestions] = useState<YandexAddressSuggestion[]>([]);
  const [venueAddressLoading, setVenueAddressLoading] = useState(false);
  const [venueMapCenter, setVenueMapCenter] = useState<[number, number] | undefined>(undefined);

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
    });
    setCategories((prev) => [...prev, cat]);
    setNewCat({ name: '' });
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
    if (!newVenue.name || !newVenue.cityId || !newVenue.address.trim()) return;
    const venue = await directoryService.createVenue({
      ...newVenue,
      capacity: Number(newVenue.capacity) || undefined,
      latitude: newVenue.latitude ? Number(newVenue.latitude) : undefined,
      longitude: newVenue.longitude ? Number(newVenue.longitude) : undefined,
    });
    setVenues((prev) => [...prev, venue]);
    setNewVenue({ name: '', address: '', cityId: '', capacity: '', latitude: '', longitude: '' });
    setVenueAddressSuggestions([]);
    toast.success('Площадка добавлена');
  };

  const selectedVenueCity = cities.find((city) => String(city.id) === newVenue.cityId);

  const searchVenueAddress = async (query: string) => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery || !selectedVenueCity) {
      setVenueAddressSuggestions([]);
      return;
    }

    setVenueAddressLoading(true);
    try {
      const request = `${selectedVenueCity.name}, ${normalizedQuery}`;
      const suggestions = await yandexMapsService.searchAddressSuggestions(request, 6);
      setVenueAddressSuggestions(suggestions);
    } catch {
      setVenueAddressSuggestions([]);
    } finally {
      setVenueAddressLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedVenueCity) {
      setVenueMapCenter(undefined);
      return;
    }

    yandexMapsService.searchAddressSuggestions(selectedVenueCity.name, 1)
      .then((results) => {
        if (results.length > 0) {
          setVenueMapCenter([results[0].latitude, results[0].longitude]);
        }
      })
      .catch(() => {
        // ignore map center resolve errors
      });
  }, [selectedVenueCity?.id]);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <section>
        <h1 className="page-title">Справочники</h1>
        <p className="mt-1 text-muted-foreground">Категории, города и площадки для мероприятий</p>
      </section>

      <Tabs defaultValue="categories">
        <TabsList className="h-auto rounded-xl bg-muted/70 p-1">
          <TabsTrigger value="categories">Категории ({categories.length})</TabsTrigger>
          <TabsTrigger value="cities">Города ({cities.length})</TabsTrigger>
          <TabsTrigger value="venues">Площадки ({venues.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="mt-4 space-y-4">
          <div className="surface-soft grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <Label>Название</Label>
              <Input
                value={newCat.name}
                onChange={(event) => setNewCat((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Новая категория"
              />
            </div>
            <Button onClick={addCategory} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Добавить
            </Button>
          </div>

          <div className="space-y-2">
            {categories.map((category) => (
              <div key={category.id} className="surface-row flex items-center gap-3 py-3 text-sm">
                <span>{category.icon}</span>
                <span className="font-medium text-foreground">{category.name}</span>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="cities" className="mt-4 space-y-4">
          <div className="surface-soft grid gap-3 sm:grid-cols-[1fr_260px_auto] sm:items-end">
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
              <div key={city.id} className="surface-row py-3 text-sm">
                <span className="font-medium text-foreground">{city.name}</span>
                {city.region && <span className="ml-2 text-muted-foreground">{city.region}</span>}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="venues" className="mt-4 space-y-4">
          <div className="surface-soft grid grid-cols-1 items-end gap-3 sm:grid-cols-4">
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
                onChange={(event) => {
                  const value = event.target.value;
                  setNewVenue((prev) => ({ ...prev, address: value }));
                  void searchVenueAddress(value);
                }}
                placeholder="Начните вводить адрес или выберите точку на карте"
              />
              {venueAddressLoading && <p className="mt-1 text-xs text-muted-foreground">Поиск адреса...</p>}
              {venueAddressSuggestions.length > 0 && (
                <div className="mt-2 max-h-40 space-y-1 overflow-auto rounded-md border border-border bg-background p-1">
                  {venueAddressSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      className="w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                      onClick={() => {
                        setNewVenue((prev) => ({
                          ...prev,
                          address: suggestion.address,
                          latitude: String(suggestion.latitude),
                          longitude: String(suggestion.longitude),
                        }));
                        setVenueAddressSuggestions([]);
                      }}
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <Label>Город</Label>
              <Select
                value={newVenue.cityId}
                onValueChange={(value) => setNewVenue((prev) => ({ ...prev, cityId: value }))}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Выберите город" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((city) => (
                    <SelectItem key={city.id} value={String(city.id)}>
                      {city.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addVenue} className="gap-1.5">
              <Plus className="h-4 w-4" />
              Добавить
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-background p-3">
            <p className="mb-2 text-xs text-muted-foreground">
              Можно указать адрес вручную или кликнуть точку на карте.
            </p>
            <LocationPickerMap
              latitude={newVenue.latitude ? Number(newVenue.latitude) : undefined}
              longitude={newVenue.longitude ? Number(newVenue.longitude) : undefined}
              initialCenter={venueMapCenter}
              onPick={(latitude, longitude) => {
                setNewVenue((prev) => ({
                  ...prev,
                  latitude: String(latitude),
                  longitude: String(longitude),
                }));

                yandexMapsService.reverseGeocode(latitude, longitude)
                  .then((suggestion) => {
                    if (!suggestion) return;
                    setNewVenue((prev) => ({
                      ...prev,
                      address: suggestion.address || prev.address,
                    }));
                  })
                  .catch(() => {
                    // ignore reverse geocode errors
                  });
              }}
            />
          </div>

          <div className="space-y-2">
            {venues.map((venue) => (
              <div key={venue.id} className="surface-row py-3 text-sm">
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

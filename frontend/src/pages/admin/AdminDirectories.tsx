import { useEffect, useRef, useState } from 'react';
import { Ban, CheckCircle2, ChevronDown, MapPin, Pencil, Plus, Save, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { directoryService } from '@/services/directory-service';
import { yandexMapsService, type YandexAddressSuggestion } from '@/services/yandex-maps-service';
import { LoadingState } from '@/components/StateDisplays';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LocationPickerMap } from '@/components/LocationPickerMap';
import type { Category, City, Venue } from '@/types';

type VenueDraft = {
  name: string;
  address: string;
  cityId: string;
  capacity: string;
  latitude: string;
  longitude: string;
};

function emptyDraft(): VenueDraft {
  return { name: '', address: '', cityId: '', capacity: '', latitude: '', longitude: '' };
}

function venueToDraft(venue: Venue, cities: City[]): { draft: VenueDraft; city: City | null } {
  const cityId = venue.cityId ?? venue.city?.id;
  const city = cities.find((c) => String(c.id) === String(cityId)) ?? null;
  return {
    draft: {
      name: venue.name || '',
      address: venue.address || '',
      cityId: city ? String(city.id) : String(cityId ?? ''),
      capacity: venue.capacity != null ? String(venue.capacity) : '',
      latitude: venue.latitude != null ? String(venue.latitude) : '',
      longitude: venue.longitude != null ? String(venue.longitude) : '',
    },
    city,
  };
}

export default function AdminDirectories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Categories ---
  const [newCat, setNewCat] = useState({ name: '' });

  // --- Cities ---
  const [newCity, setNewCity] = useState({ name: '', region: '' });
  const [citySuggestions, setCitySuggestions] = useState<YandexAddressSuggestion[]>([]);
  const [citySuggestionsLoading, setCitySuggestionsLoading] = useState(false);
  const citySearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- New venue form ---
  const [newVenue, setNewVenue] = useState<VenueDraft>(emptyDraft());
  const [newDetectedCity, setNewDetectedCity] = useState<City | null>(null);
  const [newCityUnknown, setNewCityUnknown] = useState(false);
  const [newSuggestions, setNewSuggestions] = useState<YandexAddressSuggestion[]>([]);
  const [newSuggestionsLoading, setNewSuggestionsLoading] = useState(false);
  const newSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Edit venue form ---
  const [editingVenueId, setEditingVenueId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<VenueDraft>(emptyDraft());
  const [editDetectedCity, setEditDetectedCity] = useState<City | null>(null);
  const [editCityUnknown, setEditCityUnknown] = useState(false);
  const [editSuggestions, setEditSuggestions] = useState<YandexAddressSuggestion[]>([]);
  const [editSuggestionsLoading, setEditSuggestionsLoading] = useState(false);
  const editSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [savingVenue, setSavingVenue] = useState(false);

  useEffect(() => {
    Promise.all([directoryService.getCategories(), directoryService.getAdminCities(), directoryService.getVenues()])
      .then(([categoryResponse, cityResponse, venueResponse]) => {
        setCategories(categoryResponse);
        setCities(cityResponse);
        setVenues(venueResponse);
        setLoading(false);
      });
  }, []);

  // ─── Categories ─────────────────────────────────────────────────────────────

  const addCategory = async () => {
    if (!newCat.name) return;
    const cat = await directoryService.createCategory({ name: newCat.name });
    setCategories((prev) => [...prev, cat]);
    setNewCat({ name: '' });
    toast.success('Категория добавлена');
  };

  // ─── Cities ─────────────────────────────────────────────────────────────────

  const addCity = async () => {
    if (!newCity.name) return;
    const city = await directoryService.createCity(newCity);
    setCities((prev) => [...prev, city]);
    setNewCity({ name: '', region: '' });
    toast.success('Город добавлен');
  };

  const setCityActive = async (cityId: string | number, active: boolean) => {
    const updated = await directoryService.setCityActive(cityId, active);
    setCities((prev) => prev.map((c) => (String(c.id) === String(cityId) ? updated : c)));
    toast.success(active ? 'Город активирован' : 'Город деактивирован');
  };

  const removeCity = async (cityId: string | number) => {
    await directoryService.deleteCity(cityId);
    setCities((prev) => prev.filter((c) => String(c.id) !== String(cityId)));
    toast.success('Город удалён');
  };

  const onCityNameInput = (value: string) => {
    setNewCity((prev) => ({ ...prev, name: value, region: '' }));
    setCitySuggestions([]);
    if (!value.trim()) return;
    if (citySearchTimerRef.current) clearTimeout(citySearchTimerRef.current);
    citySearchTimerRef.current = setTimeout(async () => {
      setCitySuggestionsLoading(true);
      try {
        setCitySuggestions(await yandexMapsService.searchCitySuggestions(value.trim(), 6));
      } catch { setCitySuggestions([]); }
      finally { setCitySuggestionsLoading(false); }
    }, 350);
  };

  const applyCitySuggestion = (s: YandexAddressSuggestion) => {
    const name = s.cityName || s.label;
    const region = s.region && s.region !== name ? s.region : '';
    setNewCity({ name, region });
    setCitySuggestions([]);
  };

  // ─── Venue helpers ───────────────────────────────────────────────────────────

  function matchCityInSystem(cityName?: string): City | null {
    if (!cityName?.trim()) return null;
    const q = cityName.trim().toLowerCase();
    return cities.find((c) => c.name.toLowerCase() === q)
      || cities.find((c) => c.name.toLowerCase().includes(q) || q.includes(c.name.toLowerCase()))
      || null;
  }

  // ─── New venue ───────────────────────────────────────────────────────────────

  const applyNewSuggestion = (s: YandexAddressSuggestion) => {
    const city = matchCityInSystem(s.cityName);
    setNewVenue((prev) => ({ ...prev, address: s.address, latitude: String(s.latitude), longitude: String(s.longitude), cityId: city ? String(city.id) : '' }));
    setNewDetectedCity(city);
    setNewCityUnknown(!city);
    setNewSuggestions([]);
  };

  const onNewAddressInput = (value: string) => {
    setNewVenue((prev) => ({ ...prev, address: value }));
    if (!value.trim()) {
      setNewSuggestions([]);
      setNewVenue((prev) => ({ ...prev, latitude: '', longitude: '', cityId: '' }));
      setNewDetectedCity(null);
      setNewCityUnknown(false);
      return;
    }
    if (newSearchTimerRef.current) clearTimeout(newSearchTimerRef.current);
    newSearchTimerRef.current = setTimeout(async () => {
      setNewSuggestionsLoading(true);
      try {
        setNewSuggestions(await yandexMapsService.searchAddressSuggestions(value.trim(), 6));
      } catch { setNewSuggestions([]); }
      finally { setNewSuggestionsLoading(false); }
    }, 350);
  };

  const onNewMapPick = (lat: number, lng: number) => {
    setNewVenue((prev) => ({ ...prev, latitude: String(lat), longitude: String(lng) }));
    yandexMapsService.reverseGeocode(lat, lng).then((s) => {
      if (!s) return;
      const city = matchCityInSystem(s.cityName);
      setNewVenue((prev) => ({ ...prev, address: s.address || prev.address, cityId: city ? String(city.id) : prev.cityId }));
      setNewDetectedCity(city);
      setNewCityUnknown(!city);
    }).catch(() => {});
  };

  const addVenue = async () => {
    if (!newVenue.name.trim()) { toast.error('Укажите название площадки'); return; }
    if (!newVenue.address.trim()) { toast.error('Укажите адрес'); return; }
    if (!newVenue.cityId) { toast.error('Город не определён или не добавлен в систему. Выберите адрес из подсказок или кликните на карту.'); return; }
    const venue = await directoryService.createVenue({
      ...newVenue,
      capacity: Number(newVenue.capacity) || undefined,
      latitude: newVenue.latitude ? Number(newVenue.latitude) : undefined,
      longitude: newVenue.longitude ? Number(newVenue.longitude) : undefined,
    });
    setVenues((prev) => [...prev, venue]);
    setNewVenue(emptyDraft());
    setNewDetectedCity(null);
    setNewCityUnknown(false);
    setNewSuggestions([]);
    toast.success('Площадка добавлена');
  };

  // ─── Edit venue ──────────────────────────────────────────────────────────────

  const startEditVenue = (venue: Venue) => {
    const key = String(venue.id);
    if (editingVenueId === key) {
      setEditingVenueId(null);
      return;
    }
    const { draft, city } = venueToDraft(venue, cities);
    setEditingVenueId(key);
    setEditDraft(draft);
    setEditDetectedCity(city);
    setEditCityUnknown(false);
    setEditSuggestions([]);
  };

  const applyEditSuggestion = (s: YandexAddressSuggestion) => {
    const city = matchCityInSystem(s.cityName);
    setEditDraft((prev) => ({ ...prev, address: s.address, latitude: String(s.latitude), longitude: String(s.longitude), cityId: city ? String(city.id) : '' }));
    setEditDetectedCity(city);
    setEditCityUnknown(!city);
    setEditSuggestions([]);
  };

  const onEditAddressInput = (value: string) => {
    setEditDraft((prev) => ({ ...prev, address: value }));
    if (!value.trim()) {
      setEditSuggestions([]);
      setEditDraft((prev) => ({ ...prev, latitude: '', longitude: '', cityId: '' }));
      setEditDetectedCity(null);
      setEditCityUnknown(false);
      return;
    }
    if (editSearchTimerRef.current) clearTimeout(editSearchTimerRef.current);
    editSearchTimerRef.current = setTimeout(async () => {
      setEditSuggestionsLoading(true);
      try {
        setEditSuggestions(await yandexMapsService.searchAddressSuggestions(value.trim(), 6));
      } catch { setEditSuggestions([]); }
      finally { setEditSuggestionsLoading(false); }
    }, 350);
  };

  const onEditMapPick = (lat: number, lng: number) => {
    setEditDraft((prev) => ({ ...prev, latitude: String(lat), longitude: String(lng) }));
    yandexMapsService.reverseGeocode(lat, lng).then((s) => {
      if (!s) return;
      const city = matchCityInSystem(s.cityName);
      setEditDraft((prev) => ({ ...prev, address: s.address || prev.address, cityId: city ? String(city.id) : prev.cityId }));
      setEditDetectedCity(city);
      setEditCityUnknown(!city);
    }).catch(() => {});
  };

  const saveVenue = async (venueId: string | number) => {
    if (!editDraft.name.trim()) { toast.error('Укажите название площадки'); return; }
    if (!editDraft.address.trim()) { toast.error('Укажите адрес'); return; }
    if (!editDraft.cityId) { toast.error('Город не определён или не добавлен в систему.'); return; }
    setSavingVenue(true);
    try {
      const updated = await directoryService.updateVenue(venueId, {
        ...editDraft,
        capacity: Number(editDraft.capacity) || undefined,
        latitude: editDraft.latitude ? Number(editDraft.latitude) : undefined,
        longitude: editDraft.longitude ? Number(editDraft.longitude) : undefined,
      });
      setVenues((prev) => prev.map((v) => String(v.id) === String(venueId) ? updated : v));
      setEditingVenueId(null);
      toast.success('Площадка обновлена');
    } catch {
      toast.error('Не удалось сохранить изменения');
    } finally {
      setSavingVenue(false);
    }
  };

  const removeVenue = async (venueId: string | number) => {
    await directoryService.deleteVenue(venueId);
    setVenues((prev) => prev.filter((v) => String(v.id) !== String(venueId)));
    if (editingVenueId === String(venueId)) setEditingVenueId(null);
    toast.success('Площадка удалена');
  };

  // ─── Address input block (reusable UI fragment) ───────────────────────────────

  function AddressField({
    value, onChange, onClear, suggestions, suggestionsLoading, onPickSuggestion,
    detectedCity, cityUnknown,
  }: {
    value: string;
    onChange: (v: string) => void;
    onClear: () => void;
    suggestions: YandexAddressSuggestion[];
    suggestionsLoading: boolean;
    onPickSuggestion: (s: YandexAddressSuggestion) => void;
    detectedCity: City | null;
    cityUnknown: boolean;
  }) {
    return (
      <div>
        <Label>Адрес *</Label>
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Начните вводить — например, «Коломна, ул. Октябрьской революции»"
            className="pl-9 pr-8"
            autoComplete="off"
          />
          {value && (
            <button type="button" className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded text-muted-foreground hover:text-foreground" onClick={onClear}>
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {suggestionsLoading && <p className="mt-1 text-xs text-muted-foreground">Поиск адреса...</p>}

        {suggestions.length > 0 && (
          <ul className="mt-1.5 overflow-hidden rounded-xl border border-border bg-card shadow-card">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onPickSuggestion(s)}
                >
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/50" />
                  <span className="min-w-0">
                    <span className="block truncate text-foreground">{s.label}</span>
                    {s.cityName && <span className="text-xs text-muted-foreground">{s.cityName}{s.region ? `, ${s.region}` : ''}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {detectedCity && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--success)/0.1)] px-2.5 py-1 text-xs font-medium text-[hsl(var(--success))]">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Город определён: {detectedCity.name}
          </div>
        )}
        {cityUnknown && !detectedCity && value && (
          <p className="mt-1.5 text-xs text-destructive">
            Город не найден в системе. Добавьте его во вкладке «Города».
          </p>
        )}
      </div>
    );
  }

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

        {/* ── CATEGORIES ── */}
        <TabsContent value="categories" className="mt-4 space-y-4">
          <div className="surface-soft grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <div>
              <Label>Название</Label>
              <Input value={newCat.name} onChange={(e) => setNewCat((prev) => ({ ...prev, name: e.target.value }))} placeholder="Новая категория" />
            </div>
            <Button onClick={addCategory} className="gap-1.5"><Plus className="h-4 w-4" />Добавить</Button>
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

        {/* ── CITIES ── */}
        <TabsContent value="cities" className="mt-4 space-y-4">
          <div className="surface-soft space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="relative flex-1">
                <Label>Название</Label>
                <div className="relative">
                  <Input
                    value={newCity.name}
                    onChange={(e) => onCityNameInput(e.target.value)}
                    placeholder="Начните вводить название города..."
                    autoComplete="off"
                  />
                  {newCity.name && (
                    <button
                      type="button"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded text-muted-foreground hover:text-foreground"
                      onClick={() => { setNewCity({ name: '', region: '' }); setCitySuggestions([]); }}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
                {citySuggestionsLoading && <p className="mt-1 text-xs text-muted-foreground">Поиск...</p>}
                {citySuggestions.length > 0 && (
                  <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-border bg-card shadow-card">
                    {citySuggestions.map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => applyCitySuggestion(s)}
                        >
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/50" />
                          <span>
                            <span className="block font-medium text-foreground">{s.cityName || s.label}</span>
                            {s.region && <span className="text-xs text-muted-foreground">{s.region}</span>}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Button onClick={addCity} className="gap-1.5 shrink-0"><Plus className="h-4 w-4" />Добавить</Button>
            </div>
          </div>
          <div className="space-y-2">
            {cities.map((city) => (
              <div key={city.id} className="surface-row flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <span className="font-medium text-foreground">{city.name}</span>
                  {city.region && <span className="ml-2 text-muted-foreground">{city.region}</span>}
                  <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${city.active === false ? 'bg-destructive/10 text-destructive' : 'bg-success/10 text-success'}`}>
                    {city.active === false ? 'Неактивен' : 'Активен'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {city.active === false ? (
                    <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setCityActive(city.id, true)}>
                      <CheckCircle2 className="h-4 w-4" />Активировать
                    </Button>
                  ) : (
                    <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setCityActive(city.id, false)}>
                      <Ban className="h-4 w-4" />Деактивировать
                    </Button>
                  )}
                  <Button type="button" variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={() => removeCity(city.id)}>
                    <Trash2 className="h-4 w-4" />Удалить
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ── VENUES ── */}
        <TabsContent value="venues" className="mt-4 space-y-4">

          {/* New venue form */}
          <div className="surface-soft space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Новая площадка</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>Название *</Label>
                <Input value={newVenue.name} onChange={(e) => setNewVenue((prev) => ({ ...prev, name: e.target.value }))} placeholder="Театр, зал..." />
              </div>
              <div>
                <Label>Вместимость</Label>
                <Input type="number" min={1} value={newVenue.capacity} onChange={(e) => setNewVenue((prev) => ({ ...prev, capacity: e.target.value }))} placeholder="500" />
              </div>
            </div>

            <AddressField
              value={newVenue.address}
              onChange={onNewAddressInput}
              onClear={() => { setNewVenue((prev) => ({ ...prev, address: '', latitude: '', longitude: '', cityId: '' })); setNewDetectedCity(null); setNewCityUnknown(false); setNewSuggestions([]); }}
              suggestions={newSuggestions}
              suggestionsLoading={newSuggestionsLoading}
              onPickSuggestion={applyNewSuggestion}
              detectedCity={newDetectedCity}
              cityUnknown={newCityUnknown}
            />

            <div className="rounded-xl border border-border bg-background p-3">
              <p className="mb-2 text-xs text-muted-foreground">Выберите точку на карте — адрес и город подтянутся автоматически.</p>
              <LocationPickerMap
                latitude={newVenue.latitude ? Number(newVenue.latitude) : undefined}
                longitude={newVenue.longitude ? Number(newVenue.longitude) : undefined}
                onPick={onNewMapPick}
              />
            </div>

            <Button onClick={addVenue} className="gap-1.5"><Plus className="h-4 w-4" />Добавить площадку</Button>
          </div>

          {/* Venue list */}
          <div className="space-y-2">
            {venues.map((venue) => {
              const key = String(venue.id);
              const isExpanded = editingVenueId === key;
              const cityLabel = venue.city?.name ?? cities.find((c) => String(c.id) === String(venue.cityId))?.name;

              return (
                <div key={venue.id} className="rounded-2xl border border-border bg-card shadow-soft transition-colors hover:border-primary/15">
                  {/* Row header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{venue.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {[venue.address, cityLabel].filter(Boolean).join(' · ')}
                        {venue.capacity ? ` · ${venue.capacity} мест` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => startEditVenue(venue)}
                      >
                        {isExpanded ? <ChevronDown className="h-4 w-4 rotate-180 transition-transform" /> : <Pencil className="h-4 w-4" />}
                        {isExpanded ? 'Свернуть' : 'Редактировать'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeVenue(venue.id)}
                        title="Удалить площадку"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Edit form */}
                  {isExpanded && (
                    <div className="space-y-4 border-t border-border px-4 py-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <Label>Название *</Label>
                          <Input value={editDraft.name} onChange={(e) => setEditDraft((prev) => ({ ...prev, name: e.target.value }))} />
                        </div>
                        <div>
                          <Label>Вместимость</Label>
                          <Input type="number" min={1} value={editDraft.capacity} onChange={(e) => setEditDraft((prev) => ({ ...prev, capacity: e.target.value }))} placeholder="500" />
                        </div>
                      </div>

                      <AddressField
                        value={editDraft.address}
                        onChange={onEditAddressInput}
                        onClear={() => { setEditDraft((prev) => ({ ...prev, address: '', latitude: '', longitude: '', cityId: '' })); setEditDetectedCity(null); setEditCityUnknown(false); setEditSuggestions([]); }}
                        suggestions={editSuggestions}
                        suggestionsLoading={editSuggestionsLoading}
                        onPickSuggestion={applyEditSuggestion}
                        detectedCity={editDetectedCity}
                        cityUnknown={editCityUnknown}
                      />

                      <div className="rounded-xl border border-border bg-background p-3">
                        <p className="mb-2 text-xs text-muted-foreground">Кликните на карту, чтобы уточнить координаты.</p>
                        <LocationPickerMap
                          latitude={editDraft.latitude ? Number(editDraft.latitude) : undefined}
                          longitude={editDraft.longitude ? Number(editDraft.longitude) : undefined}
                          onPick={onEditMapPick}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" className="gap-1.5" onClick={() => saveVenue(venue.id)} disabled={savingVenue}>
                          <Save className="h-4 w-4" />
                          {savingVenue ? 'Сохранение...' : 'Сохранить'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingVenueId(null)}>Отмена</Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

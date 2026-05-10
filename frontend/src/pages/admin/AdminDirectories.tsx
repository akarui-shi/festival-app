import { useEffect, useMemo, useRef, useState } from 'react';
import { Ban, CheckCircle2, ChevronDown, MapPin, Pencil, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useCity } from '@/contexts/CityContext';
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

const POPULAR_CITY_NAMES = new Set([
  'Москва', 'Санкт-Петербург', 'Новосибирск', 'Екатеринбург', 'Казань',
  'Нижний Новгород', 'Челябинск', 'Самара', 'Уфа', 'Ростов-на-Дону',
  'Краснодар', 'Омск', 'Воронеж', 'Пермь', 'Волгоград',
  'Коломна', 'Рязань',
]);

function getCityRegionLabel(city: Pick<City, 'id' | 'region' | 'country'>): string {
  return city.region || city.country || 'Регион не указан';
}

function getCityLabel(city: Pick<City, 'id' | 'name' | 'region' | 'country'>): string {
  return `${city.name}, ${getCityRegionLabel(city)}`;
}

function sortCitiesBySearch(cities: City[], query: string, popularFirstWhenEmpty = false): City[] {
  const normalizedQuery = query.trim().toLowerCase().replace(/[,.]+/g, ' ').replace(/\s+/g, ' ').trim();
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);

  if (!normalizedQuery) {
    const result = [...cities];
    result.sort((left, right) => {
      if (popularFirstWhenEmpty) {
        const leftPopular = POPULAR_CITY_NAMES.has(left.name) ? 0 : 1;
        const rightPopular = POPULAR_CITY_NAMES.has(right.name) ? 0 : 1;
        if (leftPopular !== rightPopular) return leftPopular - rightPopular;
      }
      const nameCompare = left.name.localeCompare(right.name, 'ru');
      if (nameCompare !== 0) return nameCompare;
      return getCityRegionLabel(left).localeCompare(getCityRegionLabel(right), 'ru');
    });
    return result;
  }

  return cities
    .map((city) => {
      const name = city.name.toLowerCase();
      const region = `${city.region || ''} ${city.country || ''}`.trim().toLowerCase();
      const full = `${name} ${region}`.trim();
      const matchesByName = terms.every((term) => name.includes(term));
      const matchesByRegion = terms.every((term) => region.includes(term));
      const matchesByFull = terms.every((term) => full.includes(term));

      if (!matchesByName && !matchesByRegion && !matchesByFull) return null;

      let score = 9;
      if (name === normalizedQuery) score = 0;
      else if (name.startsWith(normalizedQuery)) score = 1;
      else if (matchesByName) score = 2;
      else if (full.startsWith(normalizedQuery)) score = 3;
      else if (full.includes(normalizedQuery) && name.includes(normalizedQuery)) score = 4;
      else if (region.startsWith(normalizedQuery)) score = 6;
      else if (matchesByRegion) score = 7;
      else if (matchesByFull) score = 8;

      return { city, score };
    })
    .filter((item): item is { city: City; score: number } => item !== null)
    .sort((left, right) => {
      if (left.score !== right.score) return left.score - right.score;
      const nameCompare = left.city.name.localeCompare(right.city.name, 'ru');
      if (nameCompare !== 0) return nameCompare;
      return getCityRegionLabel(left.city).localeCompare(getCityRegionLabel(right.city), 'ru');
    })
    .map((item) => item.city);
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
  const { selectedCity } = useCity();
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Categories ---
  const [categoryQuery, setCategoryQuery] = useState('');
  const [newCat, setNewCat] = useState({ name: '', description: '' });
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editCat, setEditCat] = useState({ name: '', description: '' });

  // --- Cities ---
  const [newCity, setNewCity] = useState({ name: '', region: '' });
  const [cityQuery, setCityQuery] = useState('');

  // --- New venue form ---
  const [newVenue, setNewVenue] = useState<VenueDraft>(emptyDraft());
  const [newDetectedCity, setNewDetectedCity] = useState<City | null>(null);
  const [newCityUnknown, setNewCityUnknown] = useState(false);
  const [newSuggestions, setNewSuggestions] = useState<YandexAddressSuggestion[]>([]);
  const [newSuggestionsLoading, setNewSuggestionsLoading] = useState(false);
  const newSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [venueQuery, setVenueQuery] = useState('');
  const [venueCityFilter, setVenueCityFilter] = useState('all');
  const [venueCityFilterSearch, setVenueCityFilterSearch] = useState('Все города');
  const [venueCityFilterOpen, setVenueCityFilterOpen] = useState(false);
  const [mapInitialCenter, setMapInitialCenter] = useState<[number, number] | undefined>();
  const [newVenueCitySearch, setNewVenueCitySearch] = useState('');
  const [newVenueCityOpen, setNewVenueCityOpen] = useState(false);

  // --- Edit venue form ---
  const [editingVenueId, setEditingVenueId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<VenueDraft>(emptyDraft());
  const [editDetectedCity, setEditDetectedCity] = useState<City | null>(null);
  const [editCityUnknown, setEditCityUnknown] = useState(false);
  const [editSuggestions, setEditSuggestions] = useState<YandexAddressSuggestion[]>([]);
  const [editSuggestionsLoading, setEditSuggestionsLoading] = useState(false);
  const editSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editVenueCitySearch, setEditVenueCitySearch] = useState('');
  const [editVenueCityOpen, setEditVenueCityOpen] = useState(false);
  const [savingVenue, setSavingVenue] = useState(false);

  useEffect(() => {
    Promise.all([directoryService.getCategories(), directoryService.getAdminCities(), directoryService.getVenues()])
      .then(([categoryResponse, cityResponse, venueResponse]) => {
        setCategories(categoryResponse);
        setCities(cityResponse);
        setVenues(venueResponse);
      })
      .catch(() => toast.error('Не удалось загрузить справочники'))
      .finally(() => setLoading(false));
  }, []);

  const normalizeText = (value?: string | null) => (value || '').trim().toLowerCase();

  const selectedAdminCity = useMemo(() => {
    const selectedId = selectedCity?.id == null ? null : String(selectedCity.id);
    if (selectedId) {
      const match = cities.find((city) => String(city.id) === selectedId);
      if (match) return match;
    }
    return cities.find((city) => city.active !== false) ?? cities[0] ?? null;
  }, [cities, selectedCity?.id]);

  useEffect(() => {
    if (!selectedAdminCity) return;
    setNewVenue((prev) => (prev.cityId ? prev : { ...prev, cityId: String(selectedAdminCity.id) }));
    setNewVenueCitySearch((prev) => prev || getCityLabel(selectedAdminCity));
  }, [selectedAdminCity]);

  useEffect(() => {
    if (!selectedAdminCity) {
      setMapInitialCenter(undefined);
      return;
    }

    let cancelled = false;
    const query = [selectedAdminCity.name, selectedAdminCity.region, 'Россия'].filter(Boolean).join(', ');
    yandexMapsService.searchCitySuggestions(query, 1)
      .then((suggestions) => {
        const first = suggestions[0];
        if (!cancelled && first) {
          setMapInitialCenter([first.latitude, first.longitude]);
        }
      })
      .catch(() => {
        if (!cancelled) setMapInitialCenter(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedAdminCity]);

  const filteredCategories = useMemo(() => {
    const query = normalizeText(categoryQuery);
    if (!query) return categories;
    return categories.filter((category) =>
      normalizeText(category.name).includes(query) || normalizeText(category.description).includes(query),
    );
  }, [categories, categoryQuery]);

  const filteredCities = useMemo(() => {
    return sortCitiesBySearch(cities, cityQuery);
  }, [cities, cityQuery]);

  const getCityById = (cityId?: string | number | null): City | null =>
    cities.find((city) => String(city.id) === String(cityId)) ?? null;

  const getVenueCity = (venue: Venue): City | null =>
    getCityById(venue.cityId ?? venue.city?.id) ?? venue.city ?? null;

  const filteredVenues = useMemo(() => {
    const query = normalizeText(venueQuery);
    return venues.filter((venue) => {
      const city = getVenueCity(venue);
      const matchesCity = venueCityFilter === 'all' || String(city?.id ?? venue.cityId ?? '') === venueCityFilter;
      const matchesQuery = !query
        || normalizeText(venue.name).includes(query)
        || normalizeText(venue.address).includes(query)
        || normalizeText(city?.name ?? venue.cityName).includes(query)
        || normalizeText(city?.region).includes(query);
      return matchesCity && matchesQuery;
    });
  }, [cities, venueCityFilter, venueQuery, venues]);

  const citySuggestionsForNewVenue = useMemo(
    () => sortCitiesBySearch(cities, newVenueCitySearch, true).slice(0, 12),
    [cities, newVenueCitySearch],
  );

  const citySuggestionsForEditVenue = useMemo(
    () => sortCitiesBySearch(cities, editVenueCitySearch, true).slice(0, 12),
    [cities, editVenueCitySearch],
  );

  const citySuggestionsForVenueFilter = useMemo(
    () => sortCitiesBySearch(cities, venueCityFilterSearch === 'Все города' ? '' : venueCityFilterSearch, true).slice(0, 12),
    [cities, venueCityFilterSearch],
  );

  // ─── Categories ─────────────────────────────────────────────────────────────

  const addCategory = async () => {
    if (!newCat.name.trim()) {
      toast.error('Укажите название категории');
      return;
    }
    try {
      const cat = await directoryService.createCategory({
        name: newCat.name.trim(),
        description: newCat.description.trim() || undefined,
      });
      setCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name, 'ru')));
      setNewCat({ name: '', description: '' });
      toast.success('Категория добавлена');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось добавить категорию');
    }
  };

  const startEditCategory = (category: Category) => {
    const key = String(category.id);
    if (editingCategoryId === key) {
      setEditingCategoryId(null);
      return;
    }
    setEditingCategoryId(key);
    setEditCat({ name: category.name || '', description: category.description || '' });
  };

  const saveCategory = async (categoryId: string | number) => {
    if (!editCat.name.trim()) {
      toast.error('Укажите название категории');
      return;
    }
    try {
      const updated = await directoryService.updateCategory(categoryId, {
        name: editCat.name.trim(),
        description: editCat.description.trim() || undefined,
      });
      setCategories((prev) => prev.map((category) => String(category.id) === String(categoryId) ? updated : category)
        .sort((a, b) => a.name.localeCompare(b.name, 'ru')));
      setEditingCategoryId(null);
      toast.success('Категория обновлена');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось сохранить категорию');
    }
  };

  const removeCategory = async (categoryId: string | number) => {
    try {
      await directoryService.deleteCategory(categoryId);
      setCategories((prev) => prev.filter((category) => String(category.id) !== String(categoryId)));
      if (editingCategoryId === String(categoryId)) setEditingCategoryId(null);
      toast.success('Категория удалена');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить категорию');
    }
  };

  // ─── Cities ─────────────────────────────────────────────────────────────────

  const addCity = async () => {
    if (!newCity.name.trim()) {
      toast.error('Укажите название города');
      return;
    }
    try {
      const city = await directoryService.createCity({
        name: newCity.name.trim(),
        region: newCity.region.trim() || undefined,
      });
      setCities((prev) => [...prev, city].sort((a, b) => a.name.localeCompare(b.name, 'ru')));
      setNewCity({ name: '', region: '' });
      toast.success('Город добавлен');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось добавить город');
    }
  };

  const setCityActive = async (cityId: string | number, active: boolean) => {
    try {
      const updated = await directoryService.setCityActive(cityId, active);
      setCities((prev) => prev.map((c) => (String(c.id) === String(cityId) ? updated : c)));
      toast.success(active ? 'Город активирован' : 'Город деактивирован');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось изменить город');
    }
  };

  const removeCity = async (cityId: string | number) => {
    try {
      await directoryService.deleteCity(cityId);
      setCities((prev) => prev.filter((c) => String(c.id) !== String(cityId)));
      toast.success('Город удалён');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить город');
    }
  };

  // ─── Venue helpers ───────────────────────────────────────────────────────────

  function matchCityInSystem(cityName?: string): City | null {
    if (!cityName?.trim()) return null;
    const q = normalizeText(cityName);
    return cities.find((c) => normalizeText(c.name) === q)
      || cities.find((c) => normalizeText(c.name).includes(q) || q.includes(normalizeText(c.name)))
      || null;
  }

  function getDraftCity(draft: VenueDraft): City | null {
    return getCityById(draft.cityId) ?? selectedAdminCity;
  }

  function buildAddressSearchQuery(value: string, draft: VenueDraft): string {
    const city = getDraftCity(draft);
    if (!city) return value.trim();
    const query = value.trim();
    const lowerQuery = normalizeText(query);
    const lowerCity = normalizeText(city.name);
    if (lowerQuery.includes(lowerCity)) return query;
    return [city.name, city.region, query].filter(Boolean).join(', ');
  }

  // ─── New venue ───────────────────────────────────────────────────────────────

  const applyNewSuggestion = (s: YandexAddressSuggestion) => {
    const city = matchCityInSystem(s.cityName) ?? getDraftCity(newVenue);
    setNewVenue((prev) => ({ ...prev, address: s.address, latitude: String(s.latitude), longitude: String(s.longitude), cityId: city ? String(city.id) : prev.cityId }));
    if (city) setNewVenueCitySearch(getCityLabel(city));
    setNewDetectedCity(city);
    setNewCityUnknown(!city);
    setNewSuggestions([]);
  };

  const onNewAddressInput = (value: string) => {
    const draftForSearch = { ...newVenue, address: value };
    setNewVenue((prev) => ({ ...prev, address: value }));
    if (!value.trim()) {
      setNewSuggestions([]);
      setNewVenue((prev) => ({ ...prev, latitude: '', longitude: '', cityId: selectedAdminCity ? String(selectedAdminCity.id) : prev.cityId }));
      setNewDetectedCity(null);
      setNewCityUnknown(false);
      return;
    }
    if (newSearchTimerRef.current) clearTimeout(newSearchTimerRef.current);
    newSearchTimerRef.current = setTimeout(async () => {
      setNewSuggestionsLoading(true);
      try {
        setNewSuggestions(await yandexMapsService.searchAddressSuggestions(buildAddressSearchQuery(value, draftForSearch), 6));
      } catch { setNewSuggestions([]); }
      finally { setNewSuggestionsLoading(false); }
    }, 350);
  };

  const onNewMapPick = (lat: number, lng: number) => {
    setNewVenue((prev) => ({ ...prev, latitude: String(lat), longitude: String(lng) }));
    yandexMapsService.reverseGeocode(lat, lng).then((s) => {
      if (!s) return;
      const city = matchCityInSystem(s.cityName) ?? getDraftCity(newVenue);
      setNewVenue((prev) => ({ ...prev, address: s.address || prev.address, cityId: city ? String(city.id) : prev.cityId }));
      if (city) setNewVenueCitySearch(getCityLabel(city));
      setNewDetectedCity(city);
      setNewCityUnknown(!city);
    }).catch(() => {});
  };

  const addVenue = async () => {
    if (!newVenue.name.trim()) { toast.error('Укажите название площадки'); return; }
    if (!newVenue.address.trim()) { toast.error('Укажите адрес'); return; }
    if (!newVenue.cityId) { toast.error('Город не определён или не добавлен в систему. Выберите адрес из подсказок или кликните на карту.'); return; }
    try {
      const venue = await directoryService.createVenue({
        ...newVenue,
        name: newVenue.name.trim(),
        address: newVenue.address.trim(),
        capacity: Number(newVenue.capacity) || undefined,
        latitude: newVenue.latitude ? Number(newVenue.latitude) : undefined,
        longitude: newVenue.longitude ? Number(newVenue.longitude) : undefined,
      });
      setVenues((prev) => [...prev, venue].sort((a, b) => a.name.localeCompare(b.name, 'ru')));
      setNewVenue({ ...emptyDraft(), cityId: selectedAdminCity ? String(selectedAdminCity.id) : '' });
      setNewVenueCitySearch(selectedAdminCity ? getCityLabel(selectedAdminCity) : '');
      setNewDetectedCity(null);
      setNewCityUnknown(false);
      setNewSuggestions([]);
      toast.success('Площадка добавлена');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось добавить площадку');
    }
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
    setEditVenueCitySearch(city ? getCityLabel(city) : '');
    setEditVenueCityOpen(false);
  };

  const applyEditSuggestion = (s: YandexAddressSuggestion) => {
    const city = matchCityInSystem(s.cityName) ?? getDraftCity(editDraft);
    setEditDraft((prev) => ({ ...prev, address: s.address, latitude: String(s.latitude), longitude: String(s.longitude), cityId: city ? String(city.id) : prev.cityId }));
    if (city) setEditVenueCitySearch(getCityLabel(city));
    setEditDetectedCity(city);
    setEditCityUnknown(!city);
    setEditSuggestions([]);
  };

  const onEditAddressInput = (value: string) => {
    const draftForSearch = { ...editDraft, address: value };
    setEditDraft((prev) => ({ ...prev, address: value }));
    if (!value.trim()) {
      setEditSuggestions([]);
      setEditDraft((prev) => ({ ...prev, latitude: '', longitude: '' }));
      setEditDetectedCity(null);
      setEditCityUnknown(false);
      return;
    }
    if (editSearchTimerRef.current) clearTimeout(editSearchTimerRef.current);
    editSearchTimerRef.current = setTimeout(async () => {
      setEditSuggestionsLoading(true);
      try {
        setEditSuggestions(await yandexMapsService.searchAddressSuggestions(buildAddressSearchQuery(value, draftForSearch), 6));
      } catch { setEditSuggestions([]); }
      finally { setEditSuggestionsLoading(false); }
    }, 350);
  };

  const onEditMapPick = (lat: number, lng: number) => {
    setEditDraft((prev) => ({ ...prev, latitude: String(lat), longitude: String(lng) }));
    yandexMapsService.reverseGeocode(lat, lng).then((s) => {
      if (!s) return;
      const city = matchCityInSystem(s.cityName) ?? getDraftCity(editDraft);
      setEditDraft((prev) => ({ ...prev, address: s.address || prev.address, cityId: city ? String(city.id) : prev.cityId }));
      if (city) setEditVenueCitySearch(getCityLabel(city));
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
        name: editDraft.name.trim(),
        address: editDraft.address.trim(),
        capacity: Number(editDraft.capacity) || undefined,
        latitude: editDraft.latitude ? Number(editDraft.latitude) : undefined,
        longitude: editDraft.longitude ? Number(editDraft.longitude) : undefined,
      });
      setVenues((prev) => prev.map((v) => String(v.id) === String(venueId) ? updated : v)
        .sort((a, b) => a.name.localeCompare(b.name, 'ru')));
      setEditingVenueId(null);
      toast.success('Площадка обновлена');
    } catch {
      toast.error('Не удалось сохранить изменения');
    } finally {
      setSavingVenue(false);
    }
  };

  const removeVenue = async (venueId: string | number) => {
    try {
      await directoryService.deleteVenue(venueId);
      setVenues((prev) => prev.filter((v) => String(v.id) !== String(venueId)));
      if (editingVenueId === String(venueId)) setEditingVenueId(null);
      toast.success('Площадка удалена');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Не удалось удалить площадку');
    }
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
            onKeyDown={(e) => {
              if (e.key === 'Enter' && suggestions[0]) {
                e.preventDefault();
                onPickSuggestion(suggestions[0]);
              }
            }}
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
          <ul className="mt-1.5 max-h-64 overflow-auto rounded-xl border border-border bg-card shadow-card">
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

  function CityAutocompleteField({
    label,
    value,
    onChange,
    open,
    onOpenChange,
    suggestions,
    onPick,
    onClear,
    placeholder = 'Начните вводить город...',
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    suggestions: City[];
    onPick: (city: City) => void;
    onClear?: () => void;
    placeholder?: string;
  }) {
    return (
      <div>
        <Label>{label}</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={value}
            onFocus={() => onOpenChange(true)}
            onChange={(event) => {
              onChange(event.target.value);
              onOpenChange(true);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && suggestions[0]) {
                event.preventDefault();
                onPick(suggestions[0]);
                onOpenChange(false);
              }
              if (event.key === 'Escape') {
                onOpenChange(false);
              }
            }}
            placeholder={placeholder}
            className="pl-9 pr-8"
            autoComplete="off"
          />
          {value && (
            <button
              type="button"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded text-muted-foreground hover:text-foreground"
              onClick={() => {
                onChange('');
                onClear?.();
                onOpenChange(true);
              }}
              aria-label="Очистить город"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {open && (
            <>
              <button
                type="button"
                aria-label="Закрыть список городов"
                className="fixed inset-0 z-20 cursor-default"
                onClick={() => onOpenChange(false)}
              />
              <div className="absolute left-0 right-0 top-full z-30 mt-1.5 max-h-64 overflow-auto rounded-xl border border-border bg-card p-1.5 shadow-card">
                {suggestions.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">Город не найден</p>
                ) : (
                  suggestions.map((city) => (
                    <button
                      key={city.id}
                      type="button"
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        onPick(city);
                        onOpenChange(false);
                      }}
                    >
                      {getCityLabel(city)}
                    </button>
                  ))
                )}
              </div>
            </>
          )}
        </div>
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
          <div className="surface-soft grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
            <div>
              <Label>Новая категория</Label>
              <Input value={newCat.name} onChange={(e) => setNewCat((prev) => ({ ...prev, name: e.target.value }))} placeholder="Новая категория" />
            </div>
            <div>
              <Label>Описание</Label>
              <Input value={newCat.description} onChange={(e) => setNewCat((prev) => ({ ...prev, description: e.target.value }))} placeholder="Короткое пояснение" />
            </div>
            <Button onClick={addCategory} className="gap-1.5"><Plus className="h-4 w-4" />Добавить</Button>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={categoryQuery}
              onChange={(e) => setCategoryQuery(e.target.value)}
              placeholder="Поиск по категориям..."
              className="pl-9"
            />
          </div>

          <div className="space-y-2">
            {filteredCategories.map((category) => {
              const isExpanded = editingCategoryId === String(category.id);
              return (
                <div key={category.id} className="rounded-2xl border border-border bg-card shadow-soft">
                  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">{category.name}</p>
                      {category.description && <p className="mt-0.5 text-xs text-muted-foreground">{category.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => startEditCategory(category)}>
                        {isExpanded ? <ChevronDown className="h-4 w-4 rotate-180 transition-transform" /> : <Pencil className="h-4 w-4" />}
                        {isExpanded ? 'Свернуть' : 'Редактировать'}
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => removeCategory(category.id)} title="Удалить категорию">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="grid gap-3 border-t border-border px-4 py-4 lg:grid-cols-[1fr_1fr_auto_auto] lg:items-end">
                      <div>
                        <Label>Название *</Label>
                        <Input value={editCat.name} onChange={(e) => setEditCat((prev) => ({ ...prev, name: e.target.value }))} />
                      </div>
                      <div>
                        <Label>Описание</Label>
                        <Input value={editCat.description} onChange={(e) => setEditCat((prev) => ({ ...prev, description: e.target.value }))} />
                      </div>
                      <Button size="sm" className="gap-1.5" onClick={() => saveCategory(category.id)}>
                        <Save className="h-4 w-4" />Сохранить
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingCategoryId(null)}>Отмена</Button>
                    </div>
                  )}
                </div>
              );
            })}
            {filteredCategories.length === 0 && (
              <div className="surface-soft py-8 text-center text-sm text-muted-foreground">Категории не найдены</div>
            )}
          </div>
        </TabsContent>

        {/* ── CITIES ── */}
        <TabsContent value="cities" className="mt-4 space-y-4">
          <div className="surface-soft space-y-3">
            <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
              <div>
                <Label>Название города</Label>
                <Input
                  value={newCity.name}
                  onChange={(e) => setNewCity((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Например, Коломна"
                  autoComplete="off"
                />
              </div>
              <div>
                <Label>Регион</Label>
                <Input
                  value={newCity.region}
                  onChange={(e) => setNewCity((prev) => ({ ...prev, region: e.target.value }))}
                  placeholder="Московская область"
                  autoComplete="off"
                />
              </div>
              <Button onClick={addCity} className="gap-1.5 shrink-0"><Plus className="h-4 w-4" />Добавить</Button>
            </div>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={cityQuery}
              onChange={(e) => setCityQuery(e.target.value)}
              placeholder="Поиск по городам и регионам..."
              className="pl-9"
            />
          </div>

          <div className="space-y-2">
            {filteredCities.map((city) => (
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
            {filteredCities.length === 0 && (
              <div className="surface-soft py-8 text-center text-sm text-muted-foreground">Города не найдены</div>
            )}
          </div>
        </TabsContent>

        {/* ── VENUES ── */}
        <TabsContent value="venues" className="mt-4 space-y-4">

          {/* New venue form */}
          <div className="surface-soft space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Новая площадка</h2>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_180px]">
              <div>
                <Label>Название *</Label>
                <Input value={newVenue.name} onChange={(e) => setNewVenue((prev) => ({ ...prev, name: e.target.value }))} placeholder="Театр, зал..." />
              </div>
              <div>
                <CityAutocompleteField
                  label="Город *"
                  value={newVenueCitySearch}
                  onChange={(value) => {
                    setNewVenueCitySearch(value);
                    setNewVenue((prev) => ({ ...prev, cityId: '', latitude: '', longitude: '' }));
                    setNewDetectedCity(null);
                    setNewCityUnknown(false);
                  }}
                  open={newVenueCityOpen}
                  onOpenChange={setNewVenueCityOpen}
                  suggestions={citySuggestionsForNewVenue}
                  onPick={(city) => {
                    setNewVenueCitySearch(getCityLabel(city));
                    setNewVenue((prev) => ({ ...prev, cityId: String(city.id), latitude: '', longitude: '' }));
                    setNewDetectedCity(city);
                    setNewCityUnknown(false);
                  }}
                  onClear={() => {
                    setNewVenue((prev) => ({ ...prev, cityId: '', latitude: '', longitude: '' }));
                    setNewDetectedCity(null);
                    setNewCityUnknown(false);
                  }}
                />
              </div>
              <div>
                <Label>Вместимость</Label>
                <Input type="number" min={1} value={newVenue.capacity} onChange={(e) => setNewVenue((prev) => ({ ...prev, capacity: e.target.value }))} placeholder="500" />
              </div>
            </div>

            <AddressField
              value={newVenue.address}
              onChange={onNewAddressInput}
              onClear={() => { setNewVenue((prev) => ({ ...prev, address: '', latitude: '', longitude: '', cityId: selectedAdminCity ? String(selectedAdminCity.id) : prev.cityId })); if (selectedAdminCity) setNewVenueCitySearch(getCityLabel(selectedAdminCity)); setNewDetectedCity(null); setNewCityUnknown(false); setNewSuggestions([]); }}
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
                initialCenter={mapInitialCenter}
                onPick={onNewMapPick}
              />
            </div>

            <Button onClick={addVenue} className="gap-1.5"><Plus className="h-4 w-4" />Добавить площадку</Button>
          </div>

          <div className="surface-soft grid gap-3 lg:grid-cols-[1fr_260px] lg:items-end">
            <div>
              <Label>Поиск площадок</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={venueQuery}
                  onChange={(e) => setVenueQuery(e.target.value)}
                  placeholder="Название, адрес или город..."
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <CityAutocompleteField
                label="Город"
                value={venueCityFilterSearch}
                onChange={(value) => {
                  setVenueCityFilterSearch(value);
                  setVenueCityFilter('all');
                }}
                open={venueCityFilterOpen}
                onOpenChange={setVenueCityFilterOpen}
                suggestions={citySuggestionsForVenueFilter}
                onPick={(city) => {
                  setVenueCityFilter(String(city.id));
                  setVenueCityFilterSearch(getCityLabel(city));
                }}
                onClear={() => {
                  setVenueCityFilter('all');
                  setVenueCityFilterSearch('Все города');
                }}
                placeholder="Все города"
              />
            </div>
          </div>

          {/* Venue list */}
          <div className="space-y-2">
            {filteredVenues.map((venue) => {
              const key = String(venue.id);
              const isExpanded = editingVenueId === key;
              const city = getVenueCity(venue);
              const cityLabel = city?.name ?? venue.cityName;

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
                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_180px]">
                        <div>
                          <Label>Название *</Label>
                          <Input value={editDraft.name} onChange={(e) => setEditDraft((prev) => ({ ...prev, name: e.target.value }))} />
                        </div>
                        <div>
                          <CityAutocompleteField
                            label="Город *"
                            value={editVenueCitySearch}
                            onChange={(value) => {
                              setEditVenueCitySearch(value);
                              setEditDraft((prev) => ({ ...prev, cityId: '', latitude: '', longitude: '' }));
                              setEditDetectedCity(null);
                              setEditCityUnknown(false);
                            }}
                            open={editVenueCityOpen}
                            onOpenChange={setEditVenueCityOpen}
                            suggestions={citySuggestionsForEditVenue}
                            onPick={(city) => {
                              setEditVenueCitySearch(getCityLabel(city));
                              setEditDraft((prev) => ({ ...prev, cityId: String(city.id), latitude: '', longitude: '' }));
                              setEditDetectedCity(city);
                              setEditCityUnknown(false);
                            }}
                            onClear={() => {
                              setEditDraft((prev) => ({ ...prev, cityId: '', latitude: '', longitude: '' }));
                              setEditDetectedCity(null);
                              setEditCityUnknown(false);
                            }}
                          />
                        </div>
                        <div>
                          <Label>Вместимость</Label>
                          <Input type="number" min={1} value={editDraft.capacity} onChange={(e) => setEditDraft((prev) => ({ ...prev, capacity: e.target.value }))} placeholder="500" />
                        </div>
                      </div>

                      <AddressField
                        value={editDraft.address}
                        onChange={onEditAddressInput}
                        onClear={() => { setEditDraft((prev) => ({ ...prev, address: '', latitude: '', longitude: '' })); setEditDetectedCity(null); setEditCityUnknown(false); setEditSuggestions([]); }}
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
                          initialCenter={mapInitialCenter}
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
            {filteredVenues.length === 0 && (
              <div className="surface-soft py-8 text-center text-sm text-muted-foreground">Площадки не найдены</div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

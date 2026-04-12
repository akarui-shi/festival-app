import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImagePlus, Loader2, MapPin, Plus, Search, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { eventService } from '@/services/event-service';
import { directoryService } from '@/services/directory-service';
import { sessionService } from '@/services/session-service';
import { fileUploadService } from '@/services/file-upload-service';
import { yandexMapsService } from '@/services/yandex-maps-service';
import type { Category, City, Session, Venue } from '@/types';
import { LoadingState } from '@/components/StateDisplays';
import { LocationPickerMap } from '@/components/LocationPickerMap';

const STEPS = [
  { key: 'details', title: 'Основное' },
  { key: 'location', title: 'Место' },
  { key: 'photos', title: 'Фото' },
  { key: 'sessions', title: 'Сеансы' },
] as const;

type StepIndex = 0 | 1 | 2 | 3;

interface SessionDraft {
  localId: string;
  id?: string;
  date: string;
  startTime: string;
  endTime: string;
  capacity: string;
}

interface AddressSuggestion {
  id: string;
  label: string;
  address: string;
  latitude?: number;
  longitude?: number;
  cityId?: string;
  cityName?: string;
  region?: string;
  country?: string;
  venueId?: string;
  venueName?: string;
  source: 'venue' | 'geo';
}

interface EventFormState {
  title: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  venueId: string;
  venueName: string;
  venueContacts: string;
  venueCapacity: string;
  address: string;
  latitude: string;
  longitude: string;
  cityId: string;
  cityName: string;
  region: string;
  country: string;
  coverUrl: string;
  galleryImageUrls: string[];
}

const EMPTY_FORM: EventFormState = {
  title: '',
  shortDescription: '',
  description: '',
  categoryId: '',
  venueId: '',
  venueName: '',
  venueContacts: '',
  venueCapacity: '',
  address: '',
  latitude: '',
  longitude: '',
  cityId: '',
  cityName: '',
  region: '',
  country: '',
  coverUrl: '',
  galleryImageUrls: [],
};

function createSessionDraft(partial?: Partial<SessionDraft>): SessionDraft {
  return {
    localId: partial?.localId || Math.random().toString(36).slice(2),
    id: partial?.id,
    date: partial?.date || '',
    startTime: partial?.startTime || '',
    endTime: partial?.endTime || '',
    capacity: partial?.capacity || '',
  };
}

function normalizeSessionDrafts(items: SessionDraft[]): { ok: true; value: SessionDraft[] } | { ok: false; error: string } {
  const hasPartiallyFilled = items.some((item) => {
    const values = [item.date, item.startTime, item.endTime, item.capacity].map((value) => value.trim());
    const filled = values.filter(Boolean).length;
    return filled > 0 && filled < values.length;
  });

  if (hasPartiallyFilled) {
    return { ok: false, error: 'Заполните поля сеанса полностью или удалите незаполненную строку' };
  }

  const complete = items
    .map((item) => ({
      ...item,
      date: item.date.trim(),
      startTime: item.startTime.trim(),
      endTime: item.endTime.trim(),
      capacity: item.capacity.trim(),
    }))
    .filter((item) => item.date && item.startTime && item.endTime && item.capacity);

  if (complete.length === 0) {
    return { ok: false, error: 'Добавьте хотя бы один сеанс' };
  }

  for (const item of complete) {
    const start = new Date(`${item.date}T${item.startTime}:00`);
    const end = new Date(`${item.date}T${item.endTime}:00`);
    const capacity = Number(item.capacity);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { ok: false, error: 'Укажите корректные дату и время сеанса' };
    }
    if (end <= start) {
      return { ok: false, error: 'Время окончания сеанса должно быть позже начала' };
    }
    if (!Number.isFinite(capacity) || capacity < 1) {
      return { ok: false, error: 'Вместимость сеанса должна быть больше 0' };
    }
  }

  return { ok: true, value: complete };
}

function buildCityLabel(city: City): string {
  if (city.region) return `${city.name}, ${city.region}`;
  if (city.country) return `${city.name}, ${city.country}`;
  return city.name;
}

function findCityByName(cities: City[], cityName?: string, region?: string, country?: string): City | null {
  const normalizedCity = (cityName || '').trim().toLowerCase();
  if (!normalizedCity) return null;

  const normalizedRegion = (region || '').trim().toLowerCase();
  const normalizedCountry = (country || '').trim().toLowerCase();

  const exact = cities.find((city) => {
    const cityNameValue = city.name.trim().toLowerCase();
    const cityRegion = (city.region || '').trim().toLowerCase();
    const cityCountry = (city.country || '').trim().toLowerCase();
    return cityNameValue === normalizedCity
      && (!normalizedRegion || cityRegion === normalizedRegion)
      && (!normalizedCountry || cityCountry === normalizedCountry);
  });
  if (exact) return exact;

  return cities.find((city) => city.name.trim().toLowerCase() === normalizedCity) || null;
}

export default function EventFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<EventFormState>(EMPTY_FORM);
  const [sessions, setSessions] = useState<SessionDraft[]>([createSessionDraft()]);
  const [initialSessionIds, setInitialSessionIds] = useState<string[]>([]);

  const [currentStep, setCurrentStep] = useState<StepIndex>(0);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [remoteAddressSuggestions, setRemoteAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [addressLookupLoading, setAddressLookupLoading] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  useEffect(() => {
    let active = true;

    Promise.all([
      directoryService.getCategories(),
      directoryService.getCities(),
      directoryService.getVenues(),
      isEdit ? eventService.getEventById(id!) : Promise.resolve(null),
      isEdit ? sessionService.getSessionsByEvent(id!) : Promise.resolve([]),
    ])
      .then(([categoriesResponse, citiesResponse, venuesResponse, eventResponse, sessionsResponse]) => {
        if (!active) return;

        setCategories(categoriesResponse);
        setCities(citiesResponse);
        setVenues(venuesResponse);

        if (eventResponse) {
          const eventVenue = eventResponse.venue;
          const venueCity = eventVenue?.city;
          const galleryFromEvent = (eventResponse.imageUrls || []).filter((url) => url !== eventResponse.imageUrl);

          setForm({
            title: eventResponse.title || '',
            shortDescription: eventResponse.shortDescription || '',
            description: eventResponse.description || '',
            categoryId: eventResponse.categoryId || '',
            venueId: eventVenue?.id || '',
            venueName: eventVenue?.name || '',
            venueContacts: eventVenue?.description || '',
            venueCapacity: eventVenue?.capacity ? String(eventVenue.capacity) : '',
            address: eventVenue?.address || '',
            latitude: eventVenue?.latitude != null ? String(eventVenue.latitude) : '',
            longitude: eventVenue?.longitude != null ? String(eventVenue.longitude) : '',
            cityId: venueCity?.id || eventResponse.cityId || '',
            cityName: venueCity?.name || eventResponse.city?.name || '',
            region: venueCity?.region || eventResponse.city?.region || '',
            country: venueCity?.country || eventResponse.city?.country || '',
            coverUrl: eventResponse.imageUrl || '',
            galleryImageUrls: galleryFromEvent,
          });
        }

        if (sessionsResponse.length > 0) {
          const drafts = sessionsResponse.map((session) => createSessionDraft({
            id: session.id,
            date: session.date,
            startTime: session.startTime,
            endTime: session.endTime,
            capacity: String(session.maxParticipants || ''),
          }));
          setSessions(drafts);
          setInitialSessionIds(drafts.map((session) => session.id || '').filter(Boolean));
        }
      })
      .catch(() => {
        toast.error('Не удалось загрузить данные формы мероприятия');
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [id, isEdit]);

  const localAddressSuggestions = useMemo<AddressSuggestion[]>(() => {
    const query = form.address.trim().toLowerCase();
    if (query.length < 2) {
      return [];
    }

    return venues
      .filter((venue) => {
        const searchable = `${venue.address} ${venue.name} ${venue.city?.name || ''} ${venue.city?.region || ''}`.toLowerCase();
        return query.split(/\s+/).every((part) => searchable.includes(part));
      })
      .slice(0, 7)
      .map((venue) => ({
        id: `venue-${venue.id}`,
        source: 'venue',
        label: `${venue.address}${venue.city ? ` · ${buildCityLabel(venue.city)}` : ''}`,
        address: venue.address,
        latitude: venue.latitude,
        longitude: venue.longitude,
        cityId: venue.city?.id || venue.cityId,
        cityName: venue.city?.name,
        region: venue.city?.region,
        country: venue.city?.country,
        venueId: venue.id,
        venueName: venue.name,
      }));
  }, [form.address, venues]);

  const mergedAddressSuggestions = useMemo(() => {
    const seen = new Set<string>();
    const merged: AddressSuggestion[] = [];

    [...localAddressSuggestions, ...remoteAddressSuggestions].forEach((item) => {
      const key = `${item.address}|${item.latitude}|${item.longitude}`;
      if (seen.has(key)) return;
      seen.add(key);
      merged.push(item);
    });

    return merged.slice(0, 10);
  }, [localAddressSuggestions, remoteAddressSuggestions]);

  useEffect(() => {
    const query = form.address.trim();
    if (query.length < 3) {
      setRemoteAddressSuggestions([]);
      return;
    }

    const timeoutId = window.setTimeout(async () => {
      setAddressLookupLoading(true);
      try {
        const payload = await yandexMapsService.searchAddressSuggestions(query, 7);
        const suggestions: AddressSuggestion[] = payload.map((item, index) => {
          const matchedCity = findCityByName(cities, item.cityName, item.region, item.country);

          return {
            id: item.id || `geo-${index}`,
            source: 'geo',
            label: item.label,
            address: item.address,
            latitude: item.latitude,
            longitude: item.longitude,
            cityId: matchedCity?.id,
            cityName: matchedCity?.name || item.cityName || '',
            region: matchedCity?.region || item.region || '',
            country: matchedCity?.country || item.country || '',
          };
        });

        setRemoteAddressSuggestions(suggestions);
      } catch {
        setRemoteAddressSuggestions([]);
      } finally {
        setAddressLookupLoading(false);
      }
    }, 360);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [cities, form.address]);

  const updateForm = (field: keyof EventFormState, value: string | string[]) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const selectAddressSuggestion = (suggestion: AddressSuggestion) => {
    setForm((prev) => ({
      ...prev,
      address: suggestion.address,
      latitude: suggestion.latitude != null ? String(suggestion.latitude) : prev.latitude,
      longitude: suggestion.longitude != null ? String(suggestion.longitude) : prev.longitude,
      cityId: suggestion.cityId || prev.cityId,
      cityName: suggestion.cityName || prev.cityName,
      region: suggestion.region || prev.region,
      country: suggestion.country || prev.country,
      venueId: suggestion.venueId || '',
      venueName: suggestion.venueName || prev.venueName,
    }));

    setShowAddressSuggestions(false);
  };

  const resolveAddressByPoint = async (latitude: number, longitude: number) => {
    try {
      const payload = await yandexMapsService.reverseGeocode(latitude, longitude);
      if (!payload) {
        throw new Error('Reverse geocoding failed');
      }

      const matchedCity = findCityByName(cities, payload.cityName, payload.region, payload.country);

      setForm((prev) => ({
        ...prev,
        address: payload.address || prev.address,
        cityId: matchedCity?.id || prev.cityId,
        cityName: matchedCity?.name || payload.cityName || prev.cityName,
        region: matchedCity?.region || payload.region || prev.region,
        country: matchedCity?.country || payload.country || prev.country,
        venueId: '',
      }));
    } catch {
      toast.info('Точка выбрана, но адрес не удалось определить автоматически');
    }
  };

  const onMapPick = (latitude: number, longitude: number) => {
    setForm((prev) => ({
      ...prev,
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
      venueId: '',
    }));

    resolveAddressByPoint(latitude, longitude);
  };

  const addSession = () => {
    setSessions((prev) => [...prev, createSessionDraft()]);
  };

  const updateSession = (localId: string, field: keyof Omit<SessionDraft, 'localId' | 'id'>, value: string) => {
    setSessions((prev) => prev.map((session) => (
      session.localId === localId ? { ...session, [field]: value } : session
    )));
  };

  const removeSession = (localId: string) => {
    setSessions((prev) => {
      if (prev.length === 1) {
        return [createSessionDraft()];
      }
      return prev.filter((session) => session.localId !== localId);
    });
  };

  const onUploadCover: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const uploaded = await fileUploadService.uploadEventCover(file);
      setForm((prev) => ({ ...prev, coverUrl: uploaded.url }));
      toast.success('Обложка загружена');
    } catch {
      toast.error('Не удалось загрузить обложку');
    } finally {
      setUploadingCover(false);
      event.target.value = '';
    }
  };

  const onUploadGallery: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    setUploadingGallery(true);
    try {
      const responses = await Promise.all(files.map((file) => fileUploadService.uploadEventImage(file)));
      const urls = responses.map((item) => item.url);

      setForm((prev) => {
        const merged = Array.from(new Set([...prev.galleryImageUrls, ...urls]));
        return { ...prev, galleryImageUrls: merged };
      });

      toast.success(`Загружено изображений: ${urls.length}`);
    } catch {
      toast.error('Не удалось загрузить изображения галереи');
    } finally {
      setUploadingGallery(false);
      event.target.value = '';
    }
  };

  const removeGalleryImage = (url: string) => {
    setForm((prev) => ({
      ...prev,
      galleryImageUrls: prev.galleryImageUrls.filter((item) => item !== url),
    }));
  };

  const currentStepError = useMemo(() => {
    if (currentStep === 0) {
      if (!form.title.trim()) return 'Укажите название мероприятия';
      if (!form.categoryId) return 'Выберите категорию';
      return null;
    }

    if (currentStep === 1) {
      const hasVenueId = Boolean(form.venueId);
      const hasAddress = Boolean(form.address.trim());
      const parsedLatitude = Number(form.latitude);
      const parsedLongitude = Number(form.longitude);
      const hasCoordinates = Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude);

      if (!hasVenueId && !hasAddress) return 'Укажите адрес площадки';
      if (!hasVenueId && !hasCoordinates) return 'Выберите точку на карте или из подсказок';
      return null;
    }

    if (currentStep === 3) {
      const normalized = normalizeSessionDrafts(sessions);
      if (!normalized.ok) return normalized.error;
    }

    return null;
  }, [currentStep, form.address, form.categoryId, form.latitude, form.longitude, form.title, sessions]);

  const nextStep = () => {
    if (currentStepError) {
      toast.error(currentStepError);
      return;
    }

    setCurrentStep((prev) => Math.min(prev + 1, 3) as StepIndex);
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0) as StepIndex);
  };

  const syncSessions = async (eventId: string, normalizedDrafts: SessionDraft[]) => {
    const draftIds = new Set(normalizedDrafts.map((item) => item.id).filter(Boolean) as string[]);

    if (isEdit) {
      const removedSessionIds = initialSessionIds.filter((existingId) => !draftIds.has(existingId));
      for (const removedId of removedSessionIds) {
        await sessionService.deleteSession(removedId);
      }
    }

    for (const session of normalizedDrafts) {
      const payload: Partial<Session> = {
        eventId,
        date: session.date,
        startTime: session.startTime,
        endTime: session.endTime,
        maxParticipants: Number(session.capacity),
      };

      if (session.id) {
        await sessionService.updateSession(session.id, payload);
      } else {
        await sessionService.createSession(payload);
      }
    }
  };

  const handleSubmit = async (submitEvent: React.FormEvent) => {
    submitEvent.preventDefault();

    const normalizedSessions = normalizeSessionDrafts(sessions);
    if (!normalizedSessions.ok) {
      toast.error(normalizedSessions.error);
      setCurrentStep(3);
      return;
    }

    if (!form.title.trim() || !form.categoryId) {
      toast.error('Заполните основные данные');
      setCurrentStep(0);
      return;
    }

    const hasVenueId = Boolean(form.venueId);
    const parsedLatitude = Number(form.latitude);
    const parsedLongitude = Number(form.longitude);
    const hasCoordinates = Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude);

    if (!hasVenueId && (!form.address.trim() || !hasCoordinates)) {
      toast.error('Укажите место проведения и точку на карте');
      setCurrentStep(1);
      return;
    }

    setSaving(true);
    try {
      const galleryUrls = form.galleryImageUrls.filter(Boolean);
      const orderedImageUrls = Array.from(new Set([
        form.coverUrl,
        ...galleryUrls,
      ].filter(Boolean)));

      const eventPayload = {
        title: form.title.trim(),
        shortDescription: form.shortDescription.trim() || undefined,
        description: form.description.trim() || undefined,
        categoryIds: [form.categoryId],
        venueId: form.venueId || undefined,
        venueName: form.venueName.trim() || undefined,
        venueAddress: hasVenueId ? undefined : form.address.trim(),
        venueLatitude: hasVenueId ? undefined : parsedLatitude,
        venueLongitude: hasVenueId ? undefined : parsedLongitude,
        venueCityId: form.cityId || undefined,
        venueCityName: form.cityName.trim() || undefined,
        venueRegion: form.region.trim() || undefined,
        venueCountry: form.country.trim() || undefined,
        venueContacts: form.venueContacts.trim() || undefined,
        venueCapacity: form.venueCapacity ? Number(form.venueCapacity) : undefined,
        coverUrl: form.coverUrl || orderedImageUrls[0] || undefined,
        eventImages: orderedImageUrls.map((url, index) => ({
          imageUrl: url,
          isCover: index === 0,
          sortOrder: index,
        })),
      };

      const savedEvent = isEdit
        ? await eventService.updateEvent(id!, eventPayload)
        : await eventService.createEvent(eventPayload);

      await syncSessions(savedEvent.id, normalizedSessions.value);

      toast.success(isEdit ? 'Мероприятие обновлено' : 'Мероприятие создано');
      navigate('/organizer/events');
    } catch {
      toast.error('Ошибка сохранения. Проверьте корректность адреса и сеансов.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  const latitudeValue = form.latitude ? Number(form.latitude) : undefined;
  const longitudeValue = form.longitude ? Number(form.longitude) : undefined;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="space-y-2">
        <Link
          to="/organizer/events"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          К списку мероприятий
        </Link>
        <h1 className="font-heading text-3xl text-foreground sm:text-4xl">
          {isEdit ? 'Редактирование мероприятия' : 'Новое мероприятие'}
        </h1>
        <p className="text-muted-foreground">Создание проходит по этапам: основное, место, фото и сеансы</p>
      </section>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-card sm:p-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STEPS.map((step, index) => {
            const stepNumber = index + 1;
            const active = currentStep === index;
            const passed = currentStep > index;

            return (
              <button
                type="button"
                key={step.key}
                onClick={() => setCurrentStep(index as StepIndex)}
                className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                  active
                    ? 'border-primary bg-primary/10 text-primary'
                    : passed
                      ? 'border-primary/40 bg-primary/5 text-foreground'
                      : 'border-border bg-muted/40 text-muted-foreground'
                }`}
              >
                <p className="text-xs font-semibold">Шаг {stepNumber}</p>
                <p className="text-sm font-semibold">{step.title}</p>
              </button>
            );
          })}
        </div>
      </section>

      <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-border bg-card p-5 shadow-card sm:p-8">
        {currentStep === 0 && (
          <div className="space-y-4">
            <h2 className="font-heading text-2xl text-foreground">Основная информация</h2>

            <div>
              <Label>Название *</Label>
              <Input
                value={form.title}
                onChange={(event) => updateForm('title', event.target.value)}
                placeholder="Название мероприятия"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Категория *</Label>
                <Select value={form.categoryId} onValueChange={(value) => updateForm('categoryId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите категорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.icon} {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Название площадки</Label>
                <Input
                  value={form.venueName}
                  onChange={(event) => updateForm('venueName', event.target.value)}
                  placeholder="Например, Дом культуры"
                />
              </div>
            </div>

            <div>
              <Label>Краткое описание</Label>
              <Input
                value={form.shortDescription}
                onChange={(event) => updateForm('shortDescription', event.target.value)}
                placeholder="В одно предложение"
              />
            </div>

            <div>
              <Label>Полное описание</Label>
              <Textarea
                rows={6}
                value={form.description}
                onChange={(event) => updateForm('description', event.target.value)}
                placeholder="Расскажите подробно о мероприятии"
              />
            </div>
          </div>
        )}

        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="font-heading text-2xl text-foreground">Место проведения</h2>

            <div className="relative">
              <Label>Адрес *</Label>
              <Search className="pointer-events-none absolute left-3 top-[38px] h-4 w-4 text-muted-foreground" />
              <Input
                value={form.address}
                onFocus={() => setShowAddressSuggestions(true)}
                onChange={(event) => {
                  updateForm('address', event.target.value);
                  updateForm('venueId', '');
                  setShowAddressSuggestions(true);
                }}
                placeholder="Начните вводить адрес"
                className="pl-9"
              />

              {showAddressSuggestions && (mergedAddressSuggestions.length > 0 || addressLookupLoading) && (
                <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-border bg-card p-1 shadow-card">
                  {mergedAddressSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      onClick={() => selectAddressSuggestion(suggestion)}
                      className="block w-full rounded-lg px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
                    >
                      <span className="font-semibold">{suggestion.source === 'venue' ? 'Площадка' : 'Адрес'}</span>
                      <span className="block text-muted-foreground">{suggestion.label}</span>
                    </button>
                  ))}

                  {addressLookupLoading && (
                    <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Ищем адресные подсказки...
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Контакты площадки</Label>
                <Input
                  value={form.venueContacts}
                  onChange={(event) => updateForm('venueContacts', event.target.value)}
                  placeholder="Телефон, сайт или email"
                />
              </div>
              <div>
                <Label>Вместимость площадки</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.venueCapacity}
                  onChange={(event) => updateForm('venueCapacity', event.target.value)}
                  placeholder="Например, 300"
                />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                Выбор точки на карте
              </p>
              <p className="mb-3 text-sm text-muted-foreground">
                Можно не вводить адрес вручную: кликните по карте, и мы автоматически подставим координаты и попробуем определить адрес.
              </p>

              <LocationPickerMap
                latitude={Number.isFinite(latitudeValue) ? latitudeValue : undefined}
                longitude={Number.isFinite(longitudeValue) ? longitudeValue : undefined}
                onPick={onMapPick}
              />

              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <Label>Широта *</Label>
                  <Input
                    value={form.latitude}
                    onChange={(event) => updateForm('latitude', event.target.value)}
                    placeholder="55.751244"
                  />
                </div>
                <div>
                  <Label>Долгота *</Label>
                  <Input
                    value={form.longitude}
                    onChange={(event) => updateForm('longitude', event.target.value)}
                    placeholder="37.618423"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <Label>Город</Label>
                <Input
                  value={form.cityName}
                  onChange={(event) => updateForm('cityName', event.target.value)}
                  placeholder="Город"
                />
              </div>
              <div>
                <Label>Регион</Label>
                <Input
                  value={form.region}
                  onChange={(event) => updateForm('region', event.target.value)}
                  placeholder="Регион"
                />
              </div>
              <div>
                <Label>Страна</Label>
                <Input
                  value={form.country}
                  onChange={(event) => updateForm('country', event.target.value)}
                  placeholder="Страна"
                />
              </div>
            </div>
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-5">
            <h2 className="font-heading text-2xl text-foreground">Фотографии мероприятия</h2>

            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Обложка</p>
                  <p className="text-xs text-muted-foreground">Будет показываться в карточке мероприятия</p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:border-primary/40">
                  {uploadingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  Загрузить
                  <input type="file" accept="image/*" className="hidden" onChange={onUploadCover} disabled={uploadingCover} />
                </label>
              </div>

              {form.coverUrl ? (
                <div className="overflow-hidden rounded-xl border border-border bg-card">
                  <img src={form.coverUrl} alt="Обложка" className="h-52 w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                  Обложка пока не загружена
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">Галерея</p>
                  <p className="text-xs text-muted-foreground">Можно добавить несколько фотографий</p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-foreground hover:border-primary/40">
                  {uploadingGallery ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  Добавить
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={onUploadGallery}
                    disabled={uploadingGallery}
                  />
                </label>
              </div>

              {form.galleryImageUrls.length === 0 ? (
                <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                  Галерея пока пустая
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {form.galleryImageUrls.map((url) => (
                    <div key={url} className="relative overflow-hidden rounded-xl border border-border bg-card">
                      <img src={url} alt="Изображение" className="h-28 w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(url)}
                        className="absolute right-2 top-2 rounded-md bg-foreground/70 p-1 text-background hover:bg-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-heading text-2xl text-foreground">Сеансы мероприятия</h2>
                <p className="text-sm text-muted-foreground">Можно добавить один или несколько сеансов</p>
              </div>
              <Button type="button" variant="outline" className="gap-1.5" onClick={addSession}>
                <Plus className="h-4 w-4" />
                Добавить сеанс
              </Button>
            </div>

            <div className="space-y-3">
              {sessions.map((session, index) => (
                <div key={session.localId} className="rounded-xl border border-border bg-muted/30 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-sm font-semibold text-foreground">Сеанс {index + 1}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => removeSession(session.localId)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                    <div>
                      <Label>Дата</Label>
                      <Input
                        type="date"
                        value={session.date}
                        onChange={(event) => updateSession(session.localId, 'date', event.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Начало</Label>
                      <Input
                        type="time"
                        value={session.startTime}
                        onChange={(event) => updateSession(session.localId, 'startTime', event.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Окончание</Label>
                      <Input
                        type="time"
                        value={session.endTime}
                        onChange={(event) => updateSession(session.localId, 'endTime', event.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Вместимость</Label>
                      <Input
                        type="number"
                        min={1}
                        value={session.capacity}
                        onChange={(event) => updateSession(session.localId, 'capacity', event.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
          <Button type="button" variant="ghost" onClick={() => navigate('/organizer/events')}>
            Отмена
          </Button>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button type="button" variant="outline" onClick={prevStep}>
                Назад
              </Button>
            )}

            {currentStep < 3 ? (
              <Button type="button" onClick={nextStep}>
                Далее
              </Button>
            ) : (
              <Button type="submit" disabled={saving}>
                {saving ? 'Сохранение…' : isEdit ? 'Сохранить' : 'Создать'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}

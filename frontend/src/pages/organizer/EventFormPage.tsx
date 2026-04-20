import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Building2, CalendarDays, CheckCircle2, Clock3, Image as ImageIcon, Loader2, MapPin, Plus, Star, Tag, Ticket, Trash2, Upload, Users } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { LoadingState } from '@/components/StateDisplays';
import { imageSrc } from '@/lib/image';
import { LocationPickerMap } from '@/components/LocationPickerMap';
import { artistService } from '@/services/artist-service';
import { directoryService } from '@/services/directory-service';
import { fileUploadService } from '@/services/file-upload-service';
import {
  organizerEventWizardService,
  type OrganizerOrganizationOption,
  type OrganizerWizardState,
  type WizardArtistItem,
  type WizardImageItem,
  type WizardSessionItem,
  type WizardTicketTypeItem,
  type WizardValidationIssue,
} from '@/services/organizer-event-wizard-service';
import { yandexMapsService, type YandexAddressSuggestion } from '@/services/yandex-maps-service';
import type { Artist, Category, City, Venue } from '@/types';

const WIZARD_STEPS = [
  'Основная информация',
  'Фотографии',
  'Артисты (опционально)',
  'Сеансы',
  'Билеты',
  'Предпросмотр',
] as const;

type StepIndex = 0 | 1 | 2 | 3 | 4 | 5;

const AGE_OPTIONS = ['', '0+', '6+', '12+', '16+', '18+'] as const;

const WIZARD_STEP_LABELS: Record<string, string> = {
  step_1: 'Основная информация',
  step_2: 'Фотографии',
  step_3: 'Артисты',
  step_4: 'Сеансы',
  step_5: 'Билеты',
};

interface BasicInfoForm {
  title: string;
  shortDescription: string;
  fullDescription: string;
  ageRestriction: string;
}

interface ImageDraft {
  imageId: number;
  primary: boolean;
  sortOrder: number;
}

interface ExistingArtistDraft {
  artistId: number;
}

interface TicketTypeDraft {
  id?: number;
  name: string;
  price: string;
  quota: string;
  salesStartAt: string;
  salesEndAt: string;
}

interface SessionDraft {
  localId: string;
  id?: number;
  locationMode: 'venue' | 'manual';
  sessionTitle: string;
  startsAt: string;
  endsAt: string;
  venueId: string;
  manualAddress: string;
  cityId: string;
  cityName: string;
  cityRegion: string;
  latitude: string;
  longitude: string;
  seatLimit: string;
  ticketTypes: TicketTypeDraft[];
}

function toNumber(value?: string | number | null): number | undefined {
  if (value == null || value === '') return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function makeLocalId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function currentLocalDateTimeValue(): string {
  const now = new Date();
  const offsetMinutes = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offsetMinutes * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

function defaultTicketType(sessionStartsAt?: string, quota = '100'): TicketTypeDraft {
  return {
    name: 'Стандарт',
    price: '500',
    quota,
    salesStartAt: currentLocalDateTimeValue(),
    salesEndAt: sessionStartsAt || '',
  };
}

function defaultSessionDraft(): SessionDraft {
  return {
    localId: makeLocalId('session'),
    locationMode: 'manual',
    sessionTitle: '',
    startsAt: '',
    endsAt: '',
    venueId: '',
    manualAddress: '',
    cityId: '',
    cityName: '',
    cityRegion: '',
    latitude: '',
    longitude: '',
    seatLimit: '',
    ticketTypes: [defaultTicketType()],
  };
}

function mapImage(item: WizardImageItem, index: number): ImageDraft | null {
  if (item.imageId == null) return null;
  return {
    imageId: item.imageId,
    primary: Boolean(item.primary),
    sortOrder: item.sortOrder ?? index,
  };
}

function mapArtistToExisting(item: WizardArtistItem): ExistingArtistDraft {
  return {
    artistId: item.artistId,
  };
}

function mapTicket(item: WizardTicketTypeItem): TicketTypeDraft {
  return {
    id: item.id ?? undefined,
    name: item.name || '',
    price: String(item.price ?? 0),
    quota: String(item.quota ?? 1),
    salesStartAt: item.salesStartAt ? item.salesStartAt.slice(0, 16) : '',
    salesEndAt: item.salesEndAt ? item.salesEndAt.slice(0, 16) : '',
  };
}

function mapSession(item: WizardSessionItem, index: number): SessionDraft {
  const startsAt = item.startsAt ? item.startsAt.slice(0, 16) : '';
  const mappedTicketTypes = (item.ticketTypes || []).map(mapTicket);
  return {
    localId: makeLocalId(`session-${index}`),
    id: item.sessionId ?? undefined,
    locationMode: item.venueId ? 'venue' : 'manual',
    sessionTitle: item.sessionTitle || '',
    startsAt,
    endsAt: item.endsAt ? item.endsAt.slice(0, 16) : '',
    venueId: item.venueId ? String(item.venueId) : '',
    manualAddress: item.manualAddress || '',
    cityId: item.cityId ? String(item.cityId) : '',
    cityName: item.cityName || '',
    cityRegion: item.cityRegion || '',
    latitude: item.latitude == null ? '' : String(item.latitude),
    longitude: item.longitude == null ? '' : String(item.longitude),
    seatLimit: item.seatLimit == null ? '' : String(item.seatLimit),
    ticketTypes: mappedTicketTypes.length > 0 ? mappedTicketTypes : [defaultTicketType(startsAt)],
  };
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function safePositiveInt(value?: string | number | null): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.floor(parsed);
  return rounded > 0 ? rounded : null;
}

function getSessionSeatLimit(session: SessionDraft): number | null {
  return safePositiveInt(session.seatLimit);
}

function getSessionTicketQuotaTotal(session: SessionDraft): number {
  return session.ticketTypes.reduce((sum, ticketType) => {
    const quota = safePositiveInt(ticketType.quota);
    return sum + (quota ?? 0);
  }, 0);
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value.replace('T', ' ');
  }
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(value);
}

export default function EventFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [step, setStep] = useState<StepIndex>(0);

  const [eventId, setEventId] = useState<number | null>(id ? Number(id) : null);
  const [wizardState, setWizardState] = useState<OrganizerWizardState | null>(null);

  const [organizations, setOrganizations] = useState<OrganizerOrganizationOption[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [artistsCatalog, setArtistsCatalog] = useState<Artist[]>([]);
  const [artistSearch, setArtistSearch] = useState('');

  const [basicInfo, setBasicInfo] = useState<BasicInfoForm>({
    title: '',
    shortDescription: '',
    fullDescription: '',
    ageRestriction: '',
  });
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [images, setImages] = useState<ImageDraft[]>([]);
  const [existingArtists, setExistingArtists] = useState<ExistingArtistDraft[]>([]);
  const [sessions, setSessions] = useState<SessionDraft[]>([]);
  const [expandedSessionLocalId, setExpandedSessionLocalId] = useState<string | null>(null);
  const [hasArtists, setHasArtists] = useState(false);
  const [isFreeEvent, setIsFreeEvent] = useState(true);
  const [previewImageId, setPreviewImageId] = useState<number | null>(null);
  const isFreeInitializedRef = useRef(false);

  const [addressSuggestionsBySession, setAddressSuggestionsBySession] = useState<Record<string, YandexAddressSuggestion[]>>({});
  const [addressLoadingBySession, setAddressLoadingBySession] = useState<Record<string, boolean>>({});
  const [mapOpenedBySession, setMapOpenedBySession] = useState<Record<string, boolean>>({});
  const [mapCenter, setMapCenter] = useState<[number, number] | undefined>(undefined);

  const addressSearchTimeoutRef = useRef<Record<string, number>>({});

  const applyWizardState = useCallback((state: OrganizerWizardState | null) => {
    if (!state) return;
    setWizardState(state);
    setEventId(state.eventId);

    setBasicInfo({
      title: state.title || '',
      shortDescription: state.shortDescription || '',
      fullDescription: state.fullDescription || '',
      ageRestriction: state.ageRestriction || '',
    });

    setCategoryIds(state.categoryIds || []);

    const mappedImages = (state.images || [])
      .map(mapImage)
      .filter((item): item is ImageDraft => Boolean(item))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    setImages(mappedImages);

    const mappedArtists = (state.artists || []).map(mapArtistToExisting);
    setExistingArtists(mappedArtists);
    setHasArtists(mappedArtists.length > 0);

    const mappedSessions = (state.sessions || []).map(mapSession);
    if (mappedSessions.length > 0) {
      setSessions(mappedSessions);
      setExpandedSessionLocalId(mappedSessions[mappedSessions.length - 1].localId);
    } else {
      const initialSession = defaultSessionDraft();
      setSessions([initialSession]);
      setExpandedSessionLocalId(initialSession.localId);
    }
    if (!isFreeInitializedRef.current) {
      setIsFreeEvent(Boolean(state.free ?? true));
      isFreeInitializedRef.current = true;
    }
    setDirty(false);
  }, []);

  useEffect(() => {
    let active = true;
    isFreeInitializedRef.current = false;

    Promise.all([
      directoryService.getCategories(),
      directoryService.getCities(),
      directoryService.getVenues(),
      organizerEventWizardService.getOrganizations(),
      artistService.getArtists(),
      id ? organizerEventWizardService.getState(Number(id)) : Promise.resolve(null),
    ])
      .then(([cats, cityList, venueList, orgs, artists, state]) => {
        if (!active) return;

        setCategories(cats);
        setCities(cityList);
        setVenues(venueList);
        setOrganizations(orgs);
        setArtistsCatalog(artists);

        if (state) {
          applyWizardState(state);
        } else {
          const initialSession = defaultSessionDraft();
          setSessions([initialSession]);
          setExpandedSessionLocalId(initialSession.localId);
        }

        if (orgs.length > 1) {
          toast.error('Для мастера создания мероприятий организатор должен состоять только в одной организации');
        }
      })
      .catch(() => {
        toast.error('Не удалось загрузить данные мастера создания мероприятия');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      Object.values(addressSearchTimeoutRef.current).forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [id, applyWizardState]);

  const organizerCityName = wizardState?.cityName || organizations[0]?.cityName || null;

  useEffect(() => {
    if (!organizerCityName) return;

    let cancelled = false;
    yandexMapsService.searchAddressSuggestions(organizerCityName, 1)
      .then((results) => {
        if (cancelled || results.length === 0) return;
        setMapCenter([results[0].latitude, results[0].longitude]);
      })
      .catch(() => {
        // ignore map center resolving errors
      });

    return () => {
      cancelled = true;
    };
  }, [organizerCityName]);

  useEffect(() => {
    if (!eventId) return;

    const timer = window.setInterval(async () => {
      if (!dirty || saving || step === 4) return;

      setAutoSaving(true);
      try {
        await saveCurrentStep(true);
      } finally {
        setAutoSaving(false);
      }
    }, 15000);

    return () => window.clearInterval(timer);
  }, [dirty, eventId, saving, step]);

  const artistOptions = useMemo(() => {
    const q = artistSearch.trim().toLowerCase();
    if (!q) return artistsCatalog.slice(0, 40);
    return artistsCatalog
      .filter((artist) => `${artist.name} ${artist.stageName || ''}`.toLowerCase().includes(q))
      .slice(0, 40);
  }, [artistSearch, artistsCatalog]);

  const orderedPreviewImages = useMemo(
    () => [...images].sort((a, b) => a.sortOrder - b.sortOrder),
    [images],
  );

  const selectedPreviewImage = useMemo(() => {
    if (orderedPreviewImages.length === 0) return null;
    if (previewImageId != null) {
      const found = orderedPreviewImages.find((image) => image.imageId === previewImageId);
      if (found) return found;
    }
    return orderedPreviewImages.find((image) => image.primary) ?? orderedPreviewImages[0];
  }, [orderedPreviewImages, previewImageId]);

  useEffect(() => {
    if (orderedPreviewImages.length === 0) {
      if (previewImageId != null) setPreviewImageId(null);
      return;
    }
    if (previewImageId == null || !orderedPreviewImages.some((image) => image.imageId === previewImageId)) {
      const fallback = orderedPreviewImages.find((image) => image.primary)?.imageId ?? orderedPreviewImages[0].imageId;
      setPreviewImageId(fallback);
    }
  }, [orderedPreviewImages, previewImageId]);

  const selectedCategories = useMemo(
    () => categories.filter((category) => categoryIds.includes(Number(category.id))),
    [categories, categoryIds],
  );

  const selectedArtistsDetailed = useMemo(() => (
    existingArtists
      .map((selected) => artistsCatalog.find((artist) => Number(artist.id) === selected.artistId))
      .filter((artist): artist is Artist => Boolean(artist))
  ), [existingArtists, artistsCatalog]);

  const previewPriceStats = useMemo(() => {
    const prices = sessions
      .flatMap((session) => session.ticketTypes)
      .map((ticketType) => Number(ticketType.price))
      .filter((value) => Number.isFinite(value) && value >= 0);
    if (prices.length === 0) {
      return { min: null as number | null, max: null as number | null };
    }
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [sessions]);

  const previewTotals = useMemo(() => {
    const sessionsCount = sessions.length;
    const artistsCount = selectedArtistsDetailed.length;
    const ticketTypesCount = sessions.reduce((sum, session) => sum + session.ticketTypes.length, 0);
    const seatLimitTotal = sessions.reduce((sum, session) => {
      const seatLimit = getSessionSeatLimit(session);
      return sum + (seatLimit ?? 0);
    }, 0);
    const ticketQuotaTotal = sessions.reduce((sum, session) => sum + getSessionTicketQuotaTotal(session), 0);
    return {
      sessionsCount,
      artistsCount,
      ticketTypesCount,
      seatLimitTotal,
      ticketQuotaTotal,
    };
  }, [sessions, selectedArtistsDetailed.length]);

  const validationIssuesByStep = useMemo(() => {
    const grouped = new Map<string, WizardValidationIssue[]>();
    for (const issue of wizardState?.validationIssues || []) {
      const list = grouped.get(issue.step) || [];
      list.push(issue);
      grouped.set(issue.step, list);
    }
    return Array.from(grouped.entries());
  }, [wizardState?.validationIssues]);

  const markDirty = () => setDirty(true);

  const ensureEventExists = useCallback(async (): Promise<number> => {
    if (eventId) return eventId;

    const created = await organizerEventWizardService.createDraft({
      title: basicInfo.title || 'Черновик мероприятия',
    });

    applyWizardState(created);
    toast.success('Черновик создан');
    return created.eventId;
  }, [eventId, basicInfo.title, applyWizardState]);

  const validateStep = (targetStep: StepIndex): string | null => {
    if (targetStep === 0) {
      if (!basicInfo.title.trim()) return 'Введите название мероприятия';
      if (categoryIds.length === 0) return 'Выберите хотя бы одну категорию';
    }

    if (targetStep === 1) {
      if (images.length === 0) return 'Добавьте минимум одну фотографию';
      const primaryCount = images.filter((image) => image.primary).length;
      if (primaryCount !== 1) return 'Укажите ровно одно главное изображение';
    }

    if (targetStep === 3) {
      if (sessions.length === 0) return 'Добавьте хотя бы один сеанс';

      for (const session of sessions) {
        if (!session.startsAt) return 'У каждого сеанса должен быть starts_at';
        if (session.endsAt && session.endsAt < session.startsAt) {
          return 'ends_at не может быть раньше starts_at';
        }
        if (session.locationMode === 'venue' && !session.venueId) {
          return 'Выберите площадку для каждого сеанса';
        }
        if (session.locationMode === 'manual' && !session.manualAddress.trim()) {
          return 'Укажите адрес вручную для каждого сеанса';
        }
      }
    }

    if (targetStep === 4) {
      if (isFreeEvent) return null;

      for (let sessionIndex = 0; sessionIndex < sessions.length; sessionIndex += 1) {
        const session = sessions[sessionIndex];
        if (!session.id) return 'Сначала сохраните шаг с сеансами';
        if (session.ticketTypes.length === 0) return 'Добавьте хотя бы один тип билета для каждого сеанса';

        for (const ticketType of session.ticketTypes) {
          const price = Number(ticketType.price);
          const quota = Number(ticketType.quota);
          if (!ticketType.name.trim()) return 'Название билета обязательно';
          if (!Number.isFinite(price) || price <= 0) return 'Для платного мероприятия цена билета должна быть > 0';
          if (!Number.isFinite(quota) || quota <= 0) return 'Количество билетов должно быть > 0';
          if (ticketType.salesStartAt && ticketType.salesEndAt && ticketType.salesEndAt < ticketType.salesStartAt) {
            return 'sales_end_at не может быть раньше sales_start_at';
          }
        }

        const seatLimit = getSessionSeatLimit(session);
        if (seatLimit != null) {
          const totalQuota = getSessionTicketQuotaTotal(session);
          if (totalQuota > seatLimit) {
            return `Сеанс ${sessionIndex + 1}: сумма квот билетов (${totalQuota}) больше лимита мест (${seatLimit})`;
          }
        }
      }
    }

    return null;
  };

  const saveCurrentStep = useCallback(async (silent = false, stepOverride?: StepIndex) => {
    const targetEventId = await ensureEventExists();
    const targetStep = stepOverride ?? step;

    let state: OrganizerWizardState;
    if (targetStep === 0) {
      await organizerEventWizardService.updateBasicInfo(targetEventId, {
        title: basicInfo.title,
        shortDescription: basicInfo.shortDescription,
        fullDescription: basicInfo.fullDescription,
        ageRestriction: basicInfo.ageRestriction,
      });
      state = await organizerEventWizardService.updateCategories(targetEventId, {
        categoryIds,
      });
    } else if (targetStep === 1) {
      state = await organizerEventWizardService.updateImages(targetEventId, {
        images: images.map((image, index) => ({
          imageId: image.imageId,
          primary: image.primary,
          sortOrder: index,
        })),
      });
    } else if (targetStep === 2) {
      state = await organizerEventWizardService.updateArtists(targetEventId, {
        artists: hasArtists ? existingArtists.map((artist) => ({
          artistId: artist.artistId,
        })) : [],
      });
    } else if (targetStep === 3) {
      state = await organizerEventWizardService.updateSessions(targetEventId, {
        sessions: sessions.map((session) => ({
          id: session.id,
          sessionTitle: session.sessionTitle || undefined,
          startsAt: session.startsAt,
          endsAt: session.endsAt || undefined,
          venueId: session.locationMode === 'venue' ? toNumber(session.venueId) : undefined,
          manualAddress: session.locationMode === 'manual' ? session.manualAddress : undefined,
          cityId: session.locationMode === 'manual' ? toNumber(session.cityId) : undefined,
          cityName: session.locationMode === 'manual' ? session.cityName || undefined : undefined,
          cityRegion: session.locationMode === 'manual' ? session.cityRegion || undefined : undefined,
          latitude: session.locationMode === 'manual' ? toNumber(session.latitude) : undefined,
          longitude: session.locationMode === 'manual' ? toNumber(session.longitude) : undefined,
          seatLimit: toNumber(session.seatLimit),
        })),
      });
    } else if (targetStep === 4) {
      state = await organizerEventWizardService.updateTickets(targetEventId, {
        freeEvent: isFreeEvent,
        sessionTickets: isFreeEvent ? [] : sessions
          .filter((session) => session.id)
          .map((session) => ({
            sessionId: Number(session.id),
            ticketTypes: session.ticketTypes.map((ticketType) => ({
              id: ticketType.id,
              name: ticketType.name,
              price: Number(ticketType.price),
              quota: Number(ticketType.quota),
              salesStartAt: ticketType.salesStartAt || undefined,
              salesEndAt: ticketType.salesEndAt || undefined,
            })),
          })),
      });
    } else {
      state = await organizerEventWizardService.preview(targetEventId);
    }

    applyWizardState(state);
    if (!silent) {
      toast.success('Данные шага сохранены');
    }
  }, [
    ensureEventExists,
    step,
    basicInfo,
    categoryIds,
    images,
    existingArtists,
    sessions,
    hasArtists,
    isFreeEvent,
    applyWizardState,
  ]);

  const saveAllStepsForSubmit = useCallback(async () => {
    for (let idx = 0; idx <= 4; idx += 1) {
      const stepIndex = idx as StepIndex;
      const validationError = validateStep(stepIndex);
      if (validationError) {
        setStep(stepIndex);
        throw new Error(validationError);
      }
      await saveCurrentStep(true, stepIndex);
    }
  }, [saveCurrentStep, validateStep]);

  const onNext = async () => {
    const validationError = validateStep(step);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setSaving(true);
    try {
      await saveCurrentStep();
      setStep((prev) => Math.min(prev + 1, 5) as StepIndex);
    } catch (error: any) {
      toast.error(error?.message || 'Не удалось сохранить шаг');
    } finally {
      setSaving(false);
      setDirty(false);
    }
  };

  const onPrev = () => setStep((prev) => Math.max(prev - 1, 0) as StepIndex);

  const saveDraftNow = async () => {
    setSaving(true);
    try {
      const targetEventId = await ensureEventExists();
      if (step <= 4) {
        await saveCurrentStep(true);
      }
      const state = await organizerEventWizardService.saveDraft(targetEventId);
      applyWizardState(state);
      toast.success('Черновик сохранен');
    } catch (error: any) {
      toast.error(error?.message || 'Не удалось сохранить черновик');
    } finally {
      setSaving(false);
      setDirty(false);
    }
  };

  const submitForModeration = async () => {
    setSaving(true);
    try {
      const targetEventId = await ensureEventExists();
      await saveAllStepsForSubmit();
      await organizerEventWizardService.preview(targetEventId);
      const state = await organizerEventWizardService.submit(targetEventId);
      applyWizardState(state);
      toast.success('Мероприятие отправлено на модерацию');
      navigate('/organizer/events');
    } catch (error: any) {
      toast.error(error?.message || 'Не удалось отправить на модерацию');
    } finally {
      setSaving(false);
      setDirty(false);
    }
  };

  const goToStep = async (nextStep: StepIndex) => {
    if (nextStep === step) return;

    if (nextStep > step && step <= 4) {
      const validationError = validateStep(step);
      if (validationError) {
        toast.error(validationError);
        return;
      }

      setSaving(true);
      try {
        await saveCurrentStep(true);
        setStep(nextStep);
        setDirty(false);
      } catch (error: any) {
        toast.error(error?.message || 'Не удалось сохранить шаг перед переходом');
      } finally {
        setSaving(false);
      }
      return;
    }

    setStep(nextStep);
  };

  const updateBasicField = (field: keyof BasicInfoForm, value: string) => {
    setBasicInfo((prev) => ({ ...prev, [field]: value }));
    markDirty();
  };

  const toggleCategory = (categoryId: number) => {
    setCategoryIds((prev) => (
      prev.includes(categoryId)
        ? prev.filter((idValue) => idValue !== categoryId)
        : [...prev, categoryId]
    ));
    markDirty();
  };

  const uploadImages = async (fileList: FileList | null) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;

    setSaving(true);
    try {
      const uploads = await Promise.all(files.map((file) => fileUploadService.uploadImage(file)));
      setImages((prev) => {
        const next = [...prev];
        uploads.forEach((upload) => {
          if (next.some((image) => image.imageId === upload.imageId)) return;
          next.push({
            imageId: upload.imageId,
            primary: next.length === 0,
            sortOrder: next.length,
          });
        });
        if (!next.some((image) => image.primary) && next.length > 0) {
          next[0].primary = true;
        }
        return next.map((image, index) => ({ ...image, sortOrder: index }));
      });
      markDirty();
      toast.success(`Загружено изображений: ${uploads.length}`);
    } catch {
      toast.error('Ошибка загрузки изображений');
    } finally {
      setSaving(false);
    }
  };

  const setPrimaryImage = (imageId: number) => {
    setImages((prev) => prev.map((image) => ({ ...image, primary: image.imageId === imageId })));
    markDirty();
  };

  const removeImage = (imageId: number) => {
    setImages((prev) => {
      const next = prev.filter((item) => item.imageId !== imageId);
      if (!next.some((item) => item.primary) && next.length > 0) next[0].primary = true;
      return next.map((item, order) => ({ ...item, sortOrder: order }));
    });
    markDirty();
  };

  const toggleExistingArtist = (artistId: number, checked: boolean) => {
    setExistingArtists((prev) => {
      if (checked) {
        if (prev.some((artist) => artist.artistId === artistId)) return prev;
        return [...prev, { artistId }];
      }
      return prev.filter((artist) => artist.artistId !== artistId);
    });
    markDirty();
  };

  const toggleArtistsMode = (enabled: boolean) => {
    setHasArtists(enabled);
    if (!enabled) {
      setExistingArtists([]);
    }
    markDirty();
  };

  const changeSessionLocationMode = (localId: string, mode: 'venue' | 'manual') => {
    setSessions((prev) => prev.map((session) => {
      if (session.localId !== localId) {
        return session;
      }
      if (mode === 'venue') {
        return {
          ...session,
          locationMode: 'venue',
          cityId: '',
          cityName: '',
          cityRegion: '',
        };
      }
      return {
        ...session,
        locationMode: 'manual',
        venueId: '',
      };
    }));
    markDirty();
  };

  const toggleFreeEvent = (free: boolean) => {
    setIsFreeEvent(free);
    markDirty();
  };

  const addSession = () => {
    const newSession = defaultSessionDraft();
    setSessions((prev) => [...prev, newSession]);
    setExpandedSessionLocalId(newSession.localId);
    markDirty();
  };

  const updateSession = (localId: string, patch: Partial<SessionDraft>) => {
    setSessions((prev) => prev.map((session) => (
      session.localId === localId
        ? {
          ...session,
          ...patch,
          ticketTypes: (patch.startsAt && patch.startsAt !== session.startsAt)
            ? session.ticketTypes.map((ticketType) => (
              ticketType.salesEndAt
                ? ticketType
                : { ...ticketType, salesEndAt: patch.startsAt as string }
            ))
            : session.ticketTypes,
        }
        : session
    )));
    markDirty();
  };

  const removeSession = (localId: string) => {
    setSessions((prev) => {
      const next = prev.filter((session) => session.localId !== localId);
      const safeSessions = next.length ? next : [defaultSessionDraft()];
      setExpandedSessionLocalId((current) => {
        if (current && safeSessions.some((session) => session.localId === current)) {
          return current;
        }
        return safeSessions[safeSessions.length - 1].localId;
      });
      return safeSessions;
    });
    setAddressSuggestionsBySession((prev) => {
      const { [localId]: _, ...rest } = prev;
      return rest;
    });
    setMapOpenedBySession((prev) => {
      const { [localId]: _, ...rest } = prev;
      return rest;
    });
    markDirty();
  };

  const toggleSessionExpanded = (localId: string) => {
    setExpandedSessionLocalId((current) => (current === localId ? null : localId));
  };

  const resolveCityFromSuggestion = (suggestion: YandexAddressSuggestion): City | null => {
    if (!suggestion.cityName) {
      return null;
    }

    const byNameAndRegion = cities.find((city) => {
      if (normalize(String(city.name)) !== normalize(suggestion.cityName || '')) return false;
      if (!suggestion.region || !city.region) return true;
      return normalize(String(city.region)) === normalize(suggestion.region);
    });

    if (byNameAndRegion) return byNameAndRegion;

    return cities.find((city) => normalize(String(city.name)) === normalize(suggestion.cityName || '')) || null;
  };

  const onSessionVenueChange = (session: SessionDraft, venueIdValue: string) => {
    const selectedVenue = venues.find((venue) => String(venue.id) === venueIdValue);
    if (!selectedVenue) {
      updateSession(session.localId, { venueId: '', locationMode: 'venue' });
      return;
    }

    updateSession(session.localId, {
      locationMode: 'venue',
      venueId: venueIdValue,
      manualAddress: selectedVenue.address,
      latitude: selectedVenue.latitude == null ? '' : String(selectedVenue.latitude),
      longitude: selectedVenue.longitude == null ? '' : String(selectedVenue.longitude),
      cityId: selectedVenue.cityId == null ? '' : String(selectedVenue.cityId),
      cityName: selectedVenue.cityName || '',
      cityRegion: selectedVenue.city?.region || '',
    });

    setAddressSuggestionsBySession((prev) => ({ ...prev, [session.localId]: [] }));
  };

  const scheduleAddressLookup = (session: SessionDraft, query: string) => {
    if (addressSearchTimeoutRef.current[session.localId]) {
      window.clearTimeout(addressSearchTimeoutRef.current[session.localId]);
    }

    if (!query.trim() || query.trim().length < 3) {
      setAddressSuggestionsBySession((prev) => ({ ...prev, [session.localId]: [] }));
      return;
    }

    addressSearchTimeoutRef.current[session.localId] = window.setTimeout(async () => {
      setAddressLoadingBySession((prev) => ({ ...prev, [session.localId]: true }));
      try {
        const suggestions = await yandexMapsService.searchAddressSuggestions(query, 6);
        setAddressSuggestionsBySession((prev) => ({ ...prev, [session.localId]: suggestions }));
      } catch {
        setAddressSuggestionsBySession((prev) => ({ ...prev, [session.localId]: [] }));
      } finally {
        setAddressLoadingBySession((prev) => ({ ...prev, [session.localId]: false }));
      }
    }, 350);
  };

  const onManualAddressChange = (session: SessionDraft, value: string) => {
    updateSession(session.localId, {
      locationMode: 'manual',
      venueId: '',
      manualAddress: value,
      cityId: '',
      cityName: '',
      cityRegion: '',
    });
    scheduleAddressLookup(session, value);
  };

  const selectAddressSuggestion = (session: SessionDraft, suggestion: YandexAddressSuggestion) => {
    const city = resolveCityFromSuggestion(suggestion);

    updateSession(session.localId, {
      venueId: '',
      manualAddress: suggestion.address,
      latitude: suggestion.latitude.toFixed(6),
      longitude: suggestion.longitude.toFixed(6),
      cityId: city?.id ? String(city.id) : '',
      cityName: suggestion.cityName || city?.name || '',
      cityRegion: suggestion.region || city?.region || '',
    });

    setAddressSuggestionsBySession((prev) => ({ ...prev, [session.localId]: [] }));
  };

  const onMapPick = async (session: SessionDraft, latitude: number, longitude: number) => {
    updateSession(session.localId, {
      locationMode: 'manual',
      venueId: '',
      latitude: latitude.toFixed(6),
      longitude: longitude.toFixed(6),
    });

    try {
      const reverse = await yandexMapsService.reverseGeocode(latitude, longitude);
      if (!reverse) return;
      const city = resolveCityFromSuggestion(reverse);
      updateSession(session.localId, {
        locationMode: 'manual',
        venueId: '',
        manualAddress: reverse.address,
        cityId: city?.id ? String(city.id) : '',
        cityName: reverse.cityName || city?.name || '',
        cityRegion: reverse.region || city?.region || '',
      });
    } catch {
      // ignore reverse geocoding errors
    }
  };

  const addTicketType = (sessionLocalId: string) => {
    setSessions((prev) => prev.map((session) => {
      if (session.localId !== sessionLocalId) return session;
      const seatLimit = getSessionSeatLimit(session);
      const usedQuota = getSessionTicketQuotaTotal(session);
      const remaining = seatLimit == null ? null : seatLimit - usedQuota;

      if (remaining != null && remaining <= 0) {
        toast.error('Лимит мест сеанса уже полностью распределен по билетам');
        return session;
      }

      const defaultQuota = remaining == null ? '100' : String(remaining);
      return { ...session, ticketTypes: [...session.ticketTypes, defaultTicketType(session.startsAt, defaultQuota)] };
    }));
    markDirty();
  };

  const updateTicketType = (sessionLocalId: string, index: number, patch: Partial<TicketTypeDraft>) => {
    setSessions((prev) => prev.map((session) => {
      if (session.localId !== sessionLocalId) return session;

      let nextPatch = patch;
      const seatLimit = getSessionSeatLimit(session);
      if (seatLimit != null && patch.quota !== undefined) {
        const desiredQuota = safePositiveInt(patch.quota);
        if (desiredQuota != null) {
          const sumOther = session.ticketTypes.reduce((sum, ticketType, ticketIndex) => {
            if (ticketIndex === index) return sum;
            const quota = safePositiveInt(ticketType.quota);
            return sum + (quota ?? 0);
          }, 0);
          const allowedForCurrent = seatLimit - sumOther;
          if (allowedForCurrent <= 0) {
            toast.error('Для этого сеанса не осталось свободных мест в квотах');
            return session;
          }
          if (desiredQuota > allowedForCurrent) {
            nextPatch = { ...patch, quota: String(allowedForCurrent) };
            toast.error(`Можно указать не больше ${allowedForCurrent} мест для этого типа билета`);
          }
        }
      }

      return {
        ...session,
        ticketTypes: session.ticketTypes.map((ticketType, ticketIndex) => (
          ticketIndex === index ? { ...ticketType, ...nextPatch } : ticketType
        )),
      };
    }));
    markDirty();
  };

  const removeTicketType = (sessionLocalId: string, index: number) => {
    setSessions((prev) => prev.map((session) => {
      if (session.localId !== sessionLocalId) return session;
      const ticketTypes = session.ticketTypes.filter((_, ticketIndex) => ticketIndex !== index);
      return { ...session, ticketTypes: ticketTypes.length ? ticketTypes : [defaultTicketType(session.startsAt)] };
    }));
    markDirty();
  };

  const refreshPreview = async () => {
    const targetEventId = await ensureEventExists();
    const state = await organizerEventWizardService.preview(targetEventId);
    applyWizardState(state);
  };

  if (loading) return <LoadingState />;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <section className="space-y-2">
        <Link to="/organizer/events" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" />
          К списку мероприятий
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-3xl text-foreground sm:text-4xl">Мастер создания мероприятия</h1>
            <p className="text-muted-foreground">Пошаговое заполнение: информация, фото, сеансы и билеты</p>
          </div>

          <div className="text-right text-sm text-muted-foreground">
            <p>{autoSaving ? 'Автосохранение...' : dirty ? 'Есть несохраненные изменения' : 'Все изменения сохранены'}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-3 shadow-card sm:p-5">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
          {WIZARD_STEPS.map((label, index) => {
            const isActive = step === index;
            const isDone = step > index;
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  void goToStep(index as StepIndex);
                }}
                className={`rounded-xl border px-3 py-2 text-left transition-colors ${
                  isActive
                    ? 'border-primary bg-primary/10 text-primary'
                    : isDone
                      ? 'border-primary/30 bg-primary/5 text-foreground'
                      : 'border-border bg-muted/40 text-muted-foreground'
                }`}
              >
                <p className="text-[11px] font-semibold">Шаг {index + 1}</p>
                <p className="text-xs font-medium leading-tight">{label}</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-7">
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="font-heading text-2xl">Шаг 1. Основная информация и категории</h2>

            <div>
              <Label>Название *</Label>
              <Input value={basicInfo.title} onChange={(event) => updateBasicField('title', event.target.value)} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label>Краткое описание</Label>
                <Textarea rows={3} value={basicInfo.shortDescription} onChange={(event) => updateBasicField('shortDescription', event.target.value)} />
              </div>

              <div>
                <Label>Возрастное ограничение</Label>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={basicInfo.ageRestriction}
                  onChange={(event) => updateBasicField('ageRestriction', event.target.value)}
                >
                  {AGE_OPTIONS.map((option) => (
                    <option key={option || 'none'} value={option}>{option || 'Не указано'}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label>Полное описание</Label>
              <Textarea rows={6} value={basicInfo.fullDescription} onChange={(event) => updateBasicField('fullDescription', event.target.value)} />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Категории *</p>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => {
                  const active = categoryIds.includes(Number(category.id));
                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => toggleCategory(Number(category.id))}
                      className={`rounded-full border px-3 py-1.5 text-sm ${active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-foreground'}`}
                    >
                      {category.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-heading text-2xl">Шаг 2. Фотографии</h2>
            <p className="text-sm text-muted-foreground">Порядок фотографий задается порядком загрузки. Главное фото выбирается одним кликом.</p>

            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold">
              <Upload className="h-4 w-4" />
              Загрузить фото
              <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => uploadImages(event.target.files)} />
            </label>

            {images.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">Фото пока нет</div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {images.map((image) => (
                  <div key={image.imageId} className={`rounded-xl border p-3 ${image.primary ? 'border-primary' : 'border-border'}`}>
                    <img src={imageSrc(image.imageId)} alt="event" className="h-40 w-full rounded-lg object-cover" />
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <Button type="button" variant={image.primary ? 'default' : 'outline'} size="sm" onClick={() => setPrimaryImage(image.imageId)}>
                        <Star className="mr-1 h-4 w-4" />
                        {image.primary ? 'Главное фото' : 'Сделать главным'}
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => removeImage(image.imageId)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-heading text-2xl">Шаг 3. Артисты (необязательно)</h2>
            <p className="text-sm text-muted-foreground">Организатор может выбрать только существующих артистов. Новых артистов добавляет администратор.</p>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Будут ли у мероприятия артисты?</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant={hasArtists ? 'default' : 'outline'} onClick={() => toggleArtistsMode(true)}>Да, будут</Button>
                <Button type="button" variant={!hasArtists ? 'default' : 'outline'} onClick={() => toggleArtistsMode(false)}>Нет, без артистов</Button>
              </div>
            </div>

            {hasArtists ? (
              <div className="space-y-3 rounded-xl border border-border p-3">
                <Label>Поиск существующих артистов</Label>
                <Input value={artistSearch} onChange={(event) => setArtistSearch(event.target.value)} placeholder="Поиск по имени или сценическому имени" />

                {existingArtists.length > 0 && (
                  <div className="rounded-lg border border-border bg-muted/20 p-3">
                    <p className="mb-2 text-sm font-semibold">Выбрано артистов: {existingArtists.length}</p>
                    <div className="flex flex-wrap gap-2">
                      {existingArtists.map((selected) => {
                        const artist = artistsCatalog.find((item) => Number(item.id) === selected.artistId);
                        const label = artist?.stageName
                          ? `${artist.name} (${artist.stageName})`
                          : artist?.name || `Артист #${selected.artistId}`;
                        return (
                          <button
                            key={selected.artistId}
                            type="button"
                            onClick={() => toggleExistingArtist(selected.artistId, false)}
                            className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                            title="Убрать артиста"
                          >
                            {label} ×
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="max-h-72 space-y-2 overflow-auto">
                  {artistOptions.length === 0 && (
                    <p className="rounded-md border border-dashed border-border p-3 text-sm text-muted-foreground">
                      Артисты не найдены
                    </p>
                  )}
                  {artistOptions.map((artist) => {
                    const checked = existingArtists.some((item) => item.artistId === Number(artist.id));
                    return (
                      <div key={artist.id} className={`flex items-center justify-between rounded-lg border p-3 ${checked ? 'border-primary/40 bg-primary/5' : 'border-border'}`}>
                        <div>
                          <p className="text-sm font-semibold">{artist.name}</p>
                          {artist.stageName && <p className="text-xs text-muted-foreground">{artist.stageName}</p>}
                          {artist.genre && <p className="text-xs text-muted-foreground">{artist.genre}</p>}
                        </div>
                        <Button
                          type="button"
                          variant={checked ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleExistingArtist(Number(artist.id), !checked)}
                        >
                          {checked ? 'Выбран' : 'Добавить'}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Для этого мероприятия артисты не выбраны.
              </p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-2xl">Шаг 4. Сеансы</h2>
              <Button type="button" variant="outline" size="sm" onClick={addSession}>
                <Plus className="mr-1 h-4 w-4" /> Добавить сеанс
              </Button>
            </div>

            <p className="text-sm text-muted-foreground">
              Дата и время начала обязательны. Время окончания можно не заполнять, но если заполнено, оно должно быть позже начала.
            </p>

            <div className="space-y-4">
              {sessions.map((session, index) => {
                const suggestions = addressSuggestionsBySession[session.localId] || [];
                const showMap = Boolean(mapOpenedBySession[session.localId]);
                const selectedVenue = session.venueId
                  ? venues.find((venue) => String(venue.id) === session.venueId)
                  : undefined;
                const showManualMap = session.locationMode === 'manual' && showMap;
                const showVenueMap = session.locationMode === 'venue' && Boolean(selectedVenue);
                const isExpanded = expandedSessionLocalId === session.localId;

                return (
                  <div key={session.localId} className="rounded-xl border border-border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => toggleSessionExpanded(session.localId)}
                        className="text-sm font-semibold text-foreground hover:text-primary"
                      >
                        {isExpanded ? '▾' : '▸'} Сеанс {index + 1}
                      </button>
                      <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => removeSession(session.localId)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {!isExpanded && (
                      <div className="rounded-md border border-dashed border-border bg-muted/20 p-2 text-xs text-muted-foreground">
                        <p>{session.sessionTitle || 'Без названия'}</p>
                        <p>{session.startsAt ? session.startsAt.replace('T', ' ') : 'Дата не выбрана'}</p>
                        <p>{session.locationMode === 'venue'
                          ? selectedVenue?.address || 'Площадка не выбрана'
                          : session.manualAddress || 'Адрес не указан'}
                        </p>
                      </div>
                    )}

                    {isExpanded && (
                      <>
                    <div className="mb-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant={session.locationMode === 'venue' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => changeSessionLocationMode(session.localId, 'venue')}
                      >
                        Сеанс на площадке
                      </Button>
                      <Button
                        type="button"
                        variant={session.locationMode === 'manual' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => changeSessionLocationMode(session.localId, 'manual')}
                      >
                        Сеанс по адресу
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <Label>Название сеанса</Label>
                        <Input value={session.sessionTitle} onChange={(event) => updateSession(session.localId, { sessionTitle: event.target.value })} placeholder="Например: Вечерний показ" />
                      </div>
                      <div>
                        <Label>Дата и время начала *</Label>
                        <Input type="datetime-local" value={session.startsAt} onChange={(event) => updateSession(session.localId, { startsAt: event.target.value })} />
                      </div>
                      <div>
                        <Label>Дата и время окончания</Label>
                        <Input type="datetime-local" value={session.endsAt} onChange={(event) => updateSession(session.localId, { endsAt: event.target.value })} />
                      </div>

                      {session.locationMode === 'venue' ? (
                        <>
                          <div className="sm:col-span-2">
                            <Label>Площадка *</Label>
                            <select
                              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                              value={session.venueId}
                              onChange={(event) => onSessionVenueChange(session, event.target.value)}
                            >
                              <option value="">Выберите площадку</option>
                              {venues.map((venue) => (
                                <option key={venue.id} value={venue.id}>{venue.name} · {venue.address}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label>Лимит мест</Label>
                            <Input type="number" min={1} value={session.seatLimit} onChange={(event) => updateSession(session.localId, { seatLimit: event.target.value })} placeholder="Например: 200" />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="sm:col-span-2">
                            <Label>Адрес *</Label>
                            <Input
                              value={session.manualAddress}
                              onChange={(event) => onManualAddressChange(session, event.target.value)}
                              placeholder="Введите адрес или выберите точку на карте"
                            />
                          </div>
                          <div>
                            <Label>Лимит мест</Label>
                            <Input type="number" min={1} value={session.seatLimit} onChange={(event) => updateSession(session.localId, { seatLimit: event.target.value })} placeholder="Например: 200" />
                          </div>
                        </>
                      )}
                    </div>

                    {session.locationMode === 'manual' && addressLoadingBySession[session.localId] && (
                      <p className="mt-2 text-xs text-muted-foreground">Ищем подсказки адреса...</p>
                    )}

                    {session.locationMode === 'manual' && suggestions.length > 0 && (
                      <div className="mt-2 rounded-md border border-border bg-background">
                        {suggestions.map((suggestion) => (
                          <button
                            key={suggestion.id}
                            type="button"
                            onClick={() => selectAddressSuggestion(session, suggestion)}
                            className="block w-full border-b border-border px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted/40"
                          >
                            <p>{suggestion.address}</p>
                            <p className="text-xs text-muted-foreground">{suggestion.cityName || 'Город не определен'}{suggestion.region ? `, ${suggestion.region}` : ''}</p>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {session.locationMode === 'manual' && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setMapOpenedBySession((prev) => ({ ...prev, [session.localId]: !showMap }))}
                        >
                          {showMap ? 'Скрыть карту' : 'Выбрать точку на карте'}
                        </Button>
                      )}
                    </div>

                    {showManualMap && (
                      <div className="mt-3">
                        <LocationPickerMap
                          latitude={session.latitude ? Number(session.latitude) : undefined}
                          longitude={session.longitude ? Number(session.longitude) : undefined}
                          initialCenter={mapCenter}
                          onPick={(latitude, longitude) => onMapPick(session, latitude, longitude)}
                        />
                      </div>
                    )}

                    {showVenueMap && (
                      <div className="mt-3">
                        <p className="mb-2 text-xs text-muted-foreground">Адрес площадки: {selectedVenue?.address}</p>
                        <LocationPickerMap
                          latitude={selectedVenue?.latitude ?? undefined}
                          longitude={selectedVenue?.longitude ?? undefined}
                          initialCenter={mapCenter}
                          onPick={() => {}}
                        />
                      </div>
                    )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-heading text-2xl">Шаг 5. Билеты</h2>

            <div className="space-y-2">
              <p className="text-sm font-semibold">Мероприятие бесплатное?</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant={isFreeEvent ? 'default' : 'outline'} onClick={() => toggleFreeEvent(true)}>Да, бесплатное</Button>
                <Button type="button" variant={!isFreeEvent ? 'default' : 'outline'} onClick={() => toggleFreeEvent(false)}>Нет, платное</Button>
              </div>
            </div>

            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Сначала добавьте сеансы на шаге 4</p>
            ) : isFreeEvent ? (
              <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                Для бесплатного мероприятия типы билетов добавлять не нужно.
              </p>
            ) : sessions.map((session, sessionIndex) => {
              const seatLimit = getSessionSeatLimit(session);
              const totalQuota = getSessionTicketQuotaTotal(session);
              const remainingQuota = seatLimit == null ? null : seatLimit - totalQuota;

              return (
                <div key={session.localId} className="space-y-3 rounded-xl border border-border p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Сеанс {sessionIndex + 1} {session.startsAt ? `(${session.startsAt.replace('T', ' ')})` : ''}</p>
                    <Button type="button" variant="outline" size="sm" onClick={() => addTicketType(session.localId)}>
                      <Plus className="mr-1 h-4 w-4" /> Добавить тип билета
                    </Button>
                  </div>

                  <div className="rounded-lg border border-dashed border-border bg-muted/30 p-2 text-xs text-muted-foreground">
                    {seatLimit == null ? (
                      <p>Лимит мест сеанса не указан. Укажите лимит на шаге «Сеансы», чтобы контролировать сумму мест по билетам.</p>
                    ) : (
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <p>Лимит мест: <span className="font-semibold text-foreground">{seatLimit}</span></p>
                        <p>Распределено по билетам: <span className="font-semibold text-foreground">{totalQuota}</span></p>
                        <p className={remainingQuota != null && remainingQuota < 0 ? 'font-semibold text-destructive' : ''}>
                          Осталось: {remainingQuota}
                        </p>
                      </div>
                    )}
                  </div>

                  {session.ticketTypes.map((ticketType, ticketIndex) => {
                    const quotaUsedByOthers = session.ticketTypes.reduce((sum, item, idx) => {
                      if (idx === ticketIndex) return sum;
                      const quota = safePositiveInt(item.quota);
                      return sum + (quota ?? 0);
                    }, 0);
                    const maxForThisTicket = seatLimit == null ? undefined : Math.max(seatLimit - quotaUsedByOthers, 1);

                    return (
                      <div key={`${session.localId}-ticket-${ticketIndex}`} className="rounded-lg border border-border p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-sm font-medium">Тип билета {ticketIndex + 1}</p>
                          <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => removeTicketType(session.localId, ticketIndex)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          <div>
                            <Label>Название типа билета *</Label>
                            <Input value={ticketType.name} onChange={(event) => updateTicketType(session.localId, ticketIndex, { name: event.target.value })} placeholder="Например: Стандарт" />
                          </div>
                          <div>
                            <Label>Цена, RUB *</Label>
                            <Input type="number" min={0} value={ticketType.price} onChange={(event) => updateTicketType(session.localId, ticketIndex, { price: event.target.value })} placeholder="Например: 1200" />
                          </div>
                          <div>
                            <Label>Количество мест *</Label>
                            <Input
                              type="number"
                              min={1}
                              max={maxForThisTicket}
                              value={ticketType.quota}
                              onChange={(event) => updateTicketType(session.localId, ticketIndex, { quota: event.target.value })}
                              placeholder="Например: 150"
                            />
                            {maxForThisTicket != null && (
                              <p className="mt-1 text-xs text-muted-foreground">Максимум для этого типа: {maxForThisTicket}</p>
                            )}
                          </div>
                          <div>
                            <Label>Начало продаж</Label>
                            <Input type="datetime-local" value={ticketType.salesStartAt} onChange={(event) => updateTicketType(session.localId, ticketIndex, { salesStartAt: event.target.value })} />
                          </div>
                          <div>
                            <Label>Окончание продаж</Label>
                            <Input type="datetime-local" value={ticketType.salesEndAt} onChange={(event) => updateTicketType(session.localId, ticketIndex, { salesEndAt: event.target.value })} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-heading text-2xl">Шаг 6. Предпросмотр</h2>
                <p className="text-sm text-muted-foreground">
                  Проверьте, как мероприятие будет выглядеть перед отправкой на модерацию
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isFreeEvent ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                  {isFreeEvent ? 'Бесплатное' : 'Платное'}
                </span>
                <Button type="button" variant="outline" size="sm" onClick={async () => {
                  setSaving(true);
                  try {
                    await refreshPreview();
                    toast.success('Предпросмотр обновлен');
                  } catch {
                    toast.error('Не удалось обновить предпросмотр');
                  } finally {
                    setSaving(false);
                  }
                }}>
                  Обновить
                </Button>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <ImageIcon className="h-4 w-4" />
                <span>Галерея мероприятия</span>
              </div>
              {selectedPreviewImage ? (
                <>
                  <div className="overflow-hidden rounded-xl border border-border">
                    <img
                      src={imageSrc(selectedPreviewImage.imageId)}
                      alt={basicInfo.title || 'Изображение мероприятия'}
                      className="h-72 w-full object-cover"
                    />
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {orderedPreviewImages.map((image, index) => (
                      <button
                        key={`preview-image-${image.imageId}-${index}`}
                        type="button"
                        className={`relative h-20 w-28 flex-shrink-0 overflow-hidden rounded-lg border ${selectedPreviewImage.imageId === image.imageId ? 'border-primary ring-2 ring-primary/30' : 'border-border'}`}
                        onClick={() => setPreviewImageId(image.imageId)}
                      >
                        <img src={imageSrc(image.imageId)} alt={`Фото ${index + 1}`} className="h-full w-full object-cover" />
                        {image.primary && (
                          <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                            Главное
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground">
                  Фотографии еще не добавлены
                </div>
              )}
            </div>

            <div className="grid gap-4 xl:grid-cols-3">
              <div className="space-y-4 xl:col-span-2">
                <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
                  <h3 className="font-heading text-xl">{basicInfo.title || 'Без названия'}</h3>

                  <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                    <p className="inline-flex items-center gap-2"><Building2 className="h-4 w-4" /> {wizardState?.organizationName || organizations[0]?.name || 'Организация не выбрана'}</p>
                    <p className="inline-flex items-center gap-2"><MapPin className="h-4 w-4" /> {wizardState?.cityName || 'Город будет определен по сеансам'}</p>
                    <p className="inline-flex items-center gap-2"><Tag className="h-4 w-4" /> Возраст: {basicInfo.ageRestriction || 'не указано'}</p>
                    <p className="inline-flex items-center gap-2"><Users className="h-4 w-4" /> Артистов: {previewTotals.artistsCount}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Короткое описание</p>
                    <p className="rounded-lg bg-muted/40 p-3 text-sm">{basicInfo.shortDescription || 'Не заполнено'}</p>
                  </div>

                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Полное описание</p>
                    <p className="rounded-lg bg-muted/40 p-3 text-sm whitespace-pre-line">{basicInfo.fullDescription || 'Не заполнено'}</p>
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
                  <p className="text-sm font-semibold">Категории</p>
                  {selectedCategories.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedCategories.map((category) => (
                        <span key={`preview-category-${category.id}`} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                          {category.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Категории не выбраны</p>
                  )}
                </div>

                <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
                  <p className="text-sm font-semibold">Артисты</p>
                  {selectedArtistsDetailed.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {selectedArtistsDetailed.map((artist) => (
                        <div key={`preview-artist-${artist.id}`} className="rounded-lg border border-border bg-muted/30 p-2">
                          <p className="text-sm font-semibold">{artist.name}</p>
                          <p className="text-xs text-muted-foreground">{artist.stageName || artist.genre || 'Информация об артисте'}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Артисты не добавлены</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                  <p className="mb-3 text-sm font-semibold">Краткая сводка</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded-lg bg-muted/40 p-2">
                      <p className="text-xs text-muted-foreground">Фотографий</p>
                      <p className="font-semibold">{orderedPreviewImages.length}</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-2">
                      <p className="text-xs text-muted-foreground">Сеансов</p>
                      <p className="font-semibold">{previewTotals.sessionsCount}</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-2">
                      <p className="text-xs text-muted-foreground">Типов билетов</p>
                      <p className="font-semibold">{isFreeEvent ? 'Авто' : previewTotals.ticketTypesCount}</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-2">
                      <p className="text-xs text-muted-foreground">Категорий</p>
                      <p className="font-semibold">{selectedCategories.length}</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-2">
                      <p className="text-xs text-muted-foreground">Лимит мест</p>
                      <p className="font-semibold">{previewTotals.seatLimitTotal > 0 ? previewTotals.seatLimitTotal : '—'}</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-2">
                      <p className="text-xs text-muted-foreground">Количество билетов</p>
                      <p className="font-semibold">{isFreeEvent ? 'Авто' : previewTotals.ticketQuotaTotal}</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4 shadow-card">
                  <p className="mb-2 text-sm font-semibold">Цены</p>
                  {isFreeEvent ? (
                    <p className="rounded-lg bg-emerald-100 p-2 text-sm font-semibold text-emerald-800">
                      Бесплатное мероприятие
                    </p>
                  ) : previewPriceStats.min != null && previewPriceStats.max != null ? (
                    <div className="space-y-1 rounded-lg bg-muted/40 p-2 text-sm">
                      <p>Минимальная цена: <span className="font-semibold">{formatMoney(previewPriceStats.min)} ₽</span></p>
                      <p>Максимальная цена: <span className="font-semibold">{formatMoney(previewPriceStats.max)} ₽</span></p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Цены будут рассчитаны после добавления билетов</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
              <p className="text-sm font-semibold">Сеансы и билеты</p>
              {sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Сеансы пока не добавлены</p>
              ) : sessions.map((session, index) => {
                const seatLimit = getSessionSeatLimit(session);
                const totalQuota = getSessionTicketQuotaTotal(session);
                const remaining = seatLimit == null ? null : seatLimit - totalQuota;

                return (
                  <div key={session.localId} className="space-y-2 rounded-xl border border-border bg-muted/20 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold">Сеанс #{index + 1}: {session.sessionTitle || 'Без названия'}</p>
                      <p className="text-xs text-muted-foreground">{session.locationMode === 'venue' ? 'На площадке' : 'По адресу'}</p>
                    </div>

                    <div className="grid gap-1 text-sm text-muted-foreground sm:grid-cols-2">
                      <p className="inline-flex items-center gap-2"><CalendarDays className="h-4 w-4" /> {formatDateTime(session.startsAt)}</p>
                      <p className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" /> До {formatDateTime(session.endsAt)}</p>
                      <p className="sm:col-span-2 inline-flex items-center gap-2"><MapPin className="h-4 w-4" /> {session.manualAddress || 'Адрес не указан'}</p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full bg-muted px-2.5 py-1">Лимит: {seatLimit ?? '—'}</span>
                      <span className="rounded-full bg-muted px-2.5 py-1">Количество билетов: {isFreeEvent ? 'Авто' : totalQuota}</span>
                      {remaining != null && (
                        <span className={`rounded-full px-2.5 py-1 ${remaining < 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted'}`}>
                          Осталось: {remaining}
                        </span>
                      )}
                    </div>

                    {!isFreeEvent && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Типы билетов</p>
                        {session.ticketTypes.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Типы билетов не добавлены</p>
                        ) : (
                          <div className="space-y-1">
                            {session.ticketTypes.map((ticketType, ticketIndex) => (
                              <div key={`${session.localId}-preview-ticket-${ticketIndex}`} className="grid gap-1 rounded-md border border-border bg-background p-2 text-sm sm:grid-cols-5">
                                <p className="font-medium sm:col-span-2">{ticketType.name || `Тип ${ticketIndex + 1}`}</p>
                                <p className="inline-flex items-center gap-1"><Ticket className="h-3.5 w-3.5" /> {formatMoney(Number(ticketType.price || 0))} ₽</p>
                                <p>Количество: {ticketType.quota || '—'}</p>
                                <p className="text-xs text-muted-foreground">{formatDateTime(ticketType.salesStartAt)} - {formatDateTime(ticketType.salesEndAt)}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-card">
              <p className="text-sm font-semibold">Результат валидации</p>
              {(wizardState?.validationIssues || []).length === 0 ? (
                <p className="inline-flex items-center gap-2 rounded-lg bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800">
                  <CheckCircle2 className="h-4 w-4" />
                  Обязательные требования выполнены
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                    Найдены проблемы перед отправкой на модерацию
                  </p>
                  {validationIssuesByStep.map(([stepCode, issues]) => (
                    <div key={`issues-${stepCode}`} className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                      <p className="mb-1 text-sm font-semibold">{WIZARD_STEP_LABELS[stepCode] || stepCode}</p>
                      <div className="space-y-1">
                        {(issues || []).map((issue) => (
                          <p key={`${issue.code}-${issue.step}`} className="text-sm text-destructive">
                            • {issue.message}
                          </p>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={saveDraftNow} disabled={saving}>
                Сохранить как черновик
              </Button>
              <Button type="button" onClick={submitForModeration} disabled={saving}>
                Отправить на модерацию
              </Button>
            </div>
          </div>
        )}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
        <Button type="button" variant="ghost" onClick={() => navigate('/organizer/events')}>Отмена</Button>

        <div className="flex items-center gap-2">
          {step > 0 && (
            <Button type="button" variant="outline" onClick={onPrev} disabled={saving}>Назад</Button>
          )}

          {step < 5 && (
            <Button type="button" onClick={onNext} disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Далее
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

import type {
  Category,
  City,
  Event,
  Favorite,
  Organization,
  OrganizerEventStats,
  OrganizerOverview,
  Publication,
  Registration,
  Review,
  Session,
  User,
  UserRole,
  Venue,
} from '@/types';

type RoleCollection = string[] | Set<string> | null | undefined;

export interface BackendAuthResponse {
  token: string;
  user: BackendCurrentUser;
}

export interface BackendCurrentUser {
  id: number;
  login: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatarUrl?: string | null;
  roles?: string[] | null;
  organization?: BackendOrganizationInfo | null;
}

export interface BackendOrganizationInfo {
  id: number;
  name: string;
  description?: string | null;
  contacts?: string | null;
}

export interface BackendAdminUser {
  id: number;
  login: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  roles?: string[] | null;
  active: boolean;
}

export interface BackendCategory {
  id: number;
  name: string;
  description?: string | null;
}

export interface BackendCity {
  id: number;
  name: string;
  region?: string | null;
  country?: string | null;
}

export interface BackendVenue {
  id: number;
  name: string;
  address: string;
  contacts?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capacity?: number | null;
  cityId?: number | null;
  cityName?: string | null;
}

export interface BackendEventImage {
  imageUrl?: string | null;
  isCover?: boolean | null;
  sortOrder?: number | null;
}

export interface BackendEventShort {
  id: number;
  title: string;
  shortDescription?: string | null;
  createdAt?: string | null;
  status?: string | null;
  venueId?: number | null;
  venueName?: string | null;
  venueAddress?: string | null;
  cityId?: number | null;
  cityName?: string | null;
  organizationId?: number | null;
  organizationName?: string | null;
  categories?: BackendCategory[] | null;
  nextSessionAt?: string | null;
  sessionDates?: string[] | null;
  coverUrl?: string | null;
}

export interface BackendEventDetails {
  id: number;
  title: string;
  shortDescription?: string | null;
  fullDescription?: string | null;
  createdAt?: string | null;
  status?: string | null;
  coverUrl?: string | null;
  eventImages?: BackendEventImage[] | null;
  venue?: BackendVenue | null;
  categories?: BackendCategory[] | null;
  organization?: {
    id: number;
    name: string;
    description?: string | null;
    contacts?: string | null;
  } | null;
}

export interface BackendSessionShort {
  id: number;
  startAt: string;
  endAt: string;
  eventId?: number | null;
  eventTitle?: string | null;
  venueId?: number | null;
  venueName?: string | null;
  venueAddress?: string | null;
  cityName?: string | null;
  availableSeats?: number | null;
  totalCapacity?: number | null;
}

export interface BackendSessionDetails {
  id: number;
  startAt: string;
  endAt: string;
  availableSeats?: number | null;
  totalCapacity?: number | null;
  event?: {
    id: number;
    title: string;
  } | null;
  venue?: {
    id: number;
    name: string;
    address: string;
    cityName?: string | null;
    capacity?: number | null;
  } | null;
}

export interface BackendFavorite {
  eventId: number;
  title: string;
  shortDescription?: string | null;
  coverUrl?: string | null;
}

export interface BackendReview {
  reviewId: number;
  userId: number;
  userDisplayName?: string | null;
  rating: number;
  text?: string | null;
  createdAt?: string | null;
  eventId?: number | null;
}

export interface BackendRegistration {
  registrationId: number;
  sessionId: number;
  eventId?: number | null;
  eventTitle?: string | null;
  sessionTitle?: string | null;
  venueName?: string | null;
  startAt?: string | null;
  quantity?: number | null;
  status?: string | null;
  createdAt?: string | null;
}

export interface BackendSessionRegistration {
  registrationId: number;
  userId: number;
  userFullName?: string | null;
  quantity?: number | null;
  status?: string | null;
  createdAt?: string | null;
}

export interface BackendPublicationShort {
  publicationId: number;
  title: string;
  preview?: string | null;
  createdAt?: string | null;
  status?: string | null;
  authorName?: string | null;
  imageUrl?: string | null;
  organizationId?: number | null;
  organizationName?: string | null;
  eventId?: number | null;
  eventTitle?: string | null;
  eventImageUrl?: string | null;
}

export interface BackendPublicationDetails {
  publicationId: number;
  title: string;
  content: string;
  imageUrl?: string | null;
  createdAt?: string | null;
  status?: string | null;
  authorName?: string | null;
  authorId?: number | null;
  organizationId?: number | null;
  organizationName?: string | null;
  eventId?: number | null;
  eventTitle?: string | null;
  eventImageUrl?: string | null;
}

export interface BackendOrganizerAnalyticsOverview {
  kpi?: {
    registrations?: number | null;
    averageRating?: number | null;
  } | null;
}

export interface BackendOrganizerEventEngagement {
  eventId: number;
  eventTitle: string;
  registrationsCount?: number | null;
  cancellationsCount?: number | null;
  activeParticipants?: number | null;
  sessionsCount?: number | null;
  reviewsCount?: number | null;
  averageRating?: number | null;
}

export interface BackendOrganizerEventStats {
  eventId: number;
  registrationsCount?: number | null;
  cancellationsCount?: number | null;
  sessions?: Array<unknown> | null;
}

export interface BackendOrganizationPublic {
  id: number;
  name: string;
  description?: string | null;
  contacts?: string | null;
}

const CATEGORY_ICONS: Record<string, string> = {
  'Музыка': '🎵',
  'Театр': '🎭',
  'Выставка': '🖼️',
  'Городской праздник': '🎉',
  'Образование': '🎓',
  'Детям': '👨‍👩‍👧‍👦',
  'Гастрономия': '🍽️',
  'Кино': '🎬',
  'Спорт': '⚽',
  'Литература': '📚',
};

function toId(value: number | string | null | undefined): string {
  return value == null ? '' : String(value);
}

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-');
}

function splitDisplayName(displayName?: string | null): { firstName: string; lastName: string } {
  const parts = (displayName || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || 'Пользователь',
    lastName: parts.slice(1).join(' '),
  };
}

function resolvePrimaryRole(roles: RoleCollection): UserRole {
  const normalized = new Set(
    Array.from(roles || []).map((role) => role.replace(/^ROLE_/, '').toUpperCase()),
  );

  if (normalized.has('ADMIN')) {
    return 'ADMIN';
  }
  if (normalized.has('ORGANIZER')) {
    return 'ORGANIZER';
  }
  return 'RESIDENT';
}

function mapEventStatus(status?: string | null): Event['status'] {
  switch (status) {
    case 'PUBLISHED':
      return 'PUBLISHED';
    case 'REJECTED':
      return 'REJECTED';
    case 'ARCHIVED':
      return 'CANCELLED';
    case 'PENDING_APPROVAL':
    default:
      return 'PENDING';
  }
}

export function toBackendEventStatus(status?: Event['status']): string | undefined {
  switch (status) {
    case 'PUBLISHED':
      return 'PUBLISHED';
    case 'REJECTED':
      return 'REJECTED';
    case 'CANCELLED':
      return 'ARCHIVED';
    case 'DRAFT':
    case 'PENDING':
      return 'PENDING_APPROVAL';
    default:
      return undefined;
  }
}

function mapPublicationStatus(status?: string | null): Publication['status'] {
  switch (status) {
    case 'PUBLISHED':
      return 'PUBLISHED';
    case 'REJECTED':
      return 'REJECTED';
    case 'PENDING':
    default:
      return 'PENDING';
  }
}

export function toBackendPublicationStatus(status: Publication['status']): string {
  switch (status) {
    case 'PUBLISHED':
      return 'PUBLISHED';
    case 'REJECTED':
      return 'REJECTED';
    case 'DRAFT':
    case 'PENDING':
    default:
      return 'PENDING';
  }
}

function mapRegistrationStatus(status?: string | null): Registration['status'] {
  switch (status) {
    case 'CANCELLED':
      return 'CANCELLED';
    case 'ATTENDED':
      return 'ATTENDED';
    case 'CREATED':
    default:
      return 'CONFIRMED';
  }
}

function buildMinimalVenue(name?: string | null, address?: string | null, cityId?: string, cityName?: string | null): Venue {
  return {
    id: '',
    name: name || '',
    address: address || '',
    cityId: cityId || '',
    city: cityName ? { id: cityId || '', name: cityName } : undefined,
  };
}

function buildMinimalEvent(data: {
  id?: string;
  title?: string | null;
  shortDescription?: string | null;
  coverUrl?: string | null;
  venueName?: string | null;
}): Event {
  return {
    id: data.id || '',
    title: data.title || '',
    description: data.shortDescription || '',
    shortDescription: data.shortDescription || '',
    imageUrl: data.coverUrl || '',
    categoryId: '',
    categories: [],
    venueId: '',
    venue: buildMinimalVenue(data.venueName),
    cityId: '',
    organizationId: '',
    organizerId: '',
    format: 'OFFLINE',
    status: 'PUBLISHED',
    startDate: '',
    endDate: '',
    isFree: true,
    tags: [],
    createdAt: '',
    updatedAt: '',
  };
}

function buildExcerpt(content?: string | null, fallback?: string | null): string {
  if (fallback && fallback.trim()) {
    return fallback.trim();
  }
  const normalized = (content || '').replace(/\s+/g, ' ').trim();
  return normalized.length > 160 ? `${normalized.slice(0, 157)}...` : normalized;
}

function toOrganization(
  dto?: {
    id: number;
    name: string;
    description?: string | null;
    contacts?: string | null;
  } | null,
): Organization | undefined {
  if (!dto) {
    return undefined;
  }

  return {
    id: toId(dto.id),
    name: dto.name,
    description: dto.description || undefined,
    contacts: dto.contacts || undefined,
  };
}

export function mapCurrentUser(dto: BackendCurrentUser, active = true): User {
  return {
    id: toId(dto.id),
    email: dto.email,
    firstName: dto.firstName || '',
    lastName: dto.lastName || '',
    role: resolvePrimaryRole(dto.roles),
    avatarUrl: dto.avatarUrl || undefined,
    phone: dto.phone || undefined,
    organization: toOrganization(dto.organization),
    active,
    createdAt: '',
  };
}

export function mapOrganizationPublic(dto: BackendOrganizationPublic): Organization {
  return {
    id: toId(dto.id),
    name: dto.name,
    description: dto.description || undefined,
    contacts: dto.contacts || undefined,
  };
}

export function mapAdminUser(dto: BackendAdminUser): User {
  return {
    id: toId(dto.id),
    email: dto.email,
    firstName: dto.firstName || dto.login || '',
    lastName: dto.lastName || '',
    phone: dto.phone || undefined,
    role: resolvePrimaryRole(dto.roles),
    active: dto.active,
    createdAt: '',
  };
}

export function mapCategory(dto: BackendCategory): Category {
  return {
    id: toId(dto.id),
    name: dto.name,
    slug: slugify(dto.name),
    icon: CATEGORY_ICONS[dto.name] || '🎪',
  };
}

export function mapCity(dto: BackendCity): City {
  return {
    id: toId(dto.id),
    name: dto.name,
    region: dto.region || undefined,
    country: dto.country || undefined,
  };
}

export function mapVenue(dto: BackendVenue): Venue {
  const cityId = toId(dto.cityId);

  return {
    id: toId(dto.id),
    name: dto.name,
    address: dto.address,
    cityId,
    capacity: dto.capacity || undefined,
    description: dto.contacts || undefined,
    latitude: dto.latitude == null ? undefined : Number(dto.latitude),
    longitude: dto.longitude == null ? undefined : Number(dto.longitude),
    city: dto.cityName ? { id: cityId, name: dto.cityName } : undefined,
  };
}

function resolveEventRange(sessionDates: string[], fallback?: string | null): { startDate: string; endDate: string } {
  const dates = sessionDates.filter(Boolean).slice().sort();
  const startDate = dates[0] || fallback || '';
  const endDate = dates[dates.length - 1] || startDate;
  return { startDate, endDate };
}

export function mapSession(dto: BackendSessionShort | BackendSessionDetails): Session {
  const totalCapacity = dto.totalCapacity || 0;
  const availableSeats = dto.availableSeats || 0;
  const startAt = dto.startAt || '';
  const endAt = dto.endAt || startAt;
  const eventId = 'eventId' in dto ? toId(dto.eventId) : toId(dto.event?.id);

  return {
    id: toId(dto.id),
    eventId,
    date: startAt.slice(0, 10),
    startTime: startAt.slice(11, 16),
    endTime: endAt.slice(11, 16),
    maxParticipants: totalCapacity,
    currentParticipants: Math.max(totalCapacity - availableSeats, 0),
    location: 'venueName' in dto ? dto.venueName || undefined : dto.venue?.name || undefined,
  };
}

export function mapEventShort(dto: BackendEventShort): Event {
  const categories = (dto.categories || []).map(mapCategory);
  const category = categories[0];
  const cityId = toId(dto.cityId);
  const organizationId = toId(dto.organizationId);
  const organization = dto.organizationName
    ? { id: organizationId, name: dto.organizationName }
    : undefined;
  const venue = dto.venueId || dto.venueName
    ? buildMinimalVenue(dto.venueName, dto.venueAddress, cityId, dto.cityName)
    : undefined;
  const range = resolveEventRange(dto.sessionDates || [], dto.nextSessionAt || dto.createdAt);

  return {
    id: toId(dto.id),
    title: dto.title,
    description: dto.shortDescription || '',
    shortDescription: dto.shortDescription || '',
    imageUrl: dto.coverUrl || '',
    categoryId: category?.id || '',
    category,
    categories,
    venueId: toId(dto.venueId),
    venue,
    cityId,
    city: dto.cityName ? { id: cityId, name: dto.cityName } : venue?.city,
    organizationId,
    organization,
    organizerId: organizationId,
    format: 'OFFLINE',
    status: mapEventStatus(dto.status),
    startDate: range.startDate,
    endDate: range.endDate,
    isFree: true,
    tags: [],
    createdAt: dto.createdAt || range.startDate,
    updatedAt: dto.createdAt || range.endDate,
    sessionsCount: dto.sessionDates?.length || 0,
  };
}

export function mapEventDetails(dto: BackendEventDetails, sessions: Session[] = []): Event {
  const categories = (dto.categories || []).map(mapCategory);
  const category = categories[0];
  const venue = dto.venue ? mapVenue(dto.venue) : undefined;
  const mappedImageUrls = (dto.eventImages || [])
    .map((item) => item?.imageUrl || '')
    .filter(Boolean);
  const imageUrls = mappedImageUrls.length > 0
    ? mappedImageUrls
    : dto.coverUrl ? [dto.coverUrl] : [];
  const sessionDates = sessions
    .map((session) => `${session.date}T${session.startTime}:00`)
    .filter(Boolean)
    .sort();
  const range = resolveEventRange(sessionDates, dto.createdAt);
  const organization = dto.organization
    ? {
        id: toId(dto.organization.id),
        name: dto.organization.name,
        description: dto.organization.description || undefined,
        contacts: dto.organization.contacts || undefined,
      }
    : undefined;

  return {
    id: toId(dto.id),
    title: dto.title,
    description: dto.fullDescription || dto.shortDescription || '',
    shortDescription: dto.shortDescription || '',
    imageUrl: dto.coverUrl || '',
    imageUrls,
    categoryId: category?.id || '',
    category,
    categories,
    venueId: venue?.id || '',
    venue,
    cityId: venue?.cityId || '',
    city: venue?.city,
    organizationId: toId(dto.organization?.id),
    organization,
    organizerId: toId(dto.organization?.id),
    format: 'OFFLINE',
    status: mapEventStatus(dto.status),
    startDate: range.startDate,
    endDate: range.endDate,
    isFree: true,
    tags: [],
    createdAt: dto.createdAt || range.startDate,
    updatedAt: dto.createdAt || range.endDate,
    sessionsCount: sessions.length,
  };
}

export function mapFavorite(dto: BackendFavorite): Favorite {
  return {
    id: toId(dto.eventId),
    userId: '',
    eventId: toId(dto.eventId),
    event: buildMinimalEvent({
      id: toId(dto.eventId),
      title: dto.title,
      shortDescription: dto.shortDescription,
      coverUrl: dto.coverUrl,
    }),
    createdAt: '',
  };
}

export function mapReview(dto: BackendReview): Review {
  const name = splitDisplayName(dto.userDisplayName);

  return {
    id: toId(dto.reviewId),
    userId: toId(dto.userId),
    user: {
      id: toId(dto.userId),
      email: '',
      firstName: name.firstName,
      lastName: name.lastName,
      role: 'RESIDENT',
      active: true,
      createdAt: '',
    },
    eventId: toId(dto.eventId),
    rating: dto.rating,
    comment: dto.text || '',
    status: 'APPROVED',
    createdAt: dto.createdAt || '',
    updatedAt: dto.createdAt || '',
  };
}

export function mapRegistration(dto: BackendRegistration): Registration {
  const startAt = dto.startAt || '';
  const session: Session = {
    id: toId(dto.sessionId),
    eventId: toId(dto.eventId),
    date: startAt.slice(0, 10),
    startTime: startAt.slice(11, 16),
    endTime: startAt.slice(11, 16),
    maxParticipants: dto.quantity || 1,
    currentParticipants: dto.quantity || 1,
  };

  return {
    id: toId(dto.registrationId),
    userId: '',
    sessionId: toId(dto.sessionId),
    session,
    eventId: toId(dto.eventId),
    event: buildMinimalEvent({
      id: toId(dto.eventId),
      title: dto.eventTitle,
      venueName: dto.venueName,
    }),
    status: mapRegistrationStatus(dto.status),
    createdAt: dto.createdAt || '',
  };
}

export function mapSessionRegistration(dto: BackendSessionRegistration, session: Session, eventId: string): Registration {
  const name = splitDisplayName(dto.userFullName);

  return {
    id: toId(dto.registrationId),
    userId: toId(dto.userId),
    user: {
      id: toId(dto.userId),
      email: '',
      firstName: name.firstName,
      lastName: name.lastName,
      role: 'RESIDENT',
      active: true,
      createdAt: '',
    },
    sessionId: session.id,
    session,
    eventId,
    status: mapRegistrationStatus(dto.status),
    createdAt: dto.createdAt || '',
  };
}

export function mapPublicationShort(dto: BackendPublicationShort): Publication {
  const name = splitDisplayName(dto.authorName);
  const organizationId = toId(dto.organizationId);
  const organization = dto.organizationName
    ? { id: organizationId, name: dto.organizationName }
    : undefined;

  return {
    id: toId(dto.publicationId),
    title: dto.title,
    content: '',
    excerpt: buildExcerpt(null, dto.preview),
    imageUrl: dto.imageUrl || '',
    authorId: '',
    author: dto.authorName
      ? {
          id: '',
          email: '',
          firstName: name.firstName,
          lastName: name.lastName,
          role: 'ORGANIZER',
          active: true,
          createdAt: '',
        }
      : undefined,
    organizationId,
    organization,
    eventId: toId(dto.eventId),
    eventTitle: dto.eventTitle || undefined,
    eventImageUrl: dto.eventImageUrl || undefined,
    status: mapPublicationStatus(dto.status),
    publishedAt: dto.status === 'PUBLISHED' ? dto.createdAt || undefined : undefined,
    createdAt: dto.createdAt || '',
    updatedAt: dto.createdAt || '',
    tags: [],
  };
}

export function mapPublicationDetails(dto: BackendPublicationDetails): Publication {
  const name = splitDisplayName(dto.authorName);
  const organizationId = toId(dto.organizationId);
  const organization = dto.organizationName
    ? { id: organizationId, name: dto.organizationName }
    : undefined;

  return {
    id: toId(dto.publicationId),
    title: dto.title,
    content: dto.content,
    excerpt: buildExcerpt(dto.content),
    imageUrl: dto.imageUrl || '',
    authorId: toId(dto.authorId),
    author: dto.authorName
      ? {
          id: toId(dto.authorId),
          email: '',
          firstName: name.firstName,
          lastName: name.lastName,
          role: 'ORGANIZER',
          active: true,
          createdAt: '',
        }
      : undefined,
    organizationId,
    organization,
    eventId: toId(dto.eventId),
    eventTitle: dto.eventTitle || undefined,
    eventImageUrl: dto.eventImageUrl || undefined,
    status: mapPublicationStatus(dto.status),
    publishedAt: dto.status === 'PUBLISHED' ? dto.createdAt || undefined : undefined,
    createdAt: dto.createdAt || '',
    updatedAt: dto.createdAt || '',
    tags: [],
  };
}

export function mapOrganizerOverview(
  events: Event[],
  analytics: BackendOrganizerAnalyticsOverview,
  engagements: BackendOrganizerEventEngagement[],
): OrganizerOverview {
  return {
    totalEvents: events.length,
    totalRegistrations: Number(analytics.kpi?.registrations || 0),
    averageRating: Number(analytics.kpi?.averageRating || 0),
    upcomingEvents: events.filter((event) => event.startDate && new Date(event.startDate) > new Date()).length,
    recentRegistrations: [],
    topEvents: engagements
      .sort((left, right) => Number(right.registrationsCount || 0) - Number(left.registrationsCount || 0))
      .slice(0, 3)
      .map((engagement) => ({
        eventId: toId(engagement.eventId),
        eventTitle: engagement.eventTitle,
        totalRegistrations: Number(engagement.registrationsCount || 0),
        totalAttended: Number(engagement.activeParticipants || 0),
        totalCancelled: Number(engagement.cancellationsCount || 0),
        averageRating: Number(engagement.averageRating || 0),
        reviewsCount: Number(engagement.reviewsCount || 0),
        sessionsCount: Number(engagement.sessionsCount || 0),
      })),
  };
}

export function mapOrganizerEventStats(
  stats: BackendOrganizerEventStats,
  engagement: BackendOrganizerEventEngagement,
): OrganizerEventStats {
  return {
    eventId: toId(engagement.eventId || stats.eventId),
    eventTitle: engagement.eventTitle,
    totalRegistrations: Number(engagement.registrationsCount || stats.registrationsCount || 0),
    totalAttended: Number(engagement.activeParticipants || 0),
    totalCancelled: Number(engagement.cancellationsCount || stats.cancellationsCount || 0),
    averageRating: Number(engagement.averageRating || 0),
    reviewsCount: Number(engagement.reviewsCount || 0),
    sessionsCount: Number(engagement.sessionsCount || stats.sessions?.length || 0),
  };
}

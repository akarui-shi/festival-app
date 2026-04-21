export type UserRole = 'RESIDENT' | 'ORGANIZER' | 'ADMIN';
export type Id = string | number;
export type EventStatus = 'PENDING_APPROVAL' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED' | 'DRAFT' | 'PENDING' | 'CANCELLED';

export interface CurrentUserOrganization {
  id: number;
  name: string;
  description?: string | null;
  contacts?: string | null;
}

export interface User {
  id: Id;
  login: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  avatarImageId?: number | null;
  roles?: string[] | null;
  role?: UserRole;
  organization?: CurrentUserOrganization | null;
  active?: boolean;
  createdAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
  companyName?: string;
  organizationId?: Id;
  joinRequestMessage?: string;
}

export interface Category {
  id: Id;
  name: string;
  description?: string | null;
  icon?: string;
}

export interface City {
  id: Id;
  name: string;
  region?: string | null;
  country?: string | null;
  active?: boolean | null;
}

export interface Organization {
  id: Id;
  name: string;
  description?: string | null;
  contacts?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  website?: string | null;
  socialLinks?: string | null;
  logoImageId?: number | null;
}

export interface Artist {
  id: Id;
  name: string;
  stageName?: string | null;
  description?: string | null;
  genre?: string | null;
  imageId?: number | null;
  imageIds?: number[] | null;
  primaryImageId?: number | null;
  events?: Event[] | null;
}

export interface Venue {
  id: Id;
  name: string;
  address: string;
  contacts?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capacity?: number | null;
  cityId?: Id | null;
  cityName?: string | null;
  city?: City;
  description?: string;
}

export interface EventImage {
  imageId?: number | null;
  isCover?: boolean | null;
  sortOrder?: number | null;
}

export interface Event {
  id: Id;
  title: string;
  shortDescription?: string | null;
  fullDescription?: string | null;
  ageRating?: number | null;
  createdAt?: string | null;
  status?: string | null;
  moderationStatus?: string | null;
  organizationId?: Id | null;
  organizationName?: string | null;
  venueId?: Id | null;
  venueName?: string | null;
  venueAddress?: string | null;
  cityId?: Id | null;
  cityName?: string | null;
  categories?: Category[] | null;
  nextSessionAt?: string | null;
  sessionDates?: string[] | null;
  coverImageId?: number | null;
  free?: boolean | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  registrationOpen?: boolean | null;
  artists?: Artist[] | null;
  sessions?: Session[] | null;
  eventImages?: EventImage[] | null;
  organization?: Organization | null;
  venue?: Venue | null;
  categoryId?: Id;
  category?: Category;
  city?: City;
  organizerId?: Id;
  format?: 'OFFLINE' | 'ONLINE' | 'HYBRID';
  startDate?: string;
  endDate?: string;
  description?: string;
  isFree?: boolean;
  price?: number;
  tags?: string[];
  updatedAt?: string;
  sessionsCount?: number;
  registrationsCount?: number;
  averageRating?: number;
  reviewsCount?: number;
}

export interface Session {
  id: Id;
  startAt: string;
  endAt: string;
  availableSeats?: number | null;
  totalCapacity?: number | null;
  participationType?: 'free' | 'paid' | string | null;
  price?: number | null;
  currency?: string | null;
  registrationOpen?: boolean | null;
  salesStartAt?: string | null;
  salesEndAt?: string | null;
  eventId?: Id | null;
  eventTitle?: string | null;
  venueId?: Id | null;
  venueName?: string | null;
  venueAddress?: string | null;
  cityName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  event?: {
    id: number;
    title: string;
    organizationId?: number | null;
    organizationName?: string | null;
  } | null;
  venue?: {
    id?: number | null;
    name?: string | null;
    address?: string | null;
    cityName?: string | null;
    capacity?: number | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  date?: string;
  startTime?: string;
  endTime?: string;
  maxParticipants?: number;
  currentParticipants?: number;
  location?: string;
}

export interface SessionTicketType {
  id: Id;
  name: string;
  price?: number | null;
  currency?: string | null;
  quota?: number | null;
  availableQuota?: number | null;
  registrationOpen?: boolean | null;
  salesStartAt?: string | null;
  salesEndAt?: string | null;
}

export interface SessionRegistration {
  registrationId: Id;
  userId?: Id | null;
  userFullName?: string | null;
  quantity?: number | null;
  status?: string | null;
  qrToken?: string | null;
  createdAt?: string | null;
}

export interface Favorite {
  id?: Id;
  userId?: Id;
  eventId: Id;
  title: string;
  shortDescription?: string | null;
  coverImageId?: number | null;
  ageRating?: number | null;
  status?: string | null;
  event?: Event;
  createdAt?: string;
}

export interface Review {
  commentId: Id;
  eventId?: Id | null;
  userId?: Id | null;
  userDisplayName?: string | null;
  text?: string | null;
  rating?: number | null;
  moderationStatus?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  id?: Id;
  user?: User;
  comment?: string;
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | string;
}

export interface OrderTicket {
  ticketId: Id;
  sessionId?: Id | null;
  status?: string | null;
  qrToken?: string | null;
  issuedAt?: string | null;
  usedAt?: string | null;
}

export interface OrderItem {
  itemId: Id;
  ticketTypeId?: Id | null;
  ticketTypeName?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  lineTotal?: number | null;
  tickets?: OrderTicket[] | null;
}

export interface Order {
  orderId: Id;
  eventId?: Id | null;
  eventTitle?: string | null;
  status?: string | null;
  totalAmount?: number | null;
  currency?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  requiresPayment?: boolean;
  paymentStatus?: string | null;
  paymentProvider?: string | null;
  paymentUrl?: string | null;
  items?: OrderItem[] | null;
}

export interface Ticket {
  ticketId: Id;
  orderId?: Id | null;
  eventId?: Id | null;
  eventTitle?: string | null;
  sessionId?: Id | null;
  sessionTitle?: string | null;
  status?: string | null;
  qrToken?: string | null;
  issuedAt?: string | null;
  usedAt?: string | null;
  requiresPayment?: boolean | null;
  paymentStatus?: string | null;
  paymentUrl?: string | null;
}

export interface Registration {
  id?: Id;
  registrationId?: Id;
  userId?: Id;
  user?: User;
  userFullName?: string | null;
  sessionId?: Id;
  session?: Session;
  eventId?: Id;
  event?: Event;
  status?: string;
  createdAt?: string | null;
  ticketId?: Id;
  orderId?: Id;
  eventTitle?: string | null;
  sessionTitle?: string | null;
  qrToken?: string | null;
  issuedAt?: string | null;
}

export type PublicationStatus = 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'DELETED';

export interface Publication {
  publicationId: Id;
  title: string;
  preview?: string | null;
  content?: string | null;
  imageId?: number | null;
  imageIds?: number[] | null;
  createdAt?: string | null;
  publishedAt?: string | null;
  status?: PublicationStatus | string | null;
  moderationStatus?: string | null;
  authorName?: string | null;
  authorId?: Id | null;
  organizationId?: Id | null;
  organizationName?: string | null;
  eventId?: Id | null;
  eventTitle?: string | null;
  eventImageId?: number | null;
  id?: Id;
  excerpt?: string;
  author?: User;
  organization?: Organization;
  tags?: string[];
  createdAtRaw?: string | null;
  updatedAt?: string | null;
}

export interface OrganizerAnalyticsOverview {
  fromDate?: string | null;
  toDate?: string | null;
  kpi?: {
    pageViews?: number | null;
    uniqueVisitors?: number | null;
    registrations?: number | null;
    activeParticipants?: number | null;
    favorites?: number | null;
    averageRating?: number | null;
  } | null;
  visitsByDay?: Array<{
    date?: string | null;
    value?: number | null;
  }> | null;
  registrationsByDay?: Array<{
    date?: string | null;
    value?: number | null;
  }> | null;
  trafficSources?: Array<{
    source?: string | null;
    visits?: number | null;
    sharePercent?: number | null;
  }> | null;
  metrika?: {
    enabled?: boolean;
    configured?: boolean;
    available?: boolean;
    message?: string | null;
    warnings?: string[] | null;
  } | null;
}

export interface OrganizerEventEngagement {
  eventId: Id;
  eventTitle: string;
  eventPath?: string | null;
  registrationsCount?: number | null;
  cancellationsCount?: number | null;
  activeRegistrations?: number | null;
  activeParticipants?: number | null;
  sessionsCount?: number | null;
  averageSessionOccupancyPercent?: number | null;
  favoritesCount?: number | null;
  reviewsCount?: number | null;
  averageRating?: number | null;
}

export interface OrganizerEventStats {
  eventId: Id;
  registrationsCount?: number | null;
  cancellationsCount?: number | null;
  occupiedSeats?: number | null;
  totalCapacity?: number | null;
  occupancyPercent?: number | null;
  sessions?: Array<{
    sessionId: Id;
    startAt?: string | null;
    endAt?: string | null;
    capacity?: number | null;
    occupiedSeats?: number | null;
    occupancyPercent?: number | null;
  }> | null;
}

export interface OrganizerOverview {
  totalEvents: number;
  totalRegistrations: number;
  averageRating: number;
  upcomingEvents: number;
  recentRegistrations: Array<SessionRegistration | Ticket>;
  topEvents: Array<{
    eventId: Id;
    eventTitle: string;
    totalRegistrations: number;
    totalAttended: number;
    totalCancelled: number;
    averageRating: number;
    reviewsCount: number;
    sessionsCount: number;
  }>;
}

export interface OrganizerOverviewBundle {
  events: Event[];
  overview: OrganizerAnalyticsOverview;
  engagements: OrganizerEventEngagement[];
}

export interface OrganizerEventStatsBundle {
  stats: OrganizerEventStats;
  engagement: OrganizerEventEngagement;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface EventFilters {
  categoryId?: Id;
  cityId?: Id;
  format?: 'OFFLINE' | 'ONLINE' | 'HYBRID';
  startDate?: string;
  endDate?: string;
  search?: string;
  participationType?: 'free' | 'paid' | string;
  priceFrom?: number;
  priceTo?: number;
  registrationOpen?: boolean;
  status?: string;
  page?: number;
  size?: number;
}

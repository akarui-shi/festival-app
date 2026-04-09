export type UserRole = 'RESIDENT' | 'ORGANIZER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
  active: boolean;
  createdAt: string;
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
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

export interface City {
  id: string;
  name: string;
  region?: string;
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  cityId: string;
  city?: City;
  capacity?: number;
  description?: string;
}

export type EventStatus = 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'REJECTED' | 'CANCELLED';
export type EventFormat = 'OFFLINE' | 'ONLINE' | 'HYBRID';

export interface Event {
  id: string;
  title: string;
  description: string;
  shortDescription: string;
  imageUrl: string;
  categoryId: string;
  category?: Category;
  venueId: string;
  venue?: Venue;
  cityId: string;
  city?: City;
  organizerId: string;
  organizer?: User;
  format: EventFormat;
  status: EventStatus;
  startDate: string;
  endDate: string;
  price?: number;
  isFree: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  sessionsCount?: number;
  registrationsCount?: number;
  averageRating?: number;
  reviewsCount?: number;
}

export interface Session {
  id: string;
  eventId: string;
  event?: Event;
  date: string;
  startTime: string;
  endTime: string;
  maxParticipants: number;
  currentParticipants: number;
  location?: string;
}

export interface Registration {
  id: string;
  userId: string;
  user?: User;
  sessionId: string;
  session?: Session;
  eventId: string;
  event?: Event;
  status: 'CONFIRMED' | 'CANCELLED' | 'ATTENDED';
  createdAt: string;
}

export interface Favorite {
  id: string;
  userId: string;
  eventId: string;
  event?: Event;
  createdAt: string;
}

export interface Review {
  id: string;
  userId: string;
  user?: User;
  eventId: string;
  event?: Event;
  rating: number;
  comment: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
}

export type PublicationStatus = 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'REJECTED';

export interface Publication {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  imageUrl: string;
  authorId: string;
  author?: User;
  status: PublicationStatus;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface OrganizerEventStats {
  eventId: string;
  eventTitle: string;
  totalRegistrations: number;
  totalAttended: number;
  totalCancelled: number;
  averageRating: number;
  reviewsCount: number;
  sessionsCount: number;
}

export interface OrganizerOverview {
  totalEvents: number;
  totalRegistrations: number;
  averageRating: number;
  upcomingEvents: number;
  recentRegistrations: Registration[];
  topEvents: OrganizerEventStats[];
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface EventFilters {
  categoryId?: string;
  cityId?: string;
  format?: EventFormat;
  startDate?: string;
  endDate?: string;
  search?: string;
  status?: EventStatus;
  page?: number;
  size?: number;
}

import type { Event, EventFilters, Id, Organization, PaginatedResponse } from '@/types';
import { apiDelete, apiGet, apiPatch, apiPost, apiPut, getAuthToken } from './api-client';

interface EventImagePayload {
  imageId: number;
  isCover?: boolean;
  sortOrder?: number;
}

export interface EventUpsertPayload extends Partial<Event> {
  categoryIds?: Array<number | string>;
  venueAddress?: string;
  venueLatitude?: number;
  venueLongitude?: number;
  venueCityId?: number;
  venueCityName?: string;
  venueRegion?: string;
  venueCountry?: string;
  venueName?: string;
  venueContacts?: string;
  venueCapacity?: number;
  eventImages?: EventImagePayload[];
  artistIds?: Array<number | string>;
  newArtistNames?: string[];
}

function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function buildEventPayload(data: EventUpsertPayload) {
  const categoryIds = (data.categoryIds && data.categoryIds.length > 0
    ? data.categoryIds
    : data.categories?.length ? data.categories.map((category) => category.id) : [])
    .map(toNumber)
    .filter((value): value is number => value !== undefined);

  const artistIds = (data.artistIds && data.artistIds.length > 0
    ? data.artistIds
    : data.artists?.length ? data.artists.map((artist) => artist.id) : [])
    .map(toNumber)
    .filter((value): value is number => value !== undefined);

  return {
    title: data.title,
    shortDescription: data.shortDescription || undefined,
    fullDescription: data.description || undefined,
    venueId: toNumber(data.venueId),
    venueAddress: data.venueAddress || undefined,
    venueLatitude: toNumber(data.venueLatitude),
    venueLongitude: toNumber(data.venueLongitude),
    venueCityId: toNumber(data.venueCityId),
    venueCityName: data.venueCityName || undefined,
    venueRegion: data.venueRegion || undefined,
    venueCountry: data.venueCountry || undefined,
    venueName: data.venueName || undefined,
    venueContacts: data.venueContacts || undefined,
    venueCapacity: toNumber(data.venueCapacity),
    eventImages: data.eventImages?.length ? data.eventImages : undefined,
    categoryIds: categoryIds.length ? categoryIds : undefined,
    artistIds: artistIds.length ? artistIds : undefined,
    newArtistNames: data.newArtistNames?.length ? data.newArtistNames : undefined,
  };
}

export const eventService = {
  async getEvents(filters?: EventFilters): Promise<PaginatedResponse<Event>> {
    const response = await apiGet<Event[]>('/events', {
      title: filters?.search,
      q: filters?.search,
      categoryId: filters?.categoryId,
      cityId: filters?.cityId,
      dateFrom: filters?.startDate,
      dateTo: filters?.endDate,
      participationType: filters?.participationType,
      priceFrom: filters?.priceFrom,
      priceTo: filters?.priceTo,
      registrationOpen: filters?.registrationOpen,
      status: filters?.status,
    });

    const events = response;

    const page = filters?.page || 0;
    const size = filters?.size || 12;
    const start = page * size;

    return {
      content: events.slice(start, start + size),
      totalElements: events.length,
      totalPages: Math.max(Math.ceil(events.length / size), 1),
      page,
      size,
    };
  },

  async getEventById(id: Id): Promise<Event> {
    try {
      return await apiGet<Event>(`/events/${id}`);
    } catch (error) {
      if (!getAuthToken()) {
        throw error;
      }

      return apiGet<Event>(`/organizer/events/${id}`);
    }
  },

  async getRecommendations(cityId?: number | string): Promise<Event[]> {
    return apiGet<Event[]>('/events/recommendations', { limit: 8, ...(cityId ? { cityId } : {}) });
  },

  async getSimilarEvents(id: Id, limit = 4): Promise<Event[]> {
    return apiGet<Event[]>(`/events/${id}/similar`, { limit });
  },

  async getPlatformStats(): Promise<{ totalEvents: number; totalRegistrations: number; totalCities: number }> {
    return apiGet('/events/platform-stats');
  },

  async createEvent(data: EventUpsertPayload): Promise<Event> {
    return apiPost<Event>('/events', buildEventPayload(data));
  },

  async updateEvent(id: Id, data: EventUpsertPayload): Promise<Event> {
    if (data.status && Object.keys(data).length === 1) {
      return apiPatch<Event>(`/admin/events/${id}/status`, {
        status: data.status,
      });
    }

    return apiPut<Event>(`/events/${id}`, buildEventPayload(data));
  },

  async deleteEvent(id: Id): Promise<void> {
    await apiDelete(`/events/${id}`);
  },

  async getAllEvents(): Promise<Event[]> {
    return apiGet<Event[]>('/admin/events');
  },

  async getOrganizerEvents(_organizerId: Id): Promise<Event[]> {
    return apiGet<Event[]>('/organizer/events');
  },

  async getOrganizationById(organizationId: Id): Promise<Organization> {
    return apiGet<Organization>(`/events/organizations/${organizationId}`);
  },

  async getOrganizationEvents(organizationId: Id): Promise<Event[]> {
    return apiGet<Event[]>(`/events/organizations/${organizationId}/events`);
  },

  async followOrganization(organizationId: Id): Promise<{ following: boolean; followersCount: number }> {
    return apiPost(`/organizations/${organizationId}/follow`, {});
  },

  async unfollowOrganization(organizationId: Id): Promise<{ following: boolean; followersCount: number }> {
    return apiDelete(`/organizations/${organizationId}/follow`);
  },
};

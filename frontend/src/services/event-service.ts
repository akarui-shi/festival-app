import type { Event, EventFilters, PaginatedResponse } from '@/types';
import { apiDelete, apiGet, apiPatch, apiPost, apiPut, getAuthToken } from './api-client';
import type { BackendEventDetails, BackendEventShort, BackendSessionShort } from './api-mappers';
import { mapEventDetails, mapEventShort, mapSession, toBackendEventStatus } from './api-mappers';

interface EventImagePayload {
  imageUrl: string;
  isCover?: boolean;
  sortOrder?: number;
}

export interface EventUpsertPayload extends Partial<Event> {
  categoryIds?: Array<string | number>;
  venueAddress?: string;
  venueLatitude?: number;
  venueLongitude?: number;
  venueCityId?: string | number;
  venueCityName?: string;
  venueRegion?: string;
  venueCountry?: string;
  venueName?: string;
  venueContacts?: string;
  venueCapacity?: number;
  coverUrl?: string;
  eventImages?: EventImagePayload[];
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
    : data.categoryId ? [data.categoryId] : [])
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
    coverUrl: data.coverUrl || undefined,
    eventImages: data.eventImages?.length ? data.eventImages : undefined,
    categoryIds: categoryIds.length ? categoryIds : undefined,
  };
}

export const eventService = {
  async getEvents(filters?: EventFilters): Promise<PaginatedResponse<Event>> {
    const response = await apiGet<BackendEventShort[]>('/events', {
      title: filters?.search,
      categoryId: filters?.categoryId,
      cityId: filters?.cityId,
      dateFrom: filters?.startDate,
      dateTo: filters?.endDate,
      status: filters?.status ? toBackendEventStatus(filters.status) : undefined,
    });

    let events = response.map(mapEventShort);
    if (filters?.format) {
      events = events.filter((event) => event.format === filters.format);
    }

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

  async getEventById(id: string): Promise<Event> {
    const sessionsPromise = apiGet<BackendSessionShort[]>('/sessions', { eventId: id });

    try {
      const [eventResponse, sessionsResponse] = await Promise.all([
        apiGet<BackendEventDetails>(`/events/${id}`),
        sessionsPromise,
      ]);

      return mapEventDetails(eventResponse, sessionsResponse.map(mapSession));
    } catch (error) {
      if (!getAuthToken()) {
        throw error;
      }

      const [eventResponse, sessionsResponse] = await Promise.all([
        apiGet<BackendEventDetails>(`/organizer/events/${id}`),
        sessionsPromise,
      ]);

      return mapEventDetails(eventResponse, sessionsResponse.map(mapSession));
    }
  },

  async getRecommendations(): Promise<Event[]> {
    const response = await apiGet<BackendEventShort[]>('/events/recommendations', { limit: 4 });
    return response.map(mapEventShort);
  },

  async createEvent(data: EventUpsertPayload): Promise<Event> {
    const response = await apiPost<BackendEventShort>('/events', buildEventPayload(data));
    return mapEventShort(response);
  },

  async updateEvent(id: string, data: EventUpsertPayload): Promise<Event> {
    if (data.status && Object.keys(data).length === 1) {
      const response = await apiPatch<BackendEventShort>(`/admin/events/${id}/status`, {
        status: toBackendEventStatus(data.status),
      });
      return mapEventShort(response);
    }

    const response = await apiPut<BackendEventShort>(`/events/${id}`, buildEventPayload(data));
    return mapEventShort(response);
  },

  async deleteEvent(id: string): Promise<void> {
    await apiDelete(`/events/${id}`);
  },

  async getAllEvents(): Promise<Event[]> {
    const response = await apiGet<BackendEventShort[]>('/admin/events');
    return response.map(mapEventShort);
  },

  async getOrganizerEvents(_organizerId: string): Promise<Event[]> {
    const response = await apiGet<BackendEventShort[]>('/organizer/events');
    return response.map(mapEventShort);
  },
};

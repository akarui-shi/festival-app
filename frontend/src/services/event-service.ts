import type { Event, EventFilters, PaginatedResponse } from '@/types';
import { apiDelete, apiGet, apiPatch, apiPost, apiPut, getAuthToken } from './api-client';
import type { BackendEventDetails, BackendEventShort, BackendSessionShort } from './api-mappers';
import { mapEventDetails, mapEventShort, mapSession, toBackendEventStatus } from './api-mappers';

function buildEventPayload(data: Partial<Event>) {
  return {
    title: data.title,
    shortDescription: data.shortDescription || undefined,
    fullDescription: data.description || undefined,
    venueId: data.venueId ? Number(data.venueId) : undefined,
    categoryIds: data.categoryId ? [Number(data.categoryId)] : undefined,
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

  async createEvent(data: Partial<Event>): Promise<Event> {
    const response = await apiPost<BackendEventShort>('/events', buildEventPayload(data));
    return mapEventShort(response);
  },

  async updateEvent(id: string, data: Partial<Event>): Promise<Event> {
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

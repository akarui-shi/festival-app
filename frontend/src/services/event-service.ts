import type { Event, EventFilters, PaginatedResponse } from '@/types';
import { mockEvents } from '@/data/mock-data';

const delay = (ms = 300) => new Promise(r => setTimeout(r, ms));

export const eventService = {
  async getEvents(filters?: EventFilters): Promise<PaginatedResponse<Event>> {
    await delay();
    let events = mockEvents.filter(e => e.status === 'PUBLISHED');

    if (filters?.search) {
      const s = filters.search.toLowerCase();
      events = events.filter(e => e.title.toLowerCase().includes(s) || e.shortDescription.toLowerCase().includes(s));
    }
    if (filters?.categoryId) events = events.filter(e => e.categoryId === filters.categoryId);
    if (filters?.cityId) events = events.filter(e => e.cityId === filters.cityId);
    if (filters?.format) events = events.filter(e => e.format === filters.format);

    const page = filters?.page || 0;
    const size = filters?.size || 12;
    const start = page * size;
    return {
      content: events.slice(start, start + size),
      totalElements: events.length,
      totalPages: Math.ceil(events.length / size),
      page, size,
    };
  },

  async getEventById(id: string): Promise<Event> {
    await delay();
    const event = mockEvents.find(e => e.id === id);
    if (!event) throw new Error('Мероприятие не найдено');
    return event;
  },

  async getRecommendations(): Promise<Event[]> {
    await delay();
    return mockEvents.filter(e => e.status === 'PUBLISHED').slice(0, 4);
  },

  async createEvent(data: Partial<Event>): Promise<Event> {
    await delay();
    const event: Event = {
      id: `e${Date.now()}`, title: data.title || '', description: data.description || '',
      shortDescription: data.shortDescription || '', imageUrl: '', categoryId: data.categoryId || '',
      venueId: data.venueId || '', cityId: data.cityId || '', organizerId: data.organizerId || '',
      format: data.format || 'OFFLINE', status: 'DRAFT',
      startDate: data.startDate || '', endDate: data.endDate || '',
      isFree: data.isFree ?? true, price: data.price, tags: data.tags || [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      sessionsCount: 0, registrationsCount: 0, averageRating: 0, reviewsCount: 0,
    };
    mockEvents.push(event);
    return event;
  },

  async updateEvent(id: string, data: Partial<Event>): Promise<Event> {
    await delay();
    const idx = mockEvents.findIndex(e => e.id === id);
    if (idx === -1) throw new Error('Мероприятие не найдено');
    mockEvents[idx] = { ...mockEvents[idx], ...data, updatedAt: new Date().toISOString() };
    return mockEvents[idx];
  },

  async deleteEvent(id: string): Promise<void> {
    await delay();
    const idx = mockEvents.findIndex(e => e.id === id);
    if (idx !== -1) mockEvents.splice(idx, 1);
  },

  // Admin
  async getAllEvents(): Promise<Event[]> {
    await delay();
    return [...mockEvents];
  },

  // Organizer
  async getOrganizerEvents(organizerId: string): Promise<Event[]> {
    await delay();
    return mockEvents.filter(e => e.organizerId === organizerId);
  },
};

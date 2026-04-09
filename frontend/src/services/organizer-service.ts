import type { OrganizerOverview, OrganizerEventStats } from '@/types';
import { mockEvents, mockRegistrations, mockReviews, mockSessions } from '@/data/mock-data';

const delay = (ms = 300) => new Promise(r => setTimeout(r, ms));

export const organizerService = {
  async getOverview(organizerId: string): Promise<OrganizerOverview> {
    await delay();
    const events = mockEvents.filter(e => e.organizerId === organizerId);
    const eventIds = events.map(e => e.id);
    const registrations = mockRegistrations.filter(r => eventIds.includes(r.eventId));
    const reviews = mockReviews.filter(r => eventIds.includes(r.eventId));

    return {
      totalEvents: events.length,
      totalRegistrations: registrations.length,
      averageRating: reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0,
      upcomingEvents: events.filter(e => new Date(e.startDate) > new Date()).length,
      recentRegistrations: registrations.slice(-5).reverse(),
      topEvents: events.slice(0, 3).map(e => ({
        eventId: e.id, eventTitle: e.title,
        totalRegistrations: e.registrationsCount || 0,
        totalAttended: Math.floor((e.registrationsCount || 0) * 0.8),
        totalCancelled: Math.floor((e.registrationsCount || 0) * 0.05),
        averageRating: e.averageRating || 0,
        reviewsCount: e.reviewsCount || 0,
        sessionsCount: e.sessionsCount || 0,
      })),
    };
  },

  async getEventStats(eventId: string): Promise<OrganizerEventStats> {
    await delay();
    const event = mockEvents.find(e => e.id === eventId);
    if (!event) throw new Error('Мероприятие не найдено');
    const sessions = mockSessions.filter(s => s.eventId === eventId);
    const regs = mockRegistrations.filter(r => r.eventId === eventId);
    return {
      eventId, eventTitle: event.title,
      totalRegistrations: regs.length,
      totalAttended: regs.filter(r => r.status === 'ATTENDED').length,
      totalCancelled: regs.filter(r => r.status === 'CANCELLED').length,
      averageRating: event.averageRating || 0,
      reviewsCount: event.reviewsCount || 0,
      sessionsCount: sessions.length,
    };
  },
};

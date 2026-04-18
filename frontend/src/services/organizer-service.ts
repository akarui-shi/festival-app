import type {
  Event,
  Id,
  OrganizerAnalyticsOverview,
  OrganizerEventEngagement,
  OrganizerEventStats,
  OrganizerEventStatsBundle,
  OrganizerOverviewBundle,
} from '@/types';
import { apiGet } from './api-client';

export const organizerService = {
  async getOverview(_organizerId: Id): Promise<OrganizerOverviewBundle> {
    const [events, overview] = await Promise.all([
      apiGet<Event[]>('/organizer/events'),
      apiGet<OrganizerAnalyticsOverview>('/organizer/analytics/overview'),
    ]);

    const topCandidates = events.slice(0, 3);
    const engagements = await Promise.all(
      topCandidates.map((event) =>
        apiGet<OrganizerEventEngagement>(`/organizer/analytics/events/${event.id}/engagement`),
      ),
    );

    return { events, overview, engagements };
  },

  async getEventStats(eventId: Id): Promise<OrganizerEventStatsBundle> {
    const [stats, engagement] = await Promise.all([
      apiGet<OrganizerEventStats>(`/organizer/events/${eventId}/stats`),
      apiGet<OrganizerEventEngagement>(`/organizer/analytics/events/${eventId}/engagement`),
    ]);

    return { stats, engagement };
  },
};

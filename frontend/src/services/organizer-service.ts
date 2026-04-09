import type { OrganizerEventStats, OrganizerOverview } from '@/types';
import { apiGet } from './api-client';
import type {
  BackendEventShort,
  BackendOrganizerAnalyticsOverview,
  BackendOrganizerEventEngagement,
  BackendOrganizerEventStats,
} from './api-mappers';
import { mapEventShort, mapOrganizerEventStats, mapOrganizerOverview } from './api-mappers';

export const organizerService = {
  async getOverview(_organizerId: string): Promise<OrganizerOverview> {
    const [eventsResponse, overviewResponse] = await Promise.all([
      apiGet<BackendEventShort[]>('/organizer/events'),
      apiGet<BackendOrganizerAnalyticsOverview>('/organizer/analytics/overview'),
    ]);

    const events = eventsResponse.map(mapEventShort);
    const topCandidates = events.slice(0, 3);
    const engagements = await Promise.all(
      topCandidates.map((event) =>
        apiGet<BackendOrganizerEventEngagement>(`/organizer/analytics/events/${event.id}/engagement`),
      ),
    );

    return mapOrganizerOverview(events, overviewResponse, engagements);
  },

  async getEventStats(eventId: string): Promise<OrganizerEventStats> {
    const [statsResponse, engagementResponse] = await Promise.all([
      apiGet<BackendOrganizerEventStats>(`/organizer/events/${eventId}/stats`),
      apiGet<BackendOrganizerEventEngagement>(`/organizer/analytics/events/${eventId}/engagement`),
    ]);

    return mapOrganizerEventStats(statsResponse, engagementResponse);
  },
};

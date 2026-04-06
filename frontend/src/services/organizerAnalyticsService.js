import { apiClient } from './apiClient';

const buildQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    searchParams.append(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

export const organizerAnalyticsService = {
  getOverview(params = {}) {
    return apiClient.get(`/api/organizer/analytics/overview${buildQueryString(params)}`);
  },

  getEventAnalytics(eventId, params = {}) {
    return apiClient.get(`/api/organizer/analytics/events/${eventId}${buildQueryString(params)}`);
  },

  getEventTraffic(eventId, params = {}) {
    return apiClient.get(`/api/organizer/analytics/events/${eventId}/traffic${buildQueryString(params)}`);
  },

  getEventEngagement(eventId, params = {}) {
    return apiClient.get(`/api/organizer/analytics/events/${eventId}/engagement${buildQueryString(params)}`);
  }
};

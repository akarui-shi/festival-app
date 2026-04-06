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

export const eventService = {
  getEvents(params = {}) {
    return apiClient.get(`/api/events${buildQueryString(params)}`, { auth: false });
  },

  getEventById(id) {
    return apiClient.get(`/api/events/${id}`, { auth: false });
  },

  getOrganizationProfile(organizationId) {
    return apiClient.get(`/api/events/organizations/${organizationId}`, { auth: false });
  },

  getOrganizationEvents(organizationId) {
    return apiClient.get(`/api/events/organizations/${organizationId}/events`, { auth: false });
  },

  getRecommendations(params = {}, options = {}) {
    return apiClient.get(`/api/events/recommendations${buildQueryString(params)}`, options);
  },

  createEvent(data) {
    return apiClient.post('/api/events', data);
  },

  updateEvent(id, data) {
    return apiClient.put(`/api/events/${id}`, data);
  },

  archiveEvent(id) {
    return apiClient.post(`/api/events/${id}/archive`, {});
  },

  deleteEvent(id) {
    return apiClient.delete(`/api/events/${id}`);
  }
};

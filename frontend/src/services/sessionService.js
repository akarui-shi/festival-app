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

export const sessionService = {
  getSessions(params = {}) {
    return apiClient.get(`/api/sessions${buildQueryString(params)}`, { auth: false });
  },

  getEventSessions(eventId) {
    return this.getSessions({ eventId });
  },

  createSession(data) {
    return apiClient.post('/api/sessions', data);
  },

  updateSession(id, data) {
    return apiClient.put(`/api/sessions/${id}`, data);
  },

  deleteSession(id) {
    return apiClient.delete(`/api/sessions/${id}`);
  }
};

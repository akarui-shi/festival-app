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

  getSessionById(id) {
    return apiClient.get(`/api/sessions/${id}`, { auth: false });
  }
};


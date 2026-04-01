import { apiClient } from './apiClient';

export const eventService = {
  getEvents() {
    return apiClient.get('/api/events', { auth: false });
  },

  getEventById(id) {
    return apiClient.get(`/api/events/${id}`, { auth: false });
  }
};

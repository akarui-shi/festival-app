import { apiClient } from './apiClient';

export const organizerService = {
  getMyEvents() {
    return apiClient.get('/api/organizer/events');
  },

  getMyEventById(id) {
    return apiClient.get(`/api/organizer/events/${id}`);
  },

  createVenue(data) {
    return apiClient.post('/api/organizer/venues', data);
  }
};

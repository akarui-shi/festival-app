import { apiClient } from './apiClient';

export const organizerService = {
  getMyEvents() {
    return apiClient.get('/api/organizer/events');
  }
};


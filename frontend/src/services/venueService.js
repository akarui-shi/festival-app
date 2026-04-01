import { apiClient } from './apiClient';

export const venueService = {
  getVenues() {
    return apiClient.get('/api/venues', { auth: false });
  }
};

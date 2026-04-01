import { apiClient } from './apiClient';

export const directoryService = {
  getCategories() {
    return apiClient.get('/api/categories', { auth: false });
  },

  getVenues() {
    return apiClient.get('/api/venues', { auth: false });
  },

  getCities() {
    return apiClient.get('/api/cities', { auth: false });
  }
};


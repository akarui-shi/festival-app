import { apiClient } from './apiClient';

export const favoriteService = {
  getMyFavorites() {
    return apiClient.get('/api/favorites/my');
  },

  addFavorite(eventId) {
    return apiClient.post('/api/favorites', { eventId });
  },

  removeFavorite(eventId) {
    return apiClient.delete(`/api/favorites/${eventId}`);
  }
};

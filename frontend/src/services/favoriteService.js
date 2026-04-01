import { apiClient } from './apiClient';

export const favoriteService = {
  getMyFavorites() {
    return apiClient.get('/api/favorites/my');
  },

  addToFavorites(eventId) {
    return apiClient.post('/api/favorites', { eventId });
  },

  removeFromFavorites(eventId) {
    return apiClient.delete(`/api/favorites/${eventId}`);
  },

  // Backward compatible aliases.
  addFavorite(eventId) {
    return this.addToFavorites(eventId);
  },

  removeFavorite(eventId) {
    return this.removeFromFavorites(eventId);
  }
};

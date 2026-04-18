import type { Favorite, Id } from '@/types';
import { apiDelete, apiGet, apiPost } from './api-client';

export const favoriteService = {
  async getMyFavorites(_userId: Id): Promise<Favorite[]> {
    return apiGet<Favorite[]>('/favorites/my');
  },

  async addFavorite(_userId: Id, eventId: Id): Promise<Favorite> {
    return apiPost<Favorite>('/favorites', { eventId: Number(eventId) });
  },

  async removeFavorite(_userId: Id, eventId: Id): Promise<void> {
    await apiDelete(`/favorites/${eventId}`);
  },

  async isFavorite(userId: Id, eventId: Id): Promise<boolean> {
    const favorites = await this.getMyFavorites(userId);
    return favorites.some((favorite) => String(favorite.eventId) === String(eventId));
  },
};

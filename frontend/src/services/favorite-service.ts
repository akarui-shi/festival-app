import type { Favorite } from '@/types';
import { apiDelete, apiGet, apiPost } from './api-client';
import type { BackendFavorite } from './api-mappers';
import { mapFavorite } from './api-mappers';

export const favoriteService = {
  async getMyFavorites(_userId: string): Promise<Favorite[]> {
    const response = await apiGet<BackendFavorite[]>('/favorites/my');
    return response.map(mapFavorite);
  },

  async addFavorite(_userId: string, eventId: string): Promise<Favorite> {
    const response = await apiPost<BackendFavorite>('/favorites', { eventId: Number(eventId) });
    return mapFavorite(response);
  },

  async removeFavorite(_userId: string, eventId: string): Promise<void> {
    await apiDelete(`/favorites/${eventId}`);
  },

  async isFavorite(userId: string, eventId: string): Promise<boolean> {
    const favorites = await this.getMyFavorites(userId);
    return favorites.some((favorite) => favorite.eventId === eventId);
  },
};

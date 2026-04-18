import type { Artist, Id } from '@/types';
import { apiGet, apiPost, apiPut } from './api-client';

export const artistService = {
  async getArtists(q?: string): Promise<Artist[]> {
    return apiGet<Artist[]>('/artists', { q });
  },

  async getArtistById(id: Id): Promise<Artist> {
    return apiGet<Artist>(`/artists/${id}`);
  },

  async createArtist(payload: Partial<Artist>): Promise<Artist> {
    return apiPost<Artist>('/artists', payload);
  },

  async updateArtist(id: Id, payload: Partial<Artist>): Promise<Artist> {
    return apiPut<Artist>(`/artists/${id}`, payload);
  },
};

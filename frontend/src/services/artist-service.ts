import type { Artist, Id } from '@/types';
import { apiGet, apiPost, apiPut } from './api-client';

function normalizeArtist(artist: Artist): Artist {
  const imageIds = Array.isArray(artist.imageIds)
    ? artist.imageIds.filter((value): value is number => Number.isFinite(Number(value))).map((value) => Number(value))
    : artist.imageId != null ? [Number(artist.imageId)] : [];
  const primaryImageId = artist.primaryImageId ?? imageIds[0] ?? artist.imageId ?? null;
  return {
    ...artist,
    imageIds,
    primaryImageId: primaryImageId == null ? null : Number(primaryImageId),
    imageId: primaryImageId == null ? null : Number(primaryImageId),
  };
}

export const artistService = {
  async getArtists(q?: string): Promise<Artist[]> {
    const response = await apiGet<Artist[]>('/artists', { q });
    return response.map(normalizeArtist);
  },

  async getArtistById(id: Id): Promise<Artist> {
    const response = await apiGet<Artist>(`/artists/${id}`);
    return normalizeArtist(response);
  },

  async createArtist(payload: Partial<Artist>): Promise<Artist> {
    const response = await apiPost<Artist>('/artists', payload);
    return normalizeArtist(response);
  },

  async updateArtist(id: Id, payload: Partial<Artist>): Promise<Artist> {
    const response = await apiPut<Artist>(`/artists/${id}`, payload);
    return normalizeArtist(response);
  },
};

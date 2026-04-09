import type { Publication, PublicationStatus } from '@/types';
import { ApiError, apiDelete, apiGet, apiPatch, apiPost, apiPut } from './api-client';
import type { BackendPublicationDetails, BackendPublicationShort } from './api-mappers';
import { mapPublicationDetails, mapPublicationShort, toBackendPublicationStatus } from './api-mappers';

export const publicationService = {
  async getPublications(): Promise<Publication[]> {
    const response = await apiGet<BackendPublicationShort[]>('/publications');
    return response.map(mapPublicationShort);
  },

  async getPublicationById(id: string): Promise<Publication> {
    const response = await apiGet<BackendPublicationDetails>(`/publications/${id}`);
    return mapPublicationDetails(response);
  },

  async createPublication(data: Partial<Publication>): Promise<Publication> {
    const response = await apiPost<BackendPublicationDetails>('/publications', {
      title: data.title,
      content: data.content,
      imageUrl: data.imageUrl,
    });
    return mapPublicationDetails(response);
  },

  async updatePublication(id: string, data: Partial<Publication>): Promise<Publication> {
    const response = await apiPut<BackendPublicationDetails>(`/publications/${id}`, {
      title: data.title,
      content: data.content,
      imageUrl: data.imageUrl,
    });
    return mapPublicationDetails(response);
  },

  async deletePublication(id: string): Promise<void> {
    await apiDelete(`/publications/${id}`);
  },

  async updateStatus(id: string, status: PublicationStatus): Promise<Publication> {
    const response = await apiPatch<BackendPublicationDetails>(`/publications/${id}/status`, {
      status: toBackendPublicationStatus(status),
    });
    return mapPublicationDetails(response);
  },

  async getAllPublications(): Promise<Publication[]> {
    try {
      const response = await apiGet<BackendPublicationShort[]>('/admin/publications');
      return response
        .filter((publication) => publication.status !== 'DELETED')
        .map(mapPublicationShort);
    } catch (error) {
      if (!(error instanceof ApiError) || (error.status !== 401 && error.status !== 403)) {
        throw error;
      }

      const response = await apiGet<BackendPublicationShort[]>('/publications/mine');
      return response
        .filter((publication) => publication.status !== 'DELETED')
        .map(mapPublicationShort);
    }
  },
};

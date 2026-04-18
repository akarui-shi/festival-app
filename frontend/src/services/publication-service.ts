import type { Id, Publication, PublicationStatus } from '@/types';
import { ApiError, apiDelete, apiGet, apiPatch, apiPost, apiPut } from './api-client';

export const publicationService = {
  async getPublications(params?: { eventId?: Id; organizationId?: Id; title?: string }): Promise<Publication[]> {
    return apiGet<Publication[]>('/publications', {
      eventId: params?.eventId,
      organizationId: params?.organizationId,
      title: params?.title,
    });
  },

  async getPublicationById(id: Id): Promise<Publication> {
    return apiGet<Publication>(`/publications/${id}`);
  },

  async createPublication(data: Partial<Publication>): Promise<Publication> {
    return apiPost<Publication>('/publications', {
      title: data.title,
      content: data.content,
      imageUrl: data.imageUrl,
      imageUrls: data.imageUrls,
      eventId: data.eventId,
    });
  },

  async updatePublication(id: Id, data: Partial<Publication>): Promise<Publication> {
    return apiPut<Publication>(`/publications/${id}`, {
      title: data.title,
      content: data.content,
      imageUrl: data.imageUrl,
      imageUrls: data.imageUrls,
      eventId: data.eventId,
    });
  },

  async deletePublication(id: Id): Promise<void> {
    await apiDelete(`/publications/${id}`);
  },

  async updateStatus(id: Id, status: PublicationStatus): Promise<Publication> {
    return apiPatch<Publication>(`/publications/${id}/status`, {
      status,
    });
  },

  async getAllPublications(): Promise<Publication[]> {
    try {
      const response = await apiGet<Publication[]>('/admin/publications');
      return response
        .filter((publication) => publication.status !== 'DELETED')
    } catch (error) {
      if (!(error instanceof ApiError) || (error.status !== 401 && error.status !== 403)) {
        throw error;
      }

      const response = await apiGet<Publication[]>('/publications/mine');
      return response
        .filter((publication) => publication.status !== 'DELETED')
    }
  },

  async submitForModeration(id: Id): Promise<Publication> {
    const current = await this.getPublicationById(id);
    return this.updatePublication(id, {
      title: current.title,
      content: current.content || '',
      eventId: current.eventId,
      imageUrl: current.imageUrl,
      imageUrls: current.imageUrls,
    });
  },
};

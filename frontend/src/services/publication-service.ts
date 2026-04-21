import type { Id, Publication, PublicationStatus } from '@/types';
import { ApiError, apiDelete, apiGet, apiPatch, apiPost, apiPut } from './api-client';

function normalizePublication(publication: Publication): Publication {
  const normalizedId = publication.publicationId ?? publication.id;
  const normalizedImageIds = publication.imageIds && publication.imageIds.length > 0
    ? publication.imageIds
    : publication.imageId ? [publication.imageId] : [];
  const normalizedImageId = publication.imageId
    || normalizedImageIds[0]
    || publication.eventImageId
    || null;

  return {
    ...publication,
    publicationId: normalizedId,
    id: normalizedId,
    imageIds: normalizedImageIds,
    imageId: normalizedImageId,
    preview: publication.preview ?? publication.excerpt ?? null,
    excerpt: publication.excerpt ?? publication.preview ?? null,
    tags: publication.tags ?? [],
  };
}

function normalizePublications(list: Publication[]): Publication[] {
  return list.map(normalizePublication);
}

export const publicationService = {
  async getPublications(params?: { eventId?: Id; organizationId?: Id; title?: string }): Promise<Publication[]> {
    const response = await apiGet<Publication[]>('/publications', {
      eventId: params?.eventId,
      organizationId: params?.organizationId,
      title: params?.title,
    });
    return normalizePublications(response);
  },

  async getPublicationById(id: Id): Promise<Publication> {
    const response = await apiGet<Publication>(`/publications/${id}`);
    return normalizePublication(response);
  },

  async createPublication(data: Partial<Publication>): Promise<Publication> {
    const response = await apiPost<Publication>('/publications', {
      title: data.title,
      content: data.content,
      imageId: data.imageId,
      imageIds: data.imageIds,
      eventId: data.eventId,
    });
    return normalizePublication(response);
  },

  async updatePublication(id: Id, data: Partial<Publication>): Promise<Publication> {
    const response = await apiPut<Publication>(`/publications/${id}`, {
      title: data.title,
      content: data.content,
      imageId: data.imageId,
      imageIds: data.imageIds,
      eventId: data.eventId,
    });
    return normalizePublication(response);
  },

  async deletePublication(id: Id): Promise<void> {
    await apiDelete(`/publications/${id}`);
  },

  async updateStatus(id: Id, status: PublicationStatus): Promise<Publication> {
    const response = await apiPatch<Publication>(`/publications/${id}/status`, {
      status,
    });
    return normalizePublication(response);
  },

  async getAllPublications(options?: { includeDeleted?: boolean }): Promise<Publication[]> {
    const includeDeleted = options?.includeDeleted === true;
    try {
      const response = await apiGet<Publication[]>('/admin/publications');
      const normalized = normalizePublications(response);
      return includeDeleted ? normalized : normalized.filter((publication) => publication.status !== 'DELETED');
    } catch (error) {
      if (!(error instanceof ApiError) || (error.status !== 401 && error.status !== 403)) {
        throw error;
      }

      const response = await apiGet<Publication[]>('/publications/mine');
      const normalized = normalizePublications(response);
      return includeDeleted ? normalized : normalized.filter((publication) => publication.status !== 'DELETED');
    }
  },

  async submitForModeration(id: Id): Promise<Publication> {
    const current = await this.getPublicationById(id);
    return this.updatePublication(id, {
      title: current.title,
      content: current.content || '',
      eventId: current.eventId,
      imageId: current.imageId,
      imageIds: current.imageIds,
    });
  },
};

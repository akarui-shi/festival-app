import { apiClient } from './apiClient';

export const uploadService = {
  uploadEventCover(file) {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.postForm('/api/files/event-cover', formData);
  },

  uploadPublicationImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.postForm('/api/files/publication-image', formData);
  }
};

import { adminService } from './adminService';
import { apiClient } from './apiClient';

const toQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    searchParams.append(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

export const publicationService = {
  getPublications(params = {}) {
    return apiClient.get(`/api/publications${toQueryString(params)}`, { auth: false });
  },

  getPublicationById(id) {
    return apiClient.get(`/api/publications/${id}`, { auth: false });
  },

  getAdminPublications(status) {
    return adminService.getAdminPublications(status);
  },

  updatePublicationStatus(publicationId, status) {
    return adminService.updatePublicationStatus(publicationId, status);
  }
};

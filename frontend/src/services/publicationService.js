import { adminService } from './adminService';

export const publicationService = {
  getAdminPublications(status) {
    return adminService.getAdminPublications(status);
  },

  updatePublicationStatus(publicationId, status) {
    return adminService.updatePublicationStatus(publicationId, status);
  }
};


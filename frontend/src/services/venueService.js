import { adminService } from './adminService';

export const venueService = {
  getVenues() {
    return adminService.getVenues();
  },

  createVenue(data) {
    return adminService.createVenue(data);
  },

  updateVenue(id, data) {
    return adminService.updateVenue(id, data);
  },

  deleteVenue(id) {
    return adminService.deleteVenue(id);
  }
};


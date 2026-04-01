import { adminService } from './adminService';

export const cityService = {
  getCities() {
    return adminService.getCities();
  },

  createCity(data) {
    return adminService.createCity(data);
  },

  updateCity(id, data) {
    return adminService.updateCity(id, data);
  },

  deleteCity(id) {
    return adminService.deleteCity(id);
  }
};


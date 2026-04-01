import { adminService } from './adminService';

export const cityService = {
  getCities(params = {}) {
    if (params.q || params.limit) {
      return adminService.searchCities(params);
    }
    return adminService.getCities();
  },

  searchCities(params = {}) {
    return adminService.searchCities(params);
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

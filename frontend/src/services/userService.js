import { apiClient } from './apiClient';
import { adminService } from './adminService';

export const userService = {
  getCurrentUser() {
    return apiClient.get('/api/users/me');
  },

  updateMyProfile(data) {
    return apiClient.put('/api/users/me', data);
  },

  getAdminUsers() {
    return adminService.getAdminUsers();
  },

  updateUserRoles(userId, roles) {
    return adminService.updateUserRoles(userId, roles);
  },

  updateUserActive(userId, active) {
    return adminService.updateUserActive(userId, active);
  }
};

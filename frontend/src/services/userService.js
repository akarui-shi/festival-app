import { adminService } from './adminService';

export const userService = {
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


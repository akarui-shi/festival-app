import { adminService } from './adminService';

export const categoryService = {
  getCategories() {
    return adminService.getCategories();
  },

  createCategory(data) {
    return adminService.createCategory(data);
  },

  updateCategory(id, data) {
    return adminService.updateCategory(id, data);
  },

  deleteCategory(id) {
    return adminService.deleteCategory(id);
  }
};


import { adminService } from './adminService';

export const reviewService = {
  getAdminReviews(status) {
    return adminService.getAdminReviews(status);
  },

  updateReviewStatus(reviewId, status) {
    return adminService.updateReviewStatus(reviewId, status);
  }
};


import { apiClient } from './apiClient';

export const reviewService = {
  getReviewsByEvent(eventId) {
    return apiClient.get(`/api/reviews/event/${eventId}`, { auth: false });
  },

  createReview(payload) {
    return apiClient.post('/api/reviews', payload);
  }
};

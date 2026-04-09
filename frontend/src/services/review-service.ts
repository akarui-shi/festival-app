import type { Review } from '@/types';
import { apiDelete, apiGet, apiPost, apiPut } from './api-client';
import type { BackendReview } from './api-mappers';
import { mapReview } from './api-mappers';

export const reviewService = {
  async getReviewsByEvent(eventId: string): Promise<Review[]> {
    const response = await apiGet<BackendReview[]>(`/reviews/event/${eventId}`);
    return response.map(mapReview);
  },

  async createReview(data: { userId: string; eventId: string; rating: number; comment: string }): Promise<Review> {
    const response = await apiPost<BackendReview>('/reviews', {
      eventId: Number(data.eventId),
      rating: data.rating,
      text: data.comment,
    });
    return mapReview(response);
  },

  async updateReview(id: string, data: { rating: number; comment: string }): Promise<Review> {
    const response = await apiPut<BackendReview>(`/reviews/${id}`, {
      rating: data.rating,
      text: data.comment,
    });
    return mapReview(response);
  },

  async deleteReview(id: string): Promise<void> {
    await apiDelete(`/reviews/${id}`);
  },

  async getAllReviews(): Promise<Review[]> {
    const response = await apiGet<BackendReview[]>('/admin/reviews');
    return response.map(mapReview);
  },

  async moderateReview(): Promise<Review> {
    throw new Error('Модерация отзывов не поддерживается текущим API');
  },
};

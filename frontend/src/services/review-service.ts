import type { Id, Review } from '@/types';
import { apiDelete, apiGet, apiPost, apiPut } from './api-client';

export const reviewService = {
  async getReviewsByEvent(eventId: Id): Promise<Review[]> {
    return apiGet<Review[]>(`/comments/event/${eventId}`);
  },

  async createReview(data: { userId: Id; eventId: Id; rating: number; comment: string }): Promise<Review> {
    return apiPost<Review>('/comments', {
      eventId: Number(data.eventId),
      rating: data.rating,
      text: data.comment,
    });
  },

  async updateReview(id: Id, data: { rating: number; comment: string }): Promise<Review> {
    return apiPut<Review>(`/comments/${id}`, {
      rating: data.rating,
      text: data.comment,
    });
  },

  async deleteReview(id: Id): Promise<void> {
    await apiDelete(`/comments/${id}`);
  },

  async getAllReviews(): Promise<Review[]> {
    return apiGet<Review[]>('/admin/comments');
  },

  async moderateReview(id: Id, decision: 'APPROVED' | 'REJECTED', moderatorComment?: string): Promise<void> {
    await apiPost('/admin/moderation/decisions', {
      entityType: 'Комментарий',
      entityId: Number(id),
      decision: decision === 'APPROVED' ? 'одобрено' : 'отклонено',
      moderatorComment,
    });
  },
};

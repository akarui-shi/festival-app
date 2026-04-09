import type { Review } from '@/types';
import { mockReviews, mockUsers } from '@/data/mock-data';

const delay = (ms = 300) => new Promise(r => setTimeout(r, ms));

export const reviewService = {
  async getReviewsByEvent(eventId: string): Promise<Review[]> {
    await delay();
    return mockReviews.filter(r => r.eventId === eventId && r.status === 'APPROVED');
  },

  async createReview(data: { userId: string; eventId: string; rating: number; comment: string }): Promise<Review> {
    await delay();
    const user = mockUsers.find(u => u.id === data.userId);
    const review: Review = {
      id: `rev${Date.now()}`, userId: data.userId, user, eventId: data.eventId,
      rating: data.rating, comment: data.comment, status: 'PENDING',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    mockReviews.push(review);
    return review;
  },

  async updateReview(id: string, data: { rating: number; comment: string }): Promise<Review> {
    await delay();
    const idx = mockReviews.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Отзыв не найден');
    mockReviews[idx] = { ...mockReviews[idx], ...data, updatedAt: new Date().toISOString() };
    return mockReviews[idx];
  },

  async deleteReview(id: string): Promise<void> {
    await delay();
    const idx = mockReviews.findIndex(r => r.id === id);
    if (idx !== -1) mockReviews.splice(idx, 1);
  },

  // Admin
  async getAllReviews(): Promise<Review[]> {
    await delay();
    return [...mockReviews];
  },

  async moderateReview(id: string, status: 'APPROVED' | 'REJECTED'): Promise<Review> {
    await delay();
    const idx = mockReviews.findIndex(r => r.id === id);
    if (idx === -1) throw new Error('Отзыв не найден');
    mockReviews[idx].status = status;
    return mockReviews[idx];
  },
};

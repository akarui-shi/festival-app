import type { AppNotification } from '@/types';
import { apiGet, apiPost, apiPatch } from './api-client';

export const notificationService = {
  async getAll(): Promise<AppNotification[]> {
    return apiGet<AppNotification[]>('/notifications');
  },

  async getUnreadCount(): Promise<number> {
    const data = await apiGet<{ count: number }>('/notifications/unread-count');
    return data.count;
  },

  async markRead(id: number | string): Promise<void> {
    await apiPatch(`/notifications/${id}/read`, {});
  },

  async markAllRead(): Promise<void> {
    await apiPost('/notifications/mark-all-read', {});
  },
};

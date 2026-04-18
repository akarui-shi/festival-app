import type { User, UserRole } from '@/types';
import { apiGet, apiPatch } from './api-client';

export const adminService = {
  async getUsers(): Promise<User[]> {
    return apiGet<User[]>('/admin/users');
  },

  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    return apiPatch<User>(`/admin/users/${userId}/roles`, {
      roles: [role],
    });
  },

  async toggleUserActive(userId: string): Promise<User> {
    const users = await this.getUsers();
    const user = users.find((entry) => entry.id === userId);
    if (!user) {
      throw new Error('Пользователь не найден');
    }

    return apiPatch<User>(`/admin/users/${userId}/active`, {
      active: !user.active,
    });
  },
};

import type { User, UserRole } from '@/types';
import { apiGet, apiPatch } from './api-client';
import type { BackendAdminUser } from './api-mappers';
import { mapAdminUser } from './api-mappers';

export const adminService = {
  async getUsers(): Promise<User[]> {
    const response = await apiGet<BackendAdminUser[]>('/admin/users');
    return response.map(mapAdminUser);
  },

  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    const response = await apiPatch<BackendAdminUser>(`/admin/users/${userId}/roles`, {
      roles: [role],
    });
    return mapAdminUser(response);
  },

  async toggleUserActive(userId: string): Promise<User> {
    const users = await this.getUsers();
    const user = users.find((entry) => entry.id === userId);
    if (!user) {
      throw new Error('Пользователь не найден');
    }

    const response = await apiPatch<BackendAdminUser>(`/admin/users/${userId}/active`, {
      active: !user.active,
    });
    return mapAdminUser(response);
  },
};

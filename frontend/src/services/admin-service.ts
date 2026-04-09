import type { User, UserRole } from '@/types';
import { mockUsers } from '@/data/mock-data';

const delay = (ms = 300) => new Promise(r => setTimeout(r, ms));

export const adminService = {
  async getUsers(): Promise<User[]> {
    await delay();
    return [...mockUsers];
  },

  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    await delay();
    const idx = mockUsers.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error('Пользователь не найден');
    mockUsers[idx].role = role;
    return mockUsers[idx];
  },

  async toggleUserActive(userId: string): Promise<User> {
    await delay();
    const idx = mockUsers.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error('Пользователь не найден');
    mockUsers[idx].active = !mockUsers[idx].active;
    return mockUsers[idx];
  },
};

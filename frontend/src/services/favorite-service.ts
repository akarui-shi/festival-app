import type { Favorite } from '@/types';
import { mockFavorites, mockEvents } from '@/data/mock-data';

const delay = (ms = 300) => new Promise(r => setTimeout(r, ms));

export const favoriteService = {
  async getMyFavorites(userId: string): Promise<Favorite[]> {
    await delay();
    return mockFavorites.filter(f => f.userId === userId);
  },

  async addFavorite(userId: string, eventId: string): Promise<Favorite> {
    await delay();
    const event = mockEvents.find(e => e.id === eventId);
    const fav: Favorite = { id: `f${Date.now()}`, userId, eventId, event, createdAt: new Date().toISOString() };
    mockFavorites.push(fav);
    return fav;
  },

  async removeFavorite(userId: string, eventId: string): Promise<void> {
    await delay();
    const idx = mockFavorites.findIndex(f => f.userId === userId && f.eventId === eventId);
    if (idx !== -1) mockFavorites.splice(idx, 1);
  },

  async isFavorite(userId: string, eventId: string): Promise<boolean> {
    await delay(100);
    return mockFavorites.some(f => f.userId === userId && f.eventId === eventId);
  },
};

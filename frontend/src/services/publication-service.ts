import type { Publication, PublicationStatus } from '@/types';
import { mockPublications } from '@/data/mock-data';

const delay = (ms = 300) => new Promise(r => setTimeout(r, ms));

export const publicationService = {
  async getPublications(): Promise<Publication[]> {
    await delay();
    return mockPublications.filter(p => p.status === 'PUBLISHED');
  },

  async getPublicationById(id: string): Promise<Publication> {
    await delay();
    const pub = mockPublications.find(p => p.id === id);
    if (!pub) throw new Error('Публикация не найдена');
    return pub;
  },

  async createPublication(data: Partial<Publication>): Promise<Publication> {
    await delay();
    const pub: Publication = {
      id: `p${Date.now()}`, title: data.title || '', content: data.content || '',
      excerpt: data.excerpt || '', imageUrl: '', authorId: data.authorId || '',
      status: 'DRAFT', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), tags: data.tags || [],
    };
    mockPublications.push(pub);
    return pub;
  },

  async updatePublication(id: string, data: Partial<Publication>): Promise<Publication> {
    await delay();
    const idx = mockPublications.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Публикация не найдена');
    mockPublications[idx] = { ...mockPublications[idx], ...data, updatedAt: new Date().toISOString() };
    return mockPublications[idx];
  },

  async deletePublication(id: string): Promise<void> {
    await delay();
    const idx = mockPublications.findIndex(p => p.id === id);
    if (idx !== -1) mockPublications.splice(idx, 1);
  },

  async updateStatus(id: string, status: PublicationStatus): Promise<Publication> {
    await delay();
    const idx = mockPublications.findIndex(p => p.id === id);
    if (idx === -1) throw new Error('Публикация не найдена');
    mockPublications[idx].status = status;
    if (status === 'PUBLISHED') mockPublications[idx].publishedAt = new Date().toISOString();
    return mockPublications[idx];
  },

  async getAllPublications(): Promise<Publication[]> {
    await delay();
    return [...mockPublications];
  },
};

import type { Session } from '@/types';
import { mockSessions } from '@/data/mock-data';

const delay = (ms = 300) => new Promise(r => setTimeout(r, ms));

export const sessionService = {
  async getSessionsByEvent(eventId: string): Promise<Session[]> {
    await delay();
    return mockSessions.filter(s => s.eventId === eventId);
  },

  async getSessionById(id: string): Promise<Session> {
    await delay();
    const session = mockSessions.find(s => s.id === id);
    if (!session) throw new Error('Сеанс не найден');
    return session;
  },

  async createSession(data: Partial<Session>): Promise<Session> {
    await delay();
    const session: Session = {
      id: `s${Date.now()}`, eventId: data.eventId || '', date: data.date || '',
      startTime: data.startTime || '', endTime: data.endTime || '',
      maxParticipants: data.maxParticipants || 50, currentParticipants: 0,
    };
    mockSessions.push(session);
    return session;
  },

  async updateSession(id: string, data: Partial<Session>): Promise<Session> {
    await delay();
    const idx = mockSessions.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('Сеанс не найден');
    mockSessions[idx] = { ...mockSessions[idx], ...data };
    return mockSessions[idx];
  },

  async deleteSession(id: string): Promise<void> {
    await delay();
    const idx = mockSessions.findIndex(s => s.id === id);
    if (idx !== -1) mockSessions.splice(idx, 1);
  },
};

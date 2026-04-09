import type { Registration } from '@/types';
import { mockRegistrations, mockEvents, mockSessions } from '@/data/mock-data';

const delay = (ms = 300) => new Promise(r => setTimeout(r, ms));

export const registrationService = {
  async createRegistration(sessionId: string, userId: string): Promise<Registration> {
    await delay();
    const session = mockSessions.find(s => s.id === sessionId);
    if (!session) throw new Error('Сеанс не найден');
    if (session.currentParticipants >= session.maxParticipants) throw new Error('Все места заняты');
    const event = mockEvents.find(e => e.id === session.eventId);
    const reg: Registration = {
      id: `r${Date.now()}`, userId, sessionId, eventId: session.eventId,
      event, session, status: 'CONFIRMED', createdAt: new Date().toISOString(),
    };
    mockRegistrations.push(reg);
    session.currentParticipants++;
    return reg;
  },

  async getMyRegistrations(userId: string): Promise<Registration[]> {
    await delay();
    return mockRegistrations.filter(r => r.userId === userId && r.status !== 'CANCELLED');
  },

  async cancelRegistration(id: string): Promise<void> {
    await delay();
    const reg = mockRegistrations.find(r => r.id === id);
    if (reg) reg.status = 'CANCELLED';
  },

  async getRegistrationsByEvent(eventId: string): Promise<Registration[]> {
    await delay();
    return mockRegistrations.filter(r => r.eventId === eventId);
  },
};

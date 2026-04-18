import type { Id, Session } from '@/types';
import { apiDelete, apiGet, apiPost, apiPut } from './api-client';

function toBackendDateTime(date: string, time: string): string {
  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  return `${date}T${normalizedTime}`;
}

type SessionMutationInput = Partial<Session> & {
  date?: string;
  startTime?: string;
  endTime?: string;
  maxParticipants?: number;
  eventId?: Id | null;
};

function buildSessionPayload(data: SessionMutationInput) {
  const startAt = data.startAt || (data.date && data.startTime ? toBackendDateTime(data.date, data.startTime) : undefined);
  const endAt = data.endAt || (data.date && data.endTime ? toBackendDateTime(data.date, data.endTime) : undefined);

  return {
    eventId: data.eventId != null ? Number(data.eventId) : undefined,
    startAt,
    endAt,
    capacity: data.maxParticipants ?? data.totalCapacity,
  };
}

export const sessionService = {
  async getSessionsByEvent(eventId: Id): Promise<Session[]> {
    return apiGet<Session[]>('/sessions', { eventId });
  },

  async getSessionById(id: Id): Promise<Session> {
    return apiGet<Session>(`/sessions/${id}`);
  },

  async createSession(data: SessionMutationInput): Promise<Session> {
    return apiPost<Session>('/sessions', buildSessionPayload(data));
  },

  async updateSession(id: Id, data: SessionMutationInput): Promise<Session> {
    return apiPut<Session>(`/sessions/${id}`, buildSessionPayload(data));
  },

  async deleteSession(id: Id): Promise<void> {
    await apiDelete(`/sessions/${id}`);
  },
};

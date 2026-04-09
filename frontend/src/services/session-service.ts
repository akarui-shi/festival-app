import type { Session } from '@/types';
import { apiDelete, apiGet, apiPost, apiPut } from './api-client';
import type { BackendSessionDetails, BackendSessionShort } from './api-mappers';
import { mapSession } from './api-mappers';

function toBackendDateTime(date: string, time: string): string {
  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  return `${date}T${normalizedTime}`;
}

function buildSessionPayload(data: Partial<Session>) {
  const startAt = data.date && data.startTime ? toBackendDateTime(data.date, data.startTime) : undefined;
  const endAt = data.date && data.endTime ? toBackendDateTime(data.date, data.endTime) : undefined;

  return {
    eventId: data.eventId ? Number(data.eventId) : undefined,
    startAt,
    endAt,
    capacity: data.maxParticipants,
  };
}

export const sessionService = {
  async getSessionsByEvent(eventId: string): Promise<Session[]> {
    const response = await apiGet<BackendSessionShort[]>('/sessions', { eventId });
    return response.map(mapSession);
  },

  async getSessionById(id: string): Promise<Session> {
    const response = await apiGet<BackendSessionDetails>(`/sessions/${id}`);
    return mapSession(response);
  },

  async createSession(data: Partial<Session>): Promise<Session> {
    const response = await apiPost<BackendSessionDetails>('/sessions', buildSessionPayload(data));
    return mapSession(response);
  },

  async updateSession(id: string, data: Partial<Session>): Promise<Session> {
    const response = await apiPut<BackendSessionDetails>(`/sessions/${id}`, buildSessionPayload(data));
    return mapSession(response);
  },

  async deleteSession(id: string): Promise<void> {
    await apiDelete(`/sessions/${id}`);
  },
};

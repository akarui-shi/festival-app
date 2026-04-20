import type { Id, Session, SessionTicketType } from '@/types';
import { apiDelete, apiGet, apiPost, apiPut } from './api-client';

function toBackendDateTime(date: string, time: string): string {
  const normalizedTime = time.length === 5 ? `${time}:00` : time;
  return `${date}T${normalizedTime}`;
}

type SessionMutationInput = Partial<Session> & {
  sessionTitle?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  maxParticipants?: number;
  eventId?: Id | null;
  venueId?: Id | null;
  manualAddress?: string;
  latitude?: number | null;
  longitude?: number | null;
  participationType?: 'free' | 'paid' | string;
  price?: number | null;
  currency?: string | null;
  salesStartAt?: string | null;
  salesEndAt?: string | null;
};

function buildSessionPayload(data: SessionMutationInput) {
  const startAt = data.startAt || (data.date && data.startTime ? toBackendDateTime(data.date, data.startTime) : undefined);
  const endAt = data.endAt || (data.date && data.endTime ? toBackendDateTime(data.date, data.endTime) : undefined);

  return {
    eventId: data.eventId != null ? Number(data.eventId) : undefined,
    venueId: data.venueId != null ? Number(data.venueId) : undefined,
    sessionTitle: data.sessionTitle,
    startAt,
    endAt,
    capacity: data.maxParticipants ?? data.totalCapacity,
    manualAddress: data.manualAddress,
    latitude: data.latitude,
    longitude: data.longitude,
    participationType: data.participationType,
    price: data.price,
    currency: data.currency,
    salesStartAt: data.salesStartAt,
    salesEndAt: data.salesEndAt,
  };
}

export const sessionService = {
  async getSessionsByEvent(eventId: Id): Promise<Session[]> {
    return apiGet<Session[]>('/sessions', { eventId });
  },

  async getSessionById(id: Id): Promise<Session> {
    return apiGet<Session>(`/sessions/${id}`);
  },

  async getTicketTypes(sessionId: Id): Promise<SessionTicketType[]> {
    return apiGet<SessionTicketType[]>(`/sessions/${sessionId}/ticket-types`);
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

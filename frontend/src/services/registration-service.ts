import type { Registration } from '@/types';
import { apiDelete, apiGet, apiPost } from './api-client';
import type { BackendRegistration, BackendSessionRegistration } from './api-mappers';
import { mapRegistration, mapSessionRegistration } from './api-mappers';
import { sessionService } from './session-service';

export const registrationService = {
  async createRegistration(sessionId: string, _userId: string): Promise<Registration> {
    const response = await apiPost<BackendRegistration>('/registrations', {
      sessionId: Number(sessionId),
      quantity: 1,
    });
    return mapRegistration(response);
  },

  async getMyRegistrations(_userId: string): Promise<Registration[]> {
    const response = await apiGet<BackendRegistration[]>('/registrations/my');
    return response.map(mapRegistration);
  },

  async cancelRegistration(id: string): Promise<void> {
    await apiDelete(`/registrations/${id}`);
  },

  async getRegistrationsByEvent(eventId: string): Promise<Registration[]> {
    const sessions = await sessionService.getSessionsByEvent(eventId);
    const response = await Promise.all(
      sessions.map(async (session) => {
        const registrations = await apiGet<BackendSessionRegistration[]>(`/sessions/${session.id}/registrations`);
        return registrations.map((registration) => mapSessionRegistration(registration, session, eventId));
      }),
    );

    return response.flat();
  },
};

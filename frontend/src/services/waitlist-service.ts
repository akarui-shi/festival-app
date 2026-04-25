import { apiDelete, apiGet, apiPost } from './api-client';

export interface WaitlistStatus {
  inQueue: boolean;
  position?: number;
  queueSize: number;
  alreadyInQueue?: boolean;
}

export const waitlistService = {
  async join(sessionId: string | number): Promise<WaitlistStatus> {
    return apiPost<WaitlistStatus>(`/sessions/${sessionId}/waitlist`);
  },

  async leave(sessionId: string | number): Promise<void> {
    return apiDelete<void>(`/sessions/${sessionId}/waitlist`);
  },

  async getStatus(sessionId: string | number): Promise<WaitlistStatus> {
    return apiGet<WaitlistStatus>(`/sessions/${sessionId}/waitlist/status`);
  },
};

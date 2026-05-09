import type { Participant, Id } from '@/types';
import { apiDelete, apiGet, apiPost, apiPut } from './api-client';

function normalizeParticipant(participant: Participant): Participant {
  const imageIds = Array.isArray(participant.imageIds)
    ? participant.imageIds.filter((value): value is number => Number.isFinite(Number(value))).map((value) => Number(value))
    : participant.imageId != null ? [Number(participant.imageId)] : [];
  const primaryImageId = participant.primaryImageId ?? imageIds[0] ?? participant.imageId ?? null;
  return {
    ...participant,
    imageIds,
    primaryImageId: primaryImageId == null ? null : Number(primaryImageId),
    imageId: primaryImageId == null ? null : Number(primaryImageId),
  };
}

export const participantService = {
  async getParticipants(q?: string): Promise<Participant[]> {
    const response = await apiGet<Participant[]>('/participants', { q });
    return response.map(normalizeParticipant);
  },

  async getParticipantById(id: Id): Promise<Participant> {
    const response = await apiGet<Participant>(`/participants/${id}`);
    return normalizeParticipant(response);
  },

  async createParticipant(payload: Partial<Participant>): Promise<Participant> {
    const response = await apiPost<Participant>('/participants', payload);
    return normalizeParticipant(response);
  },

  async updateParticipant(id: Id, payload: Partial<Participant>): Promise<Participant> {
    const response = await apiPut<Participant>(`/participants/${id}`, payload);
    return normalizeParticipant(response);
  },

  async deleteParticipant(id: Id): Promise<void> {
    await apiDelete(`/participants/${id}`);
  },
};

import type { Id, Organization } from '@/types';
import { apiGet, apiPatch, apiPost, apiPut } from './api-client';

export interface OrganizationJoinRequest {
  requestId: Id;
  organizationId?: Id | null;
  organizationName?: string | null;
  userId?: Id | null;
  userName?: string | null;
  userEmail?: string | null;
  message?: string | null;
  status?: 'pending' | 'approved' | 'rejected' | string;
  decisionComment?: string | null;
  requestedAt?: string | null;
  reviewedAt?: string | null;
}

export const organizationService = {
  async getOrganizations(q?: string): Promise<Organization[]> {
    return apiGet<Organization[]>('/organizations', { q });
  },

  async updateOrganization(id: Id, payload: Partial<Organization>): Promise<Organization> {
    return apiPut<Organization>(`/organizations/${id}`, payload);
  },

  async createJoinRequest(organizationId: Id, message?: string): Promise<OrganizationJoinRequest> {
    return apiPost<OrganizationJoinRequest>('/organizations/join-requests', {
      organizationId: Number(organizationId),
      message,
    });
  },

  async getMyJoinRequests(): Promise<OrganizationJoinRequest[]> {
    return apiGet<OrganizationJoinRequest[]>('/organizations/join-requests/my');
  },

  async getOrganizationJoinRequests(organizationId: Id, status?: string): Promise<OrganizationJoinRequest[]> {
    return apiGet<OrganizationJoinRequest[]>(`/organizations/${organizationId}/join-requests`, { status });
  },

  async getPendingJoinRequests(): Promise<OrganizationJoinRequest[]> {
    return apiGet<OrganizationJoinRequest[]>('/organizations/join-requests/pending');
  },

  async decideJoinRequest(requestId: Id, decision: 'approve' | 'reject', comment?: string): Promise<OrganizationJoinRequest> {
    return apiPatch<OrganizationJoinRequest>(`/organizations/join-requests/${requestId}`, {
      decision,
      comment,
    });
  },
};

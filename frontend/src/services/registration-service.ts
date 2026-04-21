import type { Id, Order, SessionRegistration, Ticket } from '@/types';
import { apiDelete, apiGet, apiPost } from './api-client';

export interface RegistrationItemInput {
  ticketTypeId: Id;
  quantity: number;
}

export const registrationService = {
  async createRegistration(
    sessionId: Id,
    _userId: Id,
    paymentProvider: 'yookassa' | 'sbp' = 'yookassa',
    items?: RegistrationItemInput[],
  ): Promise<Order> {
    const normalizedItems = (items || [])
      .map((item) => ({
        ticketTypeId: Number(item.ticketTypeId),
        quantity: Math.max(1, Number(item.quantity) || 1),
      }))
      .filter((item) => Number.isFinite(item.ticketTypeId));

    return apiPost<Order>('/orders', {
      sessionId: Number(sessionId),
      paymentProvider,
      items: normalizedItems.length > 0 ? normalizedItems : undefined,
    });
  },

  async confirmPayment(orderId: Id, externalPaymentId?: string): Promise<Order> {
    return apiPost<Order>(`/orders/${orderId}/confirm-payment`, {
      externalPaymentId,
      status: 'succeeded',
    });
  },

  async getMyRegistrations(_userId: Id): Promise<Ticket[]> {
    return apiGet<Ticket[]>('/tickets/my');
  },

  async cancelRegistration(id: Id): Promise<void> {
    await apiDelete(`/orders/${id}`);
  },

  async getRegistrationsByEvent(eventId: Id): Promise<SessionRegistration[]> {
    const sessions = await apiGet<Array<{ id: number }>>('/sessions', { eventId });
    const response = await Promise.all(
      sessions.map(async (session) => apiGet<SessionRegistration[]>(`/sessions/${session.id}/registrations`)),
    );
    return response.flat();
  },
};

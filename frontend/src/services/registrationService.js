import { apiClient } from './apiClient';

export const registrationService = {
  createRegistration(sessionId, quantity) {
    return apiClient.post('/api/registrations', { sessionId, quantity });
  },

  getMyRegistrations() {
    return apiClient.get('/api/registrations/my');
  },

  cancelRegistration(registrationId) {
    return apiClient.delete(`/api/registrations/${registrationId}`);
  }
};


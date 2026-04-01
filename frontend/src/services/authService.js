import { apiClient } from './apiClient';

export const authService = {
  register(data) {
    return apiClient.post('/api/auth/register', data, { auth: false });
  },

  login(data) {
    return apiClient.post('/api/auth/login', data, { auth: false });
  },

  getCurrentUser() {
    return apiClient.get('/api/users/me');
  }
};

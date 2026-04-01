import { apiClient } from './apiClient';

const withStatusQuery = (status) => {
  if (!status) {
    return '';
  }
  return `?status=${encodeURIComponent(status)}`;
};

const toQueryString = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    searchParams.append(key, String(value));
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
};

export const adminService = {
  getAdminReviews(status) {
    return apiClient.get(`/api/admin/reviews${withStatusQuery(status)}`);
  },

  updateReviewStatus(reviewId, status) {
    return apiClient.patch(`/api/reviews/${reviewId}/status`, { status });
  },

  getAdminPublications(status) {
    return apiClient.get(`/api/admin/publications${withStatusQuery(status)}`);
  },

  updatePublicationStatus(publicationId, status) {
    return apiClient.patch(`/api/publications/${publicationId}/status`, { status });
  },

  getAdminUsers() {
    return apiClient.get('/api/admin/users');
  },

  updateUserRoles(userId, roles) {
    return apiClient.patch(`/api/admin/users/${userId}/roles`, { roles });
  },

  updateUserActive(userId, active) {
    return apiClient.patch(`/api/admin/users/${userId}/active`, { active });
  },

  getCategories() {
    return apiClient.get('/api/categories', { auth: false });
  },

  createCategory(data) {
    return apiClient.post('/api/admin/categories', data);
  },

  updateCategory(id, data) {
    return apiClient.put(`/api/admin/categories/${id}`, data);
  },

  deleteCategory(id) {
    return apiClient.delete(`/api/admin/categories/${id}`);
  },

  getCities() {
    return apiClient.get('/api/cities', { auth: false });
  },

  searchCities(params = {}) {
    return apiClient.get(`/api/cities${toQueryString(params)}`, { auth: false });
  },

  createCity(data) {
    return apiClient.post('/api/admin/cities', data);
  },

  updateCity(id, data) {
    return apiClient.put(`/api/admin/cities/${id}`, data);
  },

  deleteCity(id) {
    return apiClient.delete(`/api/admin/cities/${id}`);
  },

  getVenues() {
    return apiClient.get('/api/venues', { auth: false });
  },

  createVenue(data) {
    return apiClient.post('/api/admin/venues', data);
  },

  updateVenue(id, data) {
    return apiClient.put(`/api/admin/venues/${id}`, data);
  },

  deleteVenue(id) {
    return apiClient.delete(`/api/admin/venues/${id}`);
  }
};

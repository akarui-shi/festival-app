import type { Category, City, Id, Venue } from '@/types';
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from './api-client';

export const directoryService = {
  async getCategories(): Promise<Category[]> {
    return apiGet<Category[]>('/categories');
  },

  async getCities(): Promise<City[]> {
    return apiGet<City[]>('/cities');
  },

  async getAdminCities(): Promise<City[]> {
    return apiGet<City[]>('/admin/cities');
  },

  async getVenues(): Promise<Venue[]> {
    return apiGet<Venue[]>('/venues');
  },

  async createCategory(data: Partial<Category>): Promise<Category> {
    return apiPost<Category>('/admin/categories', {
      name: data.name,
      description: data.description,
    });
  },

  async createCity(data: Partial<City>): Promise<City> {
    return apiPost<City>('/admin/cities', {
      name: data.name,
      region: data.region,
      active: data.active,
    });
  },

  async setCityActive(cityId: Id, active: boolean): Promise<City> {
    return apiPatch<City>(`/admin/cities/${cityId}/active`, { active });
  },

  async deleteCity(cityId: Id): Promise<void> {
    await apiDelete(`/admin/cities/${cityId}`);
  },

  async createVenue(data: Partial<Venue>): Promise<Venue> {
    return apiPost<Venue>('/admin/venues', {
      name: data.name,
      address: data.address,
      cityId: data.cityId == null ? undefined : Number(data.cityId),
      capacity: data.capacity,
      latitude: data.latitude == null ? undefined : Number(data.latitude),
      longitude: data.longitude == null ? undefined : Number(data.longitude),
    });
  },

  async updateVenue(id: Id, data: Partial<Venue>): Promise<Venue> {
    return apiPut<Venue>(`/admin/venues/${id}`, {
      name: data.name,
      address: data.address,
      cityId: data.cityId == null ? undefined : Number(data.cityId),
      capacity: data.capacity,
      latitude: data.latitude == null ? undefined : Number(data.latitude),
      longitude: data.longitude == null ? undefined : Number(data.longitude),
    });
  },

  async deleteVenue(id: Id): Promise<void> {
    await apiDelete(`/admin/venues/${id}`);
  },
};

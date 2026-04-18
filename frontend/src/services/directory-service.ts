import type { Category, City, Venue } from '@/types';
import { apiGet, apiPost } from './api-client';

export const directoryService = {
  async getCategories(): Promise<Category[]> {
    return apiGet<Category[]>('/categories');
  },

  async getCities(): Promise<City[]> {
    return apiGet<City[]>('/cities');
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
    });
  },

  async createVenue(data: Partial<Venue>): Promise<Venue> {
    return apiPost<Venue>('/admin/venues', {
      name: data.name,
      address: data.address,
      cityId: data.cityId == null ? undefined : Number(data.cityId),
      capacity: data.capacity,
    });
  },
};

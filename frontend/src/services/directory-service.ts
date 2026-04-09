import type { Category, City, Venue } from '@/types';
import { apiGet, apiPost } from './api-client';
import type { BackendCategory, BackendCity, BackendVenue } from './api-mappers';
import { mapCategory, mapCity, mapVenue } from './api-mappers';

export const directoryService = {
  async getCategories(): Promise<Category[]> {
    const response = await apiGet<BackendCategory[]>('/categories');
    return response.map(mapCategory);
  },

  async getCities(): Promise<City[]> {
    const response = await apiGet<BackendCity[]>('/cities');
    return response.map(mapCity);
  },

  async getVenues(): Promise<Venue[]> {
    const response = await apiGet<BackendVenue[]>('/venues');
    return response.map(mapVenue);
  },

  async createCategory(data: Partial<Category>): Promise<Category> {
    const response = await apiPost<BackendCategory>('/admin/categories', {
      name: data.name,
      description: data.slug,
    });
    return mapCategory(response);
  },

  async createCity(data: Partial<City>): Promise<City> {
    const response = await apiPost<BackendCity>('/admin/cities', {
      name: data.name,
      region: data.region,
    });
    return mapCity(response);
  },

  async createVenue(data: Partial<Venue>): Promise<Venue> {
    const response = await apiPost<BackendVenue>('/admin/venues', {
      name: data.name,
      address: data.address,
      cityId: data.cityId ? Number(data.cityId) : undefined,
      capacity: data.capacity,
    });
    return mapVenue(response);
  },
};

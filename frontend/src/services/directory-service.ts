import type { Category, City, Venue } from '@/types';
import { mockCategories, mockCities, mockVenues } from '@/data/mock-data';

const delay = (ms = 200) => new Promise(r => setTimeout(r, ms));

export const directoryService = {
  async getCategories(): Promise<Category[]> {
    await delay();
    return [...mockCategories];
  },

  async getCities(): Promise<City[]> {
    await delay();
    return [...mockCities];
  },

  async getVenues(): Promise<Venue[]> {
    await delay();
    return mockVenues.map(v => ({ ...v, city: mockCities.find(c => c.id === v.cityId) }));
  },

  async createCategory(data: Partial<Category>): Promise<Category> {
    await delay();
    const cat: Category = { id: `c${Date.now()}`, name: data.name || '', slug: data.slug || '' };
    mockCategories.push(cat);
    return cat;
  },

  async createCity(data: Partial<City>): Promise<City> {
    await delay();
    const city: City = { id: `city${Date.now()}`, name: data.name || '', region: data.region };
    mockCities.push(city);
    return city;
  },

  async createVenue(data: Partial<Venue>): Promise<Venue> {
    await delay();
    const venue: Venue = { id: `v${Date.now()}`, name: data.name || '', address: data.address || '', cityId: data.cityId || '', capacity: data.capacity };
    mockVenues.push(venue);
    return venue;
  },
};

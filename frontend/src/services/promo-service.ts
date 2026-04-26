import type { PromoCode, PromoValidation } from '@/types';
import { apiDelete, apiGet, apiPost } from './api-client';

export interface PromoCodeCreateInput {
  code: string;
  discountType: 'PERCENT' | 'FIXED' | 'FREE';
  discountValue?: number;
  maxUsages?: number;
  expiresAt?: string;
}

export const promoService = {
  async getAll(): Promise<PromoCode[]> {
    return apiGet<PromoCode[]>('/organizer/promo-codes');
  },

  async create(data: PromoCodeCreateInput): Promise<PromoCode> {
    return apiPost<PromoCode>('/organizer/promo-codes', data);
  },

  async remove(id: number | string): Promise<void> {
    await apiDelete(`/organizer/promo-codes/${id}`);
  },

  async validate(code: string): Promise<PromoValidation> {
    return apiGet<PromoValidation>('/promo-codes/validate', { code });
  },
};

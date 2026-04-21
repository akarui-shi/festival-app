import { apiGet, apiPost, apiPut } from './api-client';

export interface OrganizerOrganizationOption {
  id: number;
  name: string;
  membershipStatus?: string | null;
  cityId?: number | null;
  cityName?: string | null;
}

export interface WizardValidationIssue {
  code: string;
  message: string;
  step: string;
}

export interface WizardImageItem {
  eventImageId?: number | null;
  imageId?: number | null;
  primary?: boolean | null;
  sortOrder?: number | null;
}

export interface WizardArtistItem {
  artistId: number;
  name: string;
  stageName?: string | null;
  description?: string | null;
  genre?: string | null;
  imageId?: number | null;
}

export interface WizardTicketTypeItem {
  id?: number | null;
  name: string;
  price: number;
  currency?: string | null;
  quota: number;
  salesStartAt?: string | null;
  salesEndAt?: string | null;
}

export interface WizardSessionItem {
  sessionId?: number | null;
  sessionTitle?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  venueId?: number | null;
  venueName?: string | null;
  manualAddress?: string | null;
  cityId?: number | null;
  cityName?: string | null;
  cityRegion?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  seatLimit?: number | null;
  status?: string | null;
  ticketTypes?: WizardTicketTypeItem[] | null;
}

export interface OrganizerWizardState {
  eventId: number;
  status?: string | null;
  free?: boolean | null;
  organizationId?: number | null;
  organizationName?: string | null;
  cityId?: number | null;
  cityName?: string | null;
  title?: string | null;
  shortDescription?: string | null;
  fullDescription?: string | null;
  ageRestriction?: string | null;
  categoryIds?: number[] | null;
  categories?: Array<{ id: number; name: string; description?: string | null }> | null;
  images?: WizardImageItem[] | null;
  artists?: WizardArtistItem[] | null;
  sessions?: WizardSessionItem[] | null;
  validationIssues?: WizardValidationIssue[] | null;
  readyForModeration?: boolean;
}

export interface WizardCreateDraftPayload {
  title?: string;
}

export interface WizardBasicInfoPayload {
  title?: string;
  shortDescription?: string;
  fullDescription?: string;
  ageRestriction?: string;
}

export interface WizardCategoriesPayload {
  categoryIds: number[];
}

export interface WizardImagesPayload {
  images: Array<{
    imageId?: number;
    primary?: boolean;
    sortOrder?: number;
  }>;
}

export interface WizardArtistsPayload {
  artists?: Array<{
    artistId: number;
  }>;
}

export interface WizardSessionsPayload {
  sessions: Array<{
    id?: number;
    sessionTitle?: string;
    startsAt: string;
    endsAt?: string;
    venueId?: number;
    manualAddress?: string;
    cityId?: number;
    cityName?: string;
    cityRegion?: string;
    latitude?: number;
    longitude?: number;
    seatLimit?: number;
  }>;
}

export interface WizardTicketsPayload {
  freeEvent?: boolean;
  sessionTickets: Array<{
    sessionId: number;
    ticketTypes: Array<{
      id?: number;
      name: string;
      price: number;
      quota: number;
      salesStartAt?: string;
      salesEndAt?: string;
    }>;
  }>;
}

export const organizerEventWizardService = {
  getOrganizations(): Promise<OrganizerOrganizationOption[]> {
    return apiGet<OrganizerOrganizationOption[]>('/organizer/organizations');
  },

  createDraft(payload: WizardCreateDraftPayload): Promise<OrganizerWizardState> {
    return apiPost<OrganizerWizardState>('/organizer/events/wizard', payload);
  },

  getState(eventId: number | string): Promise<OrganizerWizardState> {
    return apiGet<OrganizerWizardState>(`/organizer/events/wizard/${eventId}`);
  },

  updateBasicInfo(eventId: number | string, payload: WizardBasicInfoPayload): Promise<OrganizerWizardState> {
    return apiPut<OrganizerWizardState>(`/organizer/events/wizard/${eventId}/basic-info`, payload);
  },

  updateCategories(eventId: number | string, payload: WizardCategoriesPayload): Promise<OrganizerWizardState> {
    return apiPut<OrganizerWizardState>(`/organizer/events/wizard/${eventId}/categories`, payload);
  },

  updateImages(eventId: number | string, payload: WizardImagesPayload): Promise<OrganizerWizardState> {
    return apiPut<OrganizerWizardState>(`/organizer/events/wizard/${eventId}/images`, payload);
  },

  updateArtists(eventId: number | string, payload: WizardArtistsPayload): Promise<OrganizerWizardState> {
    return apiPut<OrganizerWizardState>(`/organizer/events/wizard/${eventId}/artists`, payload);
  },

  updateSessions(eventId: number | string, payload: WizardSessionsPayload): Promise<OrganizerWizardState> {
    return apiPut<OrganizerWizardState>(`/organizer/events/wizard/${eventId}/sessions`, payload);
  },

  updateTickets(eventId: number | string, payload: WizardTicketsPayload): Promise<OrganizerWizardState> {
    return apiPut<OrganizerWizardState>(`/organizer/events/wizard/${eventId}/tickets`, payload);
  },

  preview(eventId: number | string): Promise<OrganizerWizardState> {
    return apiGet<OrganizerWizardState>(`/organizer/events/wizard/${eventId}/preview`);
  },

  saveDraft(eventId: number | string): Promise<OrganizerWizardState> {
    return apiPost<OrganizerWizardState>(`/organizer/events/wizard/${eventId}/save-draft`);
  },

  submit(eventId: number | string): Promise<OrganizerWizardState> {
    return apiPost<OrganizerWizardState>(`/organizer/events/wizard/${eventId}/submit`);
  },
};

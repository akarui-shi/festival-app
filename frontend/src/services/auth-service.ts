import type { AuthResponse, LoginRequest, MessageResponse, RegisterRequest, RegisterResponse, User } from '@/types';
import { API_BASE_URL, ApiError, apiGet, apiPatch, apiPost, apiPut, removeAuthToken } from './api-client';

const CURRENT_USER_KEY = 'current_user';
const CURRENT_USER_LOGIN_KEY = 'current_user_login';

function buildLoginFromEmail(email: string): string {
  const localPart = email.split('@')[0] || 'user';
  const normalized = localPart.toLowerCase().replace(/[^a-z0-9_]/g, '');
  return `${normalized || 'user'}_${Date.now().toString().slice(-6)}`;
}

function persistUser(user: User, login: string): void {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  localStorage.setItem(CURRENT_USER_LOGIN_KEY, login);
}

function clearSession(): void {
  removeAuthToken();
  localStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem(CURRENT_USER_LOGIN_KEY);
}

function resolveBackendBaseUrl(): string {
  const explicitBase = (import.meta.env.VITE_BACKEND_BASE_URL as string | undefined)?.replace(/\/$/, '');
  if (explicitBase) {
    return explicitBase;
  }

  if (/^https?:\/\//i.test(API_BASE_URL)) {
    const parsed = new URL(API_BASE_URL);
    return `${parsed.protocol}//${parsed.host}`;
  }

  if (import.meta.env.DEV) {
    return 'http://localhost:8080';
  }

  return window.location.origin;
}

function normalizeAuthResponse(response: AuthResponse): AuthResponse {
  persistUser(response.user, response.user.login);
  return response;
}


export const authService = {
  async login(req: LoginRequest): Promise<AuthResponse> {
    const response = await apiPost<AuthResponse>('/auth/login', {
      loginOrEmail: req.loginOrEmail,
      password: req.password,
    });

    return normalizeAuthResponse(response);
  },

  async register(req: RegisterRequest): Promise<RegisterResponse> {
    return apiPost<RegisterResponse>('/auth/register', {
      login: buildLoginFromEmail(req.email),
      email: req.email,
      password: req.password,
      firstName: req.firstName,
      lastName: req.lastName,
      newEventsNotificationsEnabled: req.newEventsNotificationsEnabled,
      role: req.role || 'RESIDENT',
      companyName: req.companyName,
      organizationId: req.organizationId,
      joinRequestMessage: req.joinRequestMessage,
    });
  },

  async verifyEmail(token: string): Promise<MessageResponse> {
    return apiPost<MessageResponse>('/auth/verify-email', { token });
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const user = await apiGet<User>('/users/me');
      persistUser(user, user.login);
      return user;
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        clearSession();
        return null;
      }
      throw error;
    }
  },

  async updateCurrentUser(data: Partial<User>): Promise<User> {
    const current = await this.getCurrentUser();
    if (!current) {
      throw new Error('Не авторизован');
    }

    const response = await apiPut<AuthResponse>('/users/me', {
      login: data.login ?? current.login,
      email: data.email ?? current.email,
      firstName: data.firstName ?? current.firstName,
      lastName: data.lastName ?? current.lastName,
      phone: data.phone ?? current.phone ?? '',
      newEventsNotificationsEnabled: data.newEventsNotificationsEnabled ?? current.newEventsNotificationsEnabled ?? false,
      avatarImageId: Object.prototype.hasOwnProperty.call(data, 'avatarImageId')
        ? data.avatarImageId
        : (current.avatarImageId ?? undefined),
    });

    return normalizeAuthResponse(response).user;
  },

  async changeCurrentPassword(currentPassword: string, newPassword: string): Promise<void> {
    await apiPatch<void>('/users/me/password', {
      currentPassword,
      newPassword,
    });
  },

  getOAuthLoginUrl(provider: 'google' | 'yandex'): string {
    return `${resolveBackendBaseUrl()}/oauth2/authorization/${provider}`;
  },

  async loginWithToken(_token?: string): Promise<User> {
    try {
      const user = await apiGet<User>('/users/me');
      persistUser(user, user.login);
      return user;
    } catch (error) {
      clearSession();
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        throw new Error('Не удалось получить данные пользователя после входа через соцсети');
      }
      throw error;
    }
  },

  async logout(): Promise<void> {
    try {
      await apiPost<void>('/auth/logout');
    } finally {
      clearSession();
    }
  },

  async getMyInterests(): Promise<number[]> {
    return apiGet<number[]>('/users/me/interests');
  },

  async updateMyInterests(categoryIds: number[]): Promise<void> {
    await apiPut<void>('/users/me/interests', categoryIds);
  },
};

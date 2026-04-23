import type { AuthResponse, LoginRequest, RegisterRequest, User } from '@/types';
import { API_BASE_URL, ApiError, apiGet, apiPatch, apiPost, apiPut, removeAuthToken, setAuthToken } from './api-client';

const CURRENT_USER_KEY = 'current_user';
const CURRENT_USER_LOGIN_KEY = 'current_user_login';

function buildLoginFromEmail(email: string): string {
  const localPart = email.split('@')[0] || 'user';
  const normalized = localPart.toLowerCase().replace(/[^a-z0-9_]/g, '');
  return `${normalized || 'user'}_${Date.now().toString().slice(-6)}`;
}

function persistUser(user: User, login: string, token?: string): void {
  if (token) {
    setAuthToken(token);
  }
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
  persistUser(response.user, response.user.login, response.token);
  return response;
}

async function fetchCurrentUserDirect(token: string): Promise<User> {
  const backendBaseUrl = resolveBackendBaseUrl();
  const response = await fetch(`${backendBaseUrl}/api/users/me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    // Important: do not send OAuth2 session cookies here.
    // We want backend to authenticate strictly by JWT token.
    credentials: 'omit',
  });

  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      message = data?.message || data?.error || message;
    } catch {
      // ignore json parsing errors for non-json responses
    }
    throw new ApiError(response.status, message);
  }

  return response.json() as Promise<User>;
}

export const authService = {
  async login(req: LoginRequest): Promise<AuthResponse> {
    const response = await apiPost<AuthResponse>('/auth/login', {
      loginOrEmail: req.loginOrEmail,
      password: req.password,
    });

    return normalizeAuthResponse(response);
  },

  async register(req: RegisterRequest): Promise<AuthResponse> {
    const response = await apiPost<AuthResponse>('/auth/register', {
      login: buildLoginFromEmail(req.email),
      email: req.email,
      password: req.password,
      firstName: req.firstName,
      lastName: req.lastName,
      role: req.role || 'RESIDENT',
      companyName: req.companyName,
      organizationId: req.organizationId,
      joinRequestMessage: req.joinRequestMessage,
    });

    return normalizeAuthResponse(response);
  },

  async getCurrentUser(): Promise<User | null> {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      return null;
    }

    try {
      const response = await apiGet<User>('/users/me');
      const user = response;
      persistUser(user, response.login);
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
      login: current.login,
      email: data.email ?? current.email,
      firstName: data.firstName ?? current.firstName,
      lastName: data.lastName ?? current.lastName,
      phone: data.phone ?? current.phone ?? '',
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

  getOAuthLoginUrl(provider: 'vk' | 'yandex'): string {
    return `${resolveBackendBaseUrl()}/oauth2/authorization/${provider}`;
  },

  async loginWithToken(token: string): Promise<User> {
    setAuthToken(token);
    try {
      const user = await fetchCurrentUserDirect(token);
      persistUser(user, user.login, token);
      return user;
    } catch (error) {
      clearSession();
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        throw new Error('Токен соцвхода отклонен сервером. Проверьте что frontend и backend запущены на одном окружении');
      }
      throw error;
    }
  },

  logout(): void {
    clearSession();
  },
};

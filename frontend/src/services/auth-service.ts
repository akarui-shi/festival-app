import type { AuthResponse, LoginRequest, RegisterRequest, User } from '@/types';
import { ApiError, apiGet, apiPost, apiPut, removeAuthToken, setAuthToken } from './api-client';
import type { BackendAuthResponse, BackendCurrentUser } from './api-mappers';
import { mapCurrentUser } from './api-mappers';

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

function normalizeAuthResponse(response: BackendAuthResponse): AuthResponse {
  const user = mapCurrentUser(response.user);
  persistUser(user, response.user.login, response.token);
  return { token: response.token, user };
}

export const authService = {
  async login(req: LoginRequest): Promise<AuthResponse> {
    const response = await apiPost<BackendAuthResponse>('/auth/login', {
      loginOrEmail: req.email,
      password: req.password,
    });

    return normalizeAuthResponse(response);
  },

  async register(req: RegisterRequest): Promise<AuthResponse> {
    const response = await apiPost<BackendAuthResponse>('/auth/register', {
      login: buildLoginFromEmail(req.email),
      email: req.email,
      password: req.password,
      firstName: req.firstName,
      lastName: req.lastName,
      role: req.role || 'RESIDENT',
      companyName: req.companyName,
    });

    return normalizeAuthResponse(response);
  },

  async getCurrentUser(): Promise<User | null> {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      return null;
    }

    try {
      const response = await apiGet<BackendCurrentUser>('/users/me');
      const user = mapCurrentUser(response);
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

    const login = localStorage.getItem(CURRENT_USER_LOGIN_KEY) || buildLoginFromEmail(current.email);
    const response = await apiPut<BackendAuthResponse>('/users/me', {
      login,
      email: data.email ?? current.email,
      firstName: data.firstName ?? current.firstName,
      lastName: data.lastName ?? current.lastName,
      phone: data.phone ?? current.phone ?? '',
      avatarUrl: data.avatarUrl ?? current.avatarUrl ?? '',
    });

    return normalizeAuthResponse(response).user;
  },

  logout(): void {
    clearSession();
  },
};

import type { User, AuthResponse, LoginRequest, RegisterRequest } from '@/types';
import { mockUsers, MOCK_PASSWORDS } from '@/data/mock-data';
import { setAuthToken, removeAuthToken } from './api-client';

const delay = (ms = 400) => new Promise(r => setTimeout(r, ms));

const CURRENT_USER_KEY = 'current_user';

export const authService = {
  async login(req: LoginRequest): Promise<AuthResponse> {
    await delay();
    const user = mockUsers.find(u => u.email === req.email);
    if (!user || MOCK_PASSWORDS[req.email] !== req.password) {
      throw new Error('Неверный email или пароль');
    }
    if (!user.active) throw new Error('Аккаунт деактивирован');
    const token = `mock-token-${user.id}-${Date.now()}`;
    setAuthToken(token);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return { user, token };
  },

  async register(req: RegisterRequest): Promise<AuthResponse> {
    await delay();
    if (mockUsers.find(u => u.email === req.email)) {
      throw new Error('Пользователь с таким email уже существует');
    }
    const newUser: User = {
      id: `u${Date.now()}`,
      email: req.email,
      firstName: req.firstName,
      lastName: req.lastName,
      role: 'RESIDENT',
      active: true,
      createdAt: new Date().toISOString(),
    };
    mockUsers.push(newUser);
    MOCK_PASSWORDS[req.email] = req.password;
    const token = `mock-token-${newUser.id}-${Date.now()}`;
    setAuthToken(token);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(newUser));
    return { user: newUser, token };
  },

  async getCurrentUser(): Promise<User | null> {
    await delay(100);
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    if (!stored) return null;
    try { return JSON.parse(stored); } catch { return null; }
  },

  async updateCurrentUser(data: Partial<User>): Promise<User> {
    await delay();
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    if (!stored) throw new Error('Не авторизован');
    const user = { ...JSON.parse(stored), ...data };
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  },

  logout(): void {
    removeAuthToken();
    localStorage.removeItem(CURRENT_USER_KEY);
  },
};

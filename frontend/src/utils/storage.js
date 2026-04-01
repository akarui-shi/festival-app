const TOKEN_KEY = 'festival_token';
const USER_KEY = 'festival_user';
const USER_CITY_KEY_PREFIX = 'festival_user_city';

const buildCityKey = (userId) => `${USER_CITY_KEY_PREFIX}_${userId || 'guest'}`;

export const authStorage = {
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },
  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  },
  getUser() {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clearUser() {
    localStorage.removeItem(USER_KEY);
  },
  clearAll() {
    this.clearToken();
    this.clearUser();
  },
  getPreferredCity(userId) {
    const raw = localStorage.getItem(buildCityKey(userId));
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setPreferredCity(userId, city) {
    if (!city) return;
    localStorage.setItem(buildCityKey(userId), JSON.stringify(city));
  },
  clearPreferredCity(userId) {
    localStorage.removeItem(buildCityKey(userId));
  }
};

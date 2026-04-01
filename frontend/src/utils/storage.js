const TOKEN_KEY = 'festival_token';
const USER_KEY = 'festival_user';
const SELECTED_CITY_KEY = 'festival_selected_city';

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
  getSelectedCity() {
    const raw = localStorage.getItem(SELECTED_CITY_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  setSelectedCity(city) {
    if (!city || !city.id) return;
    localStorage.setItem(SELECTED_CITY_KEY, JSON.stringify(city));
  },
  clearSelectedCity() {
    localStorage.removeItem(SELECTED_CITY_KEY);
  }
};

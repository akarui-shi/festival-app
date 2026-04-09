// Central API client. Currently uses mock data.
// Replace this with fetch/axios to connect to a real backend.

const API_BASE_URL = '/api';

// Simulate network delay
const delay = (ms = 300) => new Promise(resolve => setTimeout(resolve, ms));

export async function apiGet<T>(endpoint: string, _params?: Record<string, string>): Promise<T> {
  await delay();
  // In real implementation:
  // const url = new URL(`${API_BASE_URL}${endpoint}`);
  // if (params) Object.entries(params).forEach(([k,v]) => url.searchParams.set(k,v));
  // const res = await fetch(url.toString(), { headers: getAuthHeaders() });
  // if (!res.ok) throw new ApiError(res.status, await res.text());
  // return res.json();
  throw new Error(`Mock not implemented for GET ${endpoint}`);
}

export async function apiPost<T>(endpoint: string, _body?: unknown): Promise<T> {
  await delay();
  throw new Error(`Mock not implemented for POST ${endpoint}`);
}

export async function apiPut<T>(endpoint: string, _body?: unknown): Promise<T> {
  await delay();
  throw new Error(`Mock not implemented for PUT ${endpoint}`);
}

export async function apiPatch<T>(endpoint: string, _body?: unknown): Promise<T> {
  await delay();
  throw new Error(`Mock not implemented for PATCH ${endpoint}`);
}

export async function apiDelete(endpoint: string): Promise<void> {
  await delay();
  throw new Error(`Mock not implemented for DELETE ${endpoint}`);
}

export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

export function removeAuthToken(): void {
  localStorage.removeItem('auth_token');
}

function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export { API_BASE_URL, getAuthHeaders };

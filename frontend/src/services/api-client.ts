type QueryValue = string | number | boolean | null | undefined;

const DEFAULT_API_BASE_URL = '/api';
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') || DEFAULT_API_BASE_URL;

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions {
  params?: Record<string, QueryValue>;
  body?: BodyInit | FormData | object | null;
  headers?: Record<string, string>;
}

function buildUrl(endpoint: string, params?: Record<string, QueryValue>): string {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = new URL(`${API_BASE_URL}${path}`, window.location.origin);

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null || value === '') {
        continue;
      }
      url.searchParams.set(key, String(value));
    }
  }

  return url.pathname + url.search;
}

async function parseError(response: Response): Promise<ApiError> {
  let payload: any = null;

  try {
    payload = await response.clone().json();
  } catch {
    try {
      payload = await response.clone().text();
    } catch {
      payload = null;
    }
  }

  const message =
    payload?.message ||
    payload?.error ||
    (typeof payload === 'string' && payload) ||
    `HTTP ${response.status}`;

  return new ApiError(response.status, message, payload?.details);
}

async function request<T>(method: string, endpoint: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...getAuthHeaders(),
    ...options.headers,
  };

  let body: BodyInit | undefined;
  if (options.body instanceof FormData) {
    body = options.body;
  } else if (options.body != null) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  const response = await fetch(buildUrl(endpoint, options.params), {
    method,
    headers,
    body,
    credentials: 'same-origin',
  });

  if (!response.ok) {
    throw await parseError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function apiGet<T>(endpoint: string, params?: Record<string, QueryValue>): Promise<T> {
  return request<T>('GET', endpoint, { params });
}

export async function apiPost<T>(endpoint: string, body?: BodyInit | FormData | object | null): Promise<T> {
  return request<T>('POST', endpoint, { body });
}

export async function apiPut<T>(endpoint: string, body?: BodyInit | FormData | object | null): Promise<T> {
  return request<T>('PUT', endpoint, { body });
}

export async function apiPatch<T>(endpoint: string, body?: BodyInit | FormData | object | null): Promise<T> {
  return request<T>('PATCH', endpoint, { body });
}

export async function apiDelete<T = void>(endpoint: string): Promise<T> {
  return request<T>('DELETE', endpoint);
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

export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export { API_BASE_URL };

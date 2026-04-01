import { API_BASE_URL } from '../utils/config';
import { authStorage } from '../utils/storage';

const parseResponse = async (response) => {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const buildHeaders = (headers = {}, auth = true) => {
  const builtHeaders = {
    'Content-Type': 'application/json',
    ...headers
  };

  if (auth) {
    const token = authStorage.getToken();
    if (token) {
      builtHeaders.Authorization = `Bearer ${token}`;
    }
  }

  return builtHeaders;
};

const request = async (path, options = {}) => {
  const { method = 'GET', body, headers, auth = true } = options;
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: buildHeaders(headers, auth),
      body: body ? JSON.stringify(body) : undefined
    });
  } catch (networkError) {
    const error = new Error('Сервер недоступен');
    error.cause = networkError;
    throw error;
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    const message =
      (typeof payload === 'string' && payload.trim()) ||
      (payload && typeof payload === 'object' && (payload.error || payload.message)) ||
      `Ошибка запроса. Код: ${response.status}`;

    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
};

export const apiClient = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' })
};

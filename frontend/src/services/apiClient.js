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

const pickFirstValidationMessage = (payload) => {
  if (!payload || typeof payload !== 'object' || !payload.details || typeof payload.details !== 'object') {
    return '';
  }

  const firstValue = Object.values(payload.details).find((value) => typeof value === 'string' && value.trim());
  return firstValue ? firstValue.trim() : '';
};

const buildHeaders = (headers = {}, auth = true, isFormData = false) => {
  const builtHeaders = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...headers
  };

  if (builtHeaders['Content-Type'] === undefined || builtHeaders['Content-Type'] === null) {
    delete builtHeaders['Content-Type'];
  }

  if (auth) {
    const token = authStorage.getToken();
    if (token) {
      builtHeaders.Authorization = `Bearer ${token}`;
    }
  }

  return builtHeaders;
};

const request = async (path, options = {}) => {
  const { method = 'GET', body, headers, auth = true, isFormData = false } = options;
  const requestBody =
    body === undefined
      ? undefined
      : isFormData
        ? body
        : JSON.stringify(body);

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: buildHeaders(headers, auth, isFormData),
      body: requestBody
    });
  } catch (networkError) {
    const error = new Error('Сервер недоступен');
    error.cause = networkError;
    throw error;
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    const validationMessage = pickFirstValidationMessage(payload);
    const message =
      validationMessage ||
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
  postForm: (path, formData, options) => request(path, { ...options, method: 'POST', body: formData, isFormData: true }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' })
};

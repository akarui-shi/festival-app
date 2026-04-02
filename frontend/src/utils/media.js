import { API_BASE_URL } from './config';

const safeParseUrl = (value) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

export const resolveMediaUrl = (value) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  const raw = value.trim();
  if (!raw) {
    return '';
  }

  if (raw.startsWith('data:') || raw.startsWith('blob:')) {
    return raw;
  }

  const parsed = safeParseUrl(raw);
  if (parsed) {
    const apiParsed = safeParseUrl(API_BASE_URL);
    if (apiParsed && parsed.hostname === 'localhost' && apiParsed.hostname === '127.0.0.1') {
      return `${apiParsed.protocol}//${apiParsed.host}${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return raw;
  }

  if (raw.startsWith('/')) {
    return `${API_BASE_URL}${raw}`;
  }

  return `${API_BASE_URL}/${raw.replace(/^\/+/, '')}`;
};

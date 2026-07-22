const DEFAULT_API_BASE_URL = 'http://localhost:3000/api/v1';

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL;

/** Socket.IO server root — strip `/api/v1` suffix from API base URL. */
export function getSocketUrl(): string {
  return API_BASE_URL.replace(/\/api\/v\d+\/?$/, '').replace(/\/$/, '');
}

export const STORAGE_KEYS = {
  accessToken: 'accessToken',
  refreshToken: 'refreshToken',
  mustChangePassword: 'mustChangePassword',
  colorMode: 'colorMode',
} as const;

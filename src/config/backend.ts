export const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL ?? '';
export const BACKEND_AUTH_USER_ID = process.env.EXPO_PUBLIC_BACKEND_AUTH_USER_ID ?? '';
export const BACKEND_AUTH_SECRET_KEY = process.env.EXPO_PUBLIC_BACKEND_AUTH_SECRET_KEY ?? '';

export function isBackendConfigured(): boolean {
  return !!(BACKEND_BASE_URL && BACKEND_AUTH_USER_ID && BACKEND_AUTH_SECRET_KEY);
}

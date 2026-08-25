const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Minimal, dependency-free base64 decoder — used instead of the global
 * `atob` because its availability isn't guaranteed across every Hermes/RN
 * runtime this app might run on, and this only needs to decode two short
 * strings once at module load.
 */
function base64Decode(input: string): string {
  const clean = input.replace(/=+$/, '');
  let bits = '';
  for (const char of clean) {
    const index = BASE64_ALPHABET.indexOf(char);
    if (index === -1) continue;
    bits += index.toString(2).padStart(6, '0');
  }
  let output = '';
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    output += String.fromCharCode(parseInt(bits.slice(i, i + 8), 2));
  }
  return output;
}

export const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL ?? '';

// Decoded from base64 — see the .env comment for why the raw values (which
// contain literal "$" characters, e.g. the bcrypt-shaped secret key) can't
// be stored directly without Expo's env loader silently corrupting them.
export const BACKEND_AUTH_USER_ID = base64Decode(process.env.EXPO_PUBLIC_BACKEND_AUTH_USER_ID_B64 ?? '');
export const BACKEND_AUTH_SECRET_KEY = base64Decode(process.env.EXPO_PUBLIC_BACKEND_AUTH_SECRET_KEY_B64 ?? '');

export function isBackendConfigured(): boolean {
  return !!(BACKEND_BASE_URL && BACKEND_AUTH_USER_ID && BACKEND_AUTH_SECRET_KEY);
}

import { BACKEND_AUTH_SECRET_KEY, BACKEND_AUTH_USER_ID, BACKEND_BASE_URL } from '../config/backend';
import { getDeviceId } from '../lib/deviceId';

/**
 * Client for the StockLab backend gateway.
 *
 * Two endpoints, confirmed working directly against the live server:
 *   POST {BASE_URL}/st/AuthSP     { userId, secretKey } -> { status, message, token }
 *   POST {BASE_URL}/st/myhandler  { theKey, ... }        -> theKey-specific shape
 *
 * `theKey` picks the operation (see BACKEND-ENDPOINTS.md for the full table
 * from the source doc). Every non-exempt key also requires three headers —
 * refID, phone, deviceid — established by logging in (G22) and then calling
 * G1001 to mint a transaction token. Exempt keys (G1001, G10, G11, G18, G19,
 * "Pay") skip that check and only need the AuthSP bearer token.
 *
 * SECURITY NOTE: BACKEND_AUTH_SECRET_KEY is a bootstrap credential for the
 * app itself, not a per-user secret — but it still ships inside the app
 * bundle on every install, so it is not actually secret once the app is
 * built. Treat it as "raises the bar for casual/accidental traffic," not as
 * real protection for anything sensitive. See the .env comment for more.
 *
 * VERIFIED against the live server: AuthSP token issuance, and that
 * unauthenticated myhandler calls correctly get rejected with
 * {IsValid:false, Message:"Login Again!"}. NOT yet verified: the exact
 * request/response shape of any individual theKey (login, register,
 * setFigure, etc.) — those are implemented from the source documentation
 * only and are marked accordingly in httpApi.ts. Confirm each one against
 * real responses before relying on it.
 */

interface Session {
  phone: string;
  refID: string; // trans_token from G1001, sent as the `refID` header
}

let session: Session | null = null;
let cachedBearerToken: string | null = null;
let cachedAt = 0;
const TOKEN_TTL_MS = 30 * 60 * 1000; // AuthSP tokens are actually valid ~1000h; 30min is a conservative refresh window

export function setSession(next: Session | null) {
  session = next;
}

export function getSession(): Session | null {
  return session;
}

async function fetchBearerToken(): Promise<string> {
  const res = await fetch(`${BACKEND_BASE_URL}/st/AuthSP`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: BACKEND_AUTH_USER_ID, secretKey: BACKEND_AUTH_SECRET_KEY }),
  });
  const data = await res.json();
  if (data?.status !== 'success' || !data?.token) {
    throw new Error(data?.message || 'Could not authenticate with the backend.');
  }
  return data.token as string;
}

async function getBearerToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedBearerToken && Date.now() - cachedAt < TOKEN_TTL_MS) {
    return cachedBearerToken;
  }
  cachedBearerToken = await fetchBearerToken();
  cachedAt = Date.now();
  return cachedBearerToken;
}

export class BackendError extends Error {}

/**
 * Calls a gateway operation by theKey.
 *
 * @param theKey       Which operation to run (e.g. "G12", "NEWS").
 * @param params        Request fields, wrapped under "jsonData" for every
 *                      key except G22 which the doc names "jsonInput".
 *                      ASSUMPTION: the doc names this field like a literal
 *                      request key; unverified against a live non-NEWS call.
 * @param opts.paramsField  Override the wrapper field name ("jsonData" default).
 * @param opts.requiresSession  Whether to attach refID/phone/deviceid headers
 *                      (true for anything not in the exempt list).
 */
export async function callGateway<T = any>(
  theKey: string,
  params?: Record<string, unknown>,
  opts: { paramsField?: string; requiresSession?: boolean } = {}
): Promise<T> {
  const { paramsField = 'jsonData', requiresSession = true } = opts;

  const body: Record<string, unknown> = { theKey };
  if (params) body[paramsField] = params;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${await getBearerToken()}`,
  };

  if (requiresSession) {
    if (!session) throw new BackendError('Not logged in.');
    headers.refID = session.refID;
    headers.phone = session.phone;
    headers.deviceid = await getDeviceId();
  }

  const res = await fetch(`${BACKEND_BASE_URL}/st/myhandler`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = await res.json();

  // Response shapes are inconsistent across keys (confirmed live: AuthSP
  // uses lowercase status/message, myhandler's own auth failure uses
  // PascalCase IsValid/Message). Check both.
  if (data?.IsValid === false || data?.success === false || data?.status === 'error') {
    throw new BackendError(data?.Message || data?.message || `${theKey} failed.`);
  }

  return data as T;
}

import { BACKEND_AUTH_SECRET_KEY, BACKEND_AUTH_USER_ID, BACKEND_BASE_URL } from '../config/backend';
import { getDeviceId } from '../lib/deviceId';

/**
 * Client for the StockLab backend gateway.
 *
 * Two endpoints, confirmed working directly against the live server:
 *   POST {BASE_URL}/st/AuthSP     { userId, secretKey } -> { status, message, token }
 *   POST {BASE_URL}/st/myhandler  { theKey, ... }        -> theKey-specific shape
 *
 * `theKey` picks the operation. Every non-exempt key requires three headers —
 * refID, phone, deviceid. refID is a trans_token minted by G1001 from the
 * G22 SessionID.
 *
 * CONFIRMED LIVE: trans_token is SINGLE-USE, not a session-lived credential.
 * A token validated successfully for one call, then failed on every call
 * after that with the same token ("Unauthorized User Access"). So a fresh
 * one is minted via G1001 before every single protected call, not once at
 * login — see mintTransToken() below and how it's used in callGateway().
 *
 * SECURITY NOTE: BACKEND_AUTH_SECRET_KEY is a bootstrap credential for the
 * app itself, not a per-user secret — but it still ships inside the app
 * bundle on every install, so it is not actually secret once the app is
 * built. Treat it as "raises the bar for casual/accidental traffic," not as
 * real protection for anything sensitive. See the .env comment for more.
 */

export interface Session {
  phone: string;
  sessionId: string; // SessionID from G22 — used to mint a fresh trans_token before every protected call
}

/**
 * Every request/response log below runs through this instead of a bare
 * console.log. These traces include session tokens (refID/trans_token,
 * SessionID) and full response bodies — fine to see live while developing,
 * but they'd otherwise ship into every production build too, landing in
 * device system logs (readable via adb logcat, or by any app with log-read
 * permissions on some Android versions) for anyone who later gets physical/
 * USB access to a release build. __DEV__ is false in a release build, so
 * this keeps the traces dev-only without touching any call site's logic.
 */
function devLog(...args: unknown[]) {
  if (__DEV__) console.log(...args);
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

/**
 * Called when the server rejects a call with `IsValid: false` — per the
 * validation-flow doc, that's specifically the central auth pipeline
 * (IsUserLoggedIn / device / trans-token checks), never a business-logic
 * response (those use lowercase success/status instead). CONFIRMED live:
 * the server can invalidate IsUserLoggedIn(phone) — "Login Again!" — while
 * G1001 (exempt from that check) keeps minting tokens fine, so the app was
 * silently retrying and failing forever with a session the server had
 * already killed. authStore registers a handler here once, at startup, to
 * force a logout so the app falls back to the login screen instead.
 */
let sessionInvalidatedHandler: (() => void) | null = null;

export function onSessionInvalidated(handler: () => void) {
  sessionInvalidatedHandler = handler;
}

async function fetchBearerToken(): Promise<string> {
  devLog(`[backend] -> AuthSP (${BACKEND_BASE_URL})`);
  let res: Response;
  try {
    res = await fetch(`${BACKEND_BASE_URL}/st/AuthSP`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: BACKEND_AUTH_USER_ID, secretKey: BACKEND_AUTH_SECRET_KEY }),
    });
  } catch (networkError) {
    devLog('[backend] <- AuthSP NETWORK ERROR', networkError);
    throw new BackendError(
      'Could not reach the server. Check your internet connection and try again.'
    );
  }
  const data = await res.json();
  devLog('[backend] <- AuthSP', { status: data?.status, message: data?.message, hasToken: !!data?.token });
  if (data?.status !== 'success' || !data?.token) {
    throw new BackendError(data?.message || 'Could not connect to the server. Please try again.');
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
 * Serializes protected calls so a "mint token -> use token" pair always
 * completes before the next one starts. Needed because trans_token appears
 * to be valid only for the single most-recently-minted token per session/
 * device — confirmed live: a live-refresh G13 and a user-triggered G12
 * fired close together, each minted its own fresh token, and the earlier
 * one came back "Unauthorized User Access" even though it had never been
 * used yet. Without this queue, any two protected calls that overlap in
 * time (e.g. the 1s live-refresh tick landing next to a user action) race.
 */
let sessionCallQueue: Promise<unknown> = Promise.resolve();

function withSessionLock<T>(fn: () => Promise<T>): Promise<T> {
  const result = sessionCallQueue.then(fn, fn);
  sessionCallQueue = result.catch(() => {});
  return result;
}

/**
 * Mints a fresh, single-use trans_token from the stored G22 SessionID.
 * Called automatically before every protected request — see callGateway().
 */
async function mintTransToken(phone: string, sessionId: string, deviceId: string): Promise<string> {
  const bearer = await getBearerToken();
  devLog('[backend] -> G1001 (fresh token)', { phone, deviceId });

  let res: Response;
  try {
    res = await fetch(`${BACKEND_BASE_URL}/st/myhandler`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bearer}` },
      body: JSON.stringify({ theKey: 'G1001', sessionToken: sessionId, phone, deviceId }),
    });
  } catch (networkError) {
    devLog('[backend] <- G1001 NETWORK ERROR', networkError);
    throw new BackendError('Could not reach the server. Check your internet connection and try again.');
  }

  const data = await res.json();
  devLog('[backend] <- G1001 (fresh token)', data);
  if (!data?.success || !data?.trans_token) {
    // CONFIRMED live: this happens whenever the stored SessionID is dead —
    // e.g. invalidated by a login from elsewhere (another device, or a
    // fresh G22 for the same phone) — same underlying problem callGateway's
    // IsValid:false branch handles below, just surfaced through G1001
    // instead of the protected call itself. Without this, it fell through
    // as a generic "could not start a secure session" error that retrying
    // can never fix (the session really is gone), leaving the user stuck
    // instead of being cleanly logged out and sent back to the login screen.
    session = null;
    sessionInvalidatedHandler?.();
    throw new BackendError(data?.message || 'Your session has expired. Please log in again.');
  }
  return data.trans_token as string;
}

/**
 * Calls a gateway operation by theKey.
 *
 * @param theKey       Which operation to run (e.g. "G12", "NEWS").
 * @param params        Request fields.
 * @param opts.paramsField  How `params` get attached to the body:
 *                      - omitted (default): spread flat at the top level,
 *                        alongside theKey — e.g. {theKey, Phone, ...}.
 *                        CONFIRMED live this way for every key tested so far.
 *                      - a string: nested under that key instead, e.g.
 *                        {theKey, jsonData: {...}}.
 * @param opts.requiresSession  Whether this call needs a freshly-minted
 *                      refID/phone/deviceid (true for anything not in the
 *                      exempt list — G1001, G10, G11, G20, G21, "PAY").
 */
const SENSITIVE_FIELDS = ['pincode', 'PinCode', 'password', 'NewPassword', 'otp', 'OTP', 'secretKey'];

function redact(params: Record<string, unknown> | undefined): Record<string, unknown> {
  if (!params) return {};
  const copy: Record<string, unknown> = { ...params };
  for (const key of SENSITIVE_FIELDS) {
    if (key in copy) copy[key] = '***';
  }
  return copy;
}

export async function callGateway<T = any>(
  theKey: string,
  params?: Record<string, unknown>,
  opts: { paramsField?: string; requiresSession?: boolean } = {}
): Promise<T> {
  const { paramsField, requiresSession = true } = opts;

  const body: Record<string, unknown> = { theKey };
  if (params) {
    if (paramsField) {
      body[paramsField] = params;
    } else {
      Object.assign(body, params);
    }
  }

  async function sendRequest(): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${await getBearerToken()}`,
    };

    if (requiresSession) {
      if (!session) throw new BackendError('You need to log in again.');
      const deviceId = await getDeviceId();
      // Fresh token per call — trans_token is single-use, confirmed live.
      const freshToken = await mintTransToken(session.phone, session.sessionId, deviceId);
      headers.refID = freshToken;
      headers.phone = session.phone;
      headers.deviceid = deviceId;
    }

    const sessionHeaders = requiresSession
      ? { refID: headers.refID, phone: headers.phone, deviceid: headers.deviceid }
      : '(exempt — no session headers sent)';
    devLog(`[backend] -> ${theKey}`, redact(params), sessionHeaders);

    let res: Response;
    try {
      res = await fetch(`${BACKEND_BASE_URL}/st/myhandler`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
    } catch (networkError) {
      devLog(`[backend] <- ${theKey} NETWORK ERROR`, networkError);
      throw new BackendError(
        'Could not reach the server. Check your internet connection and try again.'
      );
    }

    let data: any;
    try {
      data = await res.json();
    } catch {
      devLog(`[backend] <- ${theKey} non-JSON response, status ${res.status}`);
      throw new BackendError('The server sent back an unexpected response. Please try again.');
    }

    devLog(`[backend] <- ${theKey}`, data);

    // Response shapes are inconsistent across keys (confirmed live: AuthSP
    // uses lowercase status/message; myhandler's own auth failure uses
    // PascalCase IsValid/Message; G12's "Balance Allocated to Slot is too
    // low" used a boolean `status: false` instead of `success: false` — a
    // real response that the old `status === 'error'` check missed
    // entirely, which would have silently treated a rejected prediction as
    // a success). Check every shape we've actually seen fail.
    if (data?.IsValid === false) {
      // Per the validation-flow doc, IsValid:false only ever comes from the
      // central auth pipeline (IsUserLoggedIn/device/trans-token checks) —
      // never a business-logic rejection, those use lowercase success/status
      // instead. Confirmed live: the server can invalidate the login session
      // out from under a still-working device/token pairing ("Login Again!"
      // while G1001 kept minting tokens fine) — no amount of retrying fixes
      // that from the client, so force a logout instead of failing forever.
      session = null;
      sessionInvalidatedHandler?.();
      throw new BackendError(data?.Message || 'Your session has expired. Please log in again.');
    }
    if (data?.success === false || data?.status === false || data?.status === 'error') {
      throw new BackendError(data?.message || 'That didn\'t work. Please try again.');
    }

    return data as T;
  }

  // Protected calls mint-then-use a single-use token; run them one at a
  // time so a concurrent call (e.g. the live-refresh tick) can't mint a
  // newer token that invalidates this one before it's used. Exempt calls
  // don't touch the per-user token, so they can run freely.
  return requiresSession ? withSessionLock(sendRequest) : sendRequest();
}

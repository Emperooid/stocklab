// Standalone diagnostic: log in for real, then call G13 directly and print
// the raw response — bypasses the app entirely so we can see exactly what
// the backend returns without digging through device logs.
//
// Usage (PowerShell):
//   node scripts/test-g13.js 08012345678 yourpin
//   node scripts/test-g13.js 08012345678 yourpin 2026-08-24   (optional date override, YYYY-MM-DD)
//
// Reads backend config from .env in the project root (same values the app
// itself uses).

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const raw = fs.readFileSync(envPath, 'utf8');
  const vars = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return vars;
}

const env = loadEnv();
const BASE_URL = env.EXPO_PUBLIC_BACKEND_BASE_URL;
const USER_ID = Buffer.from(env.EXPO_PUBLIC_BACKEND_AUTH_USER_ID_B64, 'base64').toString('utf8');
const SECRET_KEY = Buffer.from(env.EXPO_PUBLIC_BACKEND_AUTH_SECRET_KEY_B64, 'base64').toString('utf8');

const [, , phone, pin, dateOverride, deviceIdArg] = process.argv;
if (!phone || !pin) {
  console.error('Usage: node scripts/test-g13.js <phone> <pin> [YYYY-MM-DD] [deviceId]');
  process.exit(1);
}

// CONFIRMED live: G1001 silently rejects a never-before-seen deviceId
// ({"success":false,"trans_token":""}, no error message) — pass the real,
// already-registered deviceId (visible on the Profile screen) to get past
// this, same as scripts/test-play.js.
const deviceId = deviceIdArg || 'test-g13-' + crypto.randomBytes(4).toString('hex');

function localDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function post(pathname, body, headers) {
  const res = await fetch(`${BASE_URL}${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function main() {
  console.log('--- AuthSP (bearer token) ---');
  const authRes = await post('/st/AuthSP', { userId: USER_ID, secretKey: SECRET_KEY });
  console.log(authRes.status, { status: authRes.data?.status, message: authRes.data?.message, hasToken: !!authRes.data?.token });
  const bearer = authRes.data?.token;
  if (!bearer) throw new Error('No bearer token — check BACKEND_AUTH_USER_ID/SECRET_KEY in .env');

  console.log('\n--- G22 (login) ---');
  const loginRes = await post(
    '/st/myhandler',
    { theKey: 'G22', PhoneNo: phone, PinCode: pin, DeviceID: deviceId },
    { Authorization: `Bearer ${bearer}` }
  );
  console.log(loginRes.status, loginRes.data);
  const sessionId = loginRes.data?.SessionID;
  if (!sessionId) throw new Error('Login failed — no SessionID returned. Check phone/pin.');

  console.log('\n--- G1001 (mint trans_token) ---');
  const tokenRes = await post(
    '/st/myhandler',
    { theKey: 'G1001', sessionToken: sessionId, phone, deviceId },
    { Authorization: `Bearer ${bearer}` }
  );
  console.log(tokenRes.status, tokenRes.data);
  const transToken = tokenRes.data?.trans_token;
  if (!transToken) throw new Error('Could not mint trans_token.');

  const date = dateOverride || localDateKey(new Date());
  console.log(`\n--- G13 (results, date=${date}) ---`);
  const g13Res = await post(
    '/st/myhandler',
    { theKey: 'G13', phone, date },
    { Authorization: `Bearer ${bearer}`, refID: transToken, phone, deviceid: deviceId }
  );
  console.log(g13Res.status);
  console.log(JSON.stringify(g13Res.data, null, 2));
  console.log(
    `\nType: ${Array.isArray(g13Res.data) ? `array (${g13Res.data.length} entries)` : typeof g13Res.data}`
  );
}

main().catch((err) => {
  console.error('\nFAILED:', err.message);
  process.exit(1);
});

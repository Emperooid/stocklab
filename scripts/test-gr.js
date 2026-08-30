// Standalone diagnostic: log in for real, then call GR (deposit requery)
// directly and print the raw response — specifically to capture the exact
// payHookResponse shape (confirmed to be JSON + trailing raw HTML glued
// together, a PayHook.aspx bug) so it can be relayed precisely.
//
// Usage (PowerShell):
//   node scripts/test-gr.js 08012345678 yourpin YOUR-REFERENCE
//   node scripts/test-gr.js 08012345678 yourpin YOUR-REFERENCE deviceId
//
// Reads backend config from .env in the project root (same values the app
// itself uses). Credentials never leave your machine — this only talks to
// the backend directly, nothing is sent anywhere else.

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

const [, , phone, pin, reference, deviceIdArg] = process.argv;
if (!phone || !pin || !reference) {
  console.error('Usage: node scripts/test-gr.js <phone> <pin> <reference> [deviceId]');
  process.exit(1);
}

// CONFIRMED live: G1001 silently rejects a never-before-seen deviceId
// ({"success":false,"trans_token":""}, no error message) — pass the real,
// already-registered deviceId (visible on the Profile screen) to get past
// this, same as scripts/test-g13.js.
const deviceId = deviceIdArg || 'test-gr-' + crypto.randomBytes(4).toString('hex');

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

  console.log(`\n--- GR (requery, refNo=${reference}) ---`);
  const grRes = await post(
    '/st/myhandler',
    { theKey: 'GR', phone, refNo: reference },
    { Authorization: `Bearer ${bearer}`, refID: transToken, phone, deviceid: deviceId }
  );
  console.log(grRes.status);
  console.log(JSON.stringify(grRes.data, null, 2));

  const payHookResponse = grRes.data?.payHookResponse;
  if (typeof payHookResponse === 'string') {
    console.log('\n--- payHookResponse raw string (this is the field to inspect for the malformed JSON+HTML bug) ---');
    console.log(payHookResponse);
    const htmlStart = payHookResponse.search(/<!DOCTYPE|<html/i);
    if (htmlStart > 0) {
      console.log(`\n>>> Confirmed: raw HTML starts at character ${htmlStart}, right after what looks like JSON.`);
      console.log('>>> JSON portion:', payHookResponse.slice(0, htmlStart));
    } else {
      console.log('\n>>> No embedded HTML detected this time — payHookResponse looks like clean JSON.');
    }
  }
}

main().catch((err) => {
  console.error('\nFAILED:', err.message);
  process.exit(1);
});

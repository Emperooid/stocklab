#!/usr/bin/env node
/**
 * Tests the Cards game's real backend endpoints (C1-C6) live, printing raw
 * responses so the actual shapes can be confirmed before wiring cardsStore.ts
 * to them. Never fabricates results.
 *
 * Usage: node scripts/test-card-endpoints.js <phone> <password> [deviceId]
 */
const fs = require('fs');
const path = require('path');

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

const [, , phone, password, deviceIdArg] = process.argv;
if (!phone || !password) {
  console.error('Usage: node scripts/test-card-endpoints.js <phone> <password> [deviceId]');
  process.exit(1);
}
const deviceId = deviceIdArg || 'test-cards-' + Math.random().toString(36).slice(2);

async function post(pathname, body, headers) {
  const res = await fetch(`${BASE_URL}${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(headers || {}) },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { __nonJson: true, status: res.status, body: text.slice(0, 1000) };
  }
  return { status: res.status, json };
}

let bearer, sessionId, refId;

async function mintBearer() {
  const result = await post('/st/AuthSP', { userId: USER_ID, secretKey: SECRET_KEY });
  bearer = result.json.token;
  return result;
}

async function mintRef() {
  const result = await post(
    '/st/myhandler',
    { theKey: 'G1001', sessionToken: sessionId, phone, deviceId },
    { Authorization: `Bearer ${bearer}` }
  );
  refId = result.json.trans_token;
  return result;
}

async function call(theKey, params) {
  await mintRef();
  const headers = { Authorization: `Bearer ${bearer}`, refID: refId, phone, deviceid: deviceId };
  return post('/st/myhandler', { theKey, ...params }, headers);
}

(async () => {
  console.log(`\n=== Card game (C1-C6) live probe — ${new Date().toISOString()} ===`);
  console.log(`Phone: ${phone}  DeviceID: ${deviceId}\n`);

  await mintBearer();
  const loginRes = await post('/st/myhandler', { theKey: 'G22', PhoneNo: phone, PinCode: password, DeviceID: deviceId }, { Authorization: `Bearer ${bearer}` });
  sessionId = loginRes.json.SessionID;
  console.log('--- Login (G22) ---\n', JSON.stringify(loginRes.json, null, 2).slice(0, 500), '\n');

  // C3 — GetMyCards(Phone)
  {
    const { status, json } = await call('C3', { Phone: phone });
    console.log(`--- C3 GetMyCards (HTTP ${status}) ---\n`, JSON.stringify(json, null, 2), '\n');
  }

  // C4 — GetCardResultsAll() — no params
  {
    const { status, json } = await call('C4', {});
    console.log(`--- C4 GetCardResultsAll (HTTP ${status}) ---\n`, JSON.stringify(json, null, 2).slice(0, 2000), '\n');
  }

  // C5 — GetCardsResultByPhone(Phone)
  {
    const { status, json } = await call('C5', { Phone: phone });
    console.log(`--- C5 GetCardsResultByPhone (HTTP ${status}) ---\n`, JSON.stringify(json, null, 2).slice(0, 2000), '\n');
  }

  // C6 — GetOpenCardsAvailable() — no params
  {
    const { status, json } = await call('C6', {});
    console.log(`--- C6 GetOpenCardsAvailable (HTTP ${status}) ---\n`, JSON.stringify(json, null, 2).slice(0, 2000), '\n');
  }

  console.log('=== Done — C1 (SetCardValue) and C2 (theGuessCardValue) intentionally NOT called here (real financial side effects, test account has ₦0 balance) ===');
})().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});

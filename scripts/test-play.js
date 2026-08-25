// Standalone diagnostic: log in for real, check balance, play a round (G12),
// then check balance again — bypasses the app entirely so we can see the
// raw request/response and whether the balance actually moves.
//
// Usage (PowerShell):
//   node scripts/test-play.js <phone> <pin> <slot 1-24> <value 1-5> <amount>
//
// Example: play slot 14 with a predicted value of 3, staking 500:
//   node scripts/test-play.js 08012345678 yourpin 14 3 500
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

const [, , phone, pin, slotArg, valueArg, amountArg, deviceIdArg] = process.argv;
if (!phone || !pin || !slotArg || !valueArg || !amountArg) {
  console.error('Usage: node scripts/test-play.js <phone> <pin> <slot 1-24> <value 1-5> <amount> [deviceId]');
  process.exit(1);
}
const slot = Number(slotArg);
const value = Number(valueArg);
const amount = Number(amountArg);

// CONFIRMED live: G1001 silently rejects a never-before-seen deviceId
// ({"success":false,"trans_token":""}, no error message) — pass the real,
// already-registered deviceId (visible on the Profile screen) as the 6th
// arg to get past this. A freshly-generated one only works for keys that
// don't mint a trans_token.
const deviceId = deviceIdArg || `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;

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

async function mintToken(bearer, sessionId) {
  const res = await post(
    '/st/myhandler',
    { theKey: 'G1001', sessionToken: sessionId, phone, deviceId },
    { Authorization: `Bearer ${bearer}` }
  );
  if (!res.data?.trans_token) throw new Error('Could not mint trans_token: ' + JSON.stringify(res.data));
  return res.data.trans_token;
}

async function getBalance(bearer, transToken) {
  const res = await post(
    '/st/myhandler',
    { theKey: 'G25', phone },
    { Authorization: `Bearer ${bearer}`, refID: transToken, phone, deviceid: deviceId }
  );
  return res;
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

  console.log('\n--- G25 (balance BEFORE) ---');
  let transToken = await mintToken(bearer, sessionId);
  const balBefore = await getBalance(bearer, transToken);
  console.log(balBefore.status, balBefore.data);

  console.log(`\n--- G12 (play slot=${slot}, predfigure=${value}, SlotAmount=${amount}) ---`);
  transToken = await mintToken(bearer, sessionId);
  const playRes = await post(
    '/st/myhandler',
    { theKey: 'G12', slot: String(slot), phone, predfigure: String(value), SlotAmount: String(amount) },
    { Authorization: `Bearer ${bearer}`, refID: transToken, phone, deviceid: deviceId }
  );
  console.log(playRes.status, playRes.data);

  console.log('\n--- G25 (balance AFTER) ---');
  transToken = await mintToken(bearer, sessionId);
  const balAfter = await getBalance(bearer, transToken);
  console.log(balAfter.status, balAfter.data);

  const before = Number(balBefore.data?.balance ?? NaN);
  const after = Number(balAfter.data?.balance ?? NaN);
  console.log(`\nBalance before: ${before}`);
  console.log(`Balance after:  ${after}`);
  console.log(`Difference:     ${after - before}`);
}

main().catch((err) => {
  console.error('\nFAILED:', err.message);
  process.exit(1);
});

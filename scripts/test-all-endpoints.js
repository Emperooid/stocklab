#!/usr/bin/env node
/**
 * Runs every endpoint in postman/CrowdStock-Backend.postman_collection.json
 * against the live backend for real, and prints a clean, labeled report of
 * each one's actual response or error — meant to be copy-pasted straight
 * into a message to the backend owner. Never fabricates results: every line
 * below is a real request/response pair.
 *
 * Usage:
 *   node scripts/test-all-endpoints.js <phone> <password> [deviceId] [bankCode] [accountNumber] [checkPhone]
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

const [, , phone, password, deviceIdArg, bankCodeArg, accountNumberArg, checkPhoneArg] = process.argv;
if (!phone || !password) {
  console.error('Usage: node scripts/test-all-endpoints.js <phone> <password> [deviceId]');
  process.exit(1);
}
const deviceId = deviceIdArg || 'test-all-' + Math.random().toString(36).slice(2);
const bankCode = bankCodeArg || '100004';
const accountNumber = accountNumberArg || '';
const checkPhone = checkPhoneArg || phone;

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
    json = { __nonJson: true, status: res.status, body: text.slice(0, 500) };
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

async function call(theKey, params, { exempt = false } = {}) {
  if (!exempt) await mintRef();
  const headers = { Authorization: `Bearer ${bearer}` };
  if (!exempt) Object.assign(headers, { refID: refId, phone, deviceid: deviceId });
  return post('/st/myhandler', { theKey, ...params }, headers);
}

const results = [];

function label(name, theKey, outcome) {
  results.push({ name, theKey, outcome });
}

function verdict(json, status) {
  if (status !== 200) return `HTTP ${status}`;
  if (json.__nonJson) return 'NON-JSON RESPONSE (likely a server error page)';
  if (json.IsValid === false) return `AUTH REJECTED — ${json.Message || '(no message)'}`;
  if (json.success === false) return `BUSINESS ERROR — ${json.message || json.Message || '(no message)'}`;
  if (json.status === false) return `BUSINESS ERROR (status:false) — ${json.message || '(no message)'}`;
  return 'OK';
}

(async () => {
  console.log(`\n=== CrowdStock live endpoint sweep — ${new Date().toISOString()} ===`);
  console.log(`Phone: ${phone}  DeviceID: ${deviceId}\n`);

  // --- Auth ---
  {
    const { status, json } = await mintBearer();
    label('Get Bearer Token (AuthSP)', 'AuthSP', verdict(json, status));
    console.log('--- AuthSP ---\n', JSON.stringify(json, null, 2), '\n');
  }
  {
    const { status, json } = await post(
      '/st/myhandler',
      { theKey: 'G22', PhoneNo: phone, PinCode: password, DeviceID: deviceId },
      { Authorization: `Bearer ${bearer}` }
    );
    sessionId = json.SessionID;
    label('Login (G22)', 'G22', verdict(json, status));
    console.log('--- G22 (login) ---\n', JSON.stringify(json, null, 2), '\n');
  }
  {
    const { status, json } = await mintRef();
    label('Mint Fresh Token (G1001)', 'G1001', verdict(json, status));
    console.log('--- G1001 ---\n', JSON.stringify(json, null, 2), '\n');
  }
  {
    const { status, json } = await call('G24', { phone });
    label('Get Profile (G24)', 'G24', verdict(json, status));
    console.log('--- G24 ---\n', JSON.stringify(json, null, 2), '\n');
  }
  {
    const { status, json } = await call('G19', { phone });
    label('Get Support Contact (G19)', 'G19', verdict(json, status));
    console.log('--- G19 ---\n', JSON.stringify(json, null, 2), '\n');
  }

  // --- Rounds & Predictions ---
  const today = new Date().toISOString().slice(0, 10);
  {
    const { status, json } = await call('G13', { phone, date: today });
    label("Get Today's Rounds (G13)", 'G13', verdict(json, status));
    console.log('--- G13 (today) ---\n', JSON.stringify(json, null, 2).slice(0, 2000), '\n');
  }
  {
    const { status, json } = await call('G14', { Year: '2026', Month: '09', Phone: phone });
    label('Get Play History (G14)', 'G14', verdict(json, status));
    console.log('--- G14 ---\n', JSON.stringify(json, null, 2), '\n');
  }
  {
    const { status, json } = await call('G15', { Year: '2026', Month: '09', Phone: phone, Code: 'P' });
    label("Get Played Rounds Today (G15 Code P)", 'G15', verdict(json, status));
    console.log('--- G15 (Code P) ---\n', JSON.stringify(json, null, 2).slice(0, 1000), '\n');
  }

  // --- Auto Play ---
  {
    const { status, json } = await call('A2', { Phone: phone });
    label('Get Auto Play Config (A2)', 'A2', verdict(json, status));
    console.log('--- A2 ---\n', JSON.stringify(json, null, 2).slice(0, 1500), '\n');
  }
  {
    const { status, json } = await call('A1', { Phone: phone, Round: 9, Status: 1, Figure: 3 });
    label('Set One Round Auto Play ON (A1)', 'A1', verdict(json, status));
    console.log('--- A1 (Round 9, ON, Figure 3) ---\n', JSON.stringify(json, null, 2), '\n');
  }
  {
    const { status, json } = await call('UU', { Phone: phone, Status: 1 });
    label('Master Toggle All Rounds ON (UU)', 'UU', verdict(json, status));
    console.log('--- UU ---\n', JSON.stringify(json, null, 2), '\n');
  }

  // --- Wallet & History ---
  {
    const { status, json } = await call('G25', { phone });
    label('Get Balance (G25)', 'G25', verdict(json, status));
    console.log('--- G25 ---\n', JSON.stringify(json, null, 2), '\n');
  }
  {
    const { status, json } = await call('G15', { Year: '2026', Month: '09', Phone: phone, Code: 'D' });
    label('Get Deposits (G15 Code D)', 'G15', verdict(json, status));
    console.log('--- G15 (Code D) ---\n', JSON.stringify(json, null, 2).slice(0, 1000), '\n');
  }
  {
    const { status, json } = await call('G15', { Year: '2026', Month: '09', Phone: phone, Code: 'W' });
    label('Get Withdrawals (G15 Code W)', 'G15', verdict(json, status));
    console.log('--- G15 (Code W) ---\n', JSON.stringify(json, null, 2).slice(0, 1000), '\n');
  }
  {
    const { status, json } = await call('G15', { Year: '2026', Month: '09', Phone: phone, Code: 'G' });
    label('Get Game Outcomes (G15 Code G)', 'G15', verdict(json, status));
    console.log('--- G15 (Code G) ---\n', JSON.stringify(json, null, 2).slice(0, 1500), '\n');
  }
  {
    const { status, json } = await call('G15B', { Year: '2026', Month: '09', Phone: phone });
    label('Get Monthly Totals (G15B)', 'G15B', verdict(json, status));
    console.log('--- G15B ---\n', JSON.stringify(json, null, 2), '\n');
  }
  {
    const { status, json } = await call('G15C', { Phone: phone });
    label("Get Today's Totals (G15C)", 'G15C', verdict(json, status));
    console.log('--- G15C ---\n', JSON.stringify(json, null, 2), '\n');
  }

  // --- Deposit ---
  {
    const { status, json } = await call('BB', { phone });
    label('Get Bank Profile (BB)', 'BB', verdict(json, status));
    console.log('--- BB ---\n', JSON.stringify(json, null, 2), '\n');
  }
  {
    const { status, json } = await call('VV', { phone });
    label('Generate/Fetch Virtual Account (VV)', 'VV', verdict(json, status));
    console.log('--- VV ---\n', JSON.stringify(json, null, 2), '\n');
  }

  // --- Withdrawal (read-only parts; OTP-gated parts skipped, see report) ---
  if (accountNumber) {
    const { status, json } = await call('AAA', { bankCode, accNumber: accountNumber });
    label('Verify Bank Account Name (AAA)', 'AAA', verdict(json, status));
    console.log('--- AAA ---\n', JSON.stringify(json, null, 2), '\n');
  } else {
    label('Verify Bank Account Name (AAA)', 'AAA', 'SKIPPED — provide bankCode and accountNumber');
    console.log('--- AAA ---\n skipped: provide [bankCode] and [accountNumber] after deviceId\n');
  }

  // --- Invite ---
  {
    const { status, json } = await call('B3', { Phone: phone });
    label('Get Invite Stats (B3)', 'B3', verdict(json, status));
    console.log('--- B3 ---\n', JSON.stringify(json, null, 2), '\n');
  }
  {
    const { status, json } = await call('B2', { Phone: checkPhone });
    label('Check Phone Registered (B2)', 'B2', verdict(json, status));
    console.log('--- B2 ---\n', JSON.stringify(json, null, 2), '\n');
  }

  console.log('\n=== SUMMARY ===');
  for (const r of results) {
    console.log(`[${r.outcome === 'OK' ? 'OK   ' : 'ERROR'}] ${r.name} (${r.theKey}) -> ${r.outcome}`);
  }
})().catch((e) => {
  console.error('FATAL:', e);
  process.exit(1);
});

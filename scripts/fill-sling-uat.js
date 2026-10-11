// Fills in "Sling Payout UAT.docx" based on what's actually verifiable in
// this repo. Finding: the app has no Sling integration at all — see
// src/config/backend.ts / .env (the only configured backend is a
// proprietary myhandler/theKey gateway) and src/api/httpApi.ts's
// wallet.requestWithdrawal (theKey "IP"), which is what payouts actually go
// through. So every Sling Wallet test case in this plan is Not Applicable,
// not "blocked on missing credentials" — there is no Sling client to test
// regardless of what access is granted.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const input = process.argv[2] || '/Users/amin/Documents/stock/Sling Payout UAT (2).docx';
const output = process.argv[3] || '/Users/amin/Documents/stock/Sling Payout UAT (2) - filled.docx';
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sling-uat-'));

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cellText(cell) {
  // NOTE: must not match <w:tcPr>, <w:trPr>, <w:tblPrEx>, <w:top>, etc. —
  // anything starting with "w:t" — so the tag name has to end right after
  // "t" (either ">" or a space before attributes), not just "[^>]*".
  return [...cell.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
    .map((match) => match[1])
    .join('')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function setCell(row, index, value) {
  const cells = [...row.matchAll(/<w:tc[\s\S]*?<\/w:tc>/g)];
  const match = cells[index];
  if (!match) return row;
  const cell = match[0];
  // Must keep the <w:tc>...</w:tc> wrapper itself — dropping it (as an
  // earlier version of this did) collapses this cell's boundary into the
  // next one, silently misaligning every later index update in the row.
  const openTag = cell.match(/^<w:tc[^>]*>/)?.[0] || '<w:tc>';
  const properties = cell.match(/<w:tcPr[\s\S]*?<\/w:tcPr>/)?.[0] || '';
  const replacement = `${openTag}${properties}<w:p><w:r><w:t xml:space="preserve">${xmlEscape(value)}</w:t></w:r></w:p></w:tc>`;
  return row.slice(0, match.index) + replacement + row.slice(match.index + cell.length);
}

function updateRow(xml, predicate, updates) {
  return xml.replace(/<w:tr[\s\S]*?<\/w:tr>/g, (row) => {
    const cells = [...row.matchAll(/<w:tc[\s\S]*?<\/w:tc>/g)].map((match) => cellText(match[0]));
    if (!predicate(cells)) return row;
    return Object.entries(updates).reduce((current, [index, value]) => setCell(current, Number(index), value), row);
  });
}

function updateParagraph(xml, predicate, replacementText) {
  return xml.replace(/<w:p[\s\S]*?<\/w:p>/g, (paragraph) => {
    if (!predicate(paragraph)) return paragraph;
    // Must keep the original <w:p ...> opening tag (paraId/rsid attributes
    // and all) — dropping it while keeping the closing </w:p> (an earlier
    // version of this did exactly that) leaves one unmatched </w:p> per
    // call, which corrupts the whole document just enough that Word can't
    // render it at all (shows blank instead of erroring visibly).
    const openTag = paragraph.match(/^<w:p[^>]*>/)?.[0] || '<w:p>';
    const properties = paragraph.match(/<w:pPr[\s\S]*?<\/w:pPr>/)?.[0] || '';
    return `${openTag}${properties}<w:r><w:t xml:space="preserve">${xmlEscape(replacementText)}</w:t></w:r></w:p>`;
  });
}

execFileSync('unzip', ['-q', input, '-d', tempDir]);
const documentPath = path.join(tempDir, 'word', 'document.xml');
let xml = fs.readFileSync(documentPath, 'utf8');

const NA_BACKEND = 'the only configured backend is a proprietary myhandler/theKey gateway (src/config/backend.ts, .env) — no Sling ApiKey, base URL, or Wallet client exists in this app';

const comments = {
  'TC-PW-01': `Not Applicable: ${NA_BACKEND}. There is no GET /api/v1/Wallet/payoutWallet call anywhere in the app to execute.`,
  'TC-PW-02': `Not Applicable: ${NA_BACKEND}. With no Sling call being made, there is no ApiKey header to omit or invalidate.`,
  'TC-PC-02': `Not Applicable: payouts use theKey "IP" over the myhandler gateway (src/api/httpApi.ts wallet.requestWithdrawal — {Phone, Amount, OTP, PinCode}), which has no charge/fee-quote step. GET /api/v1/Wallet/charge is not called.`,
  'TC-PC-03': `Not Applicable: same as TC-PC-02 — there is no charge endpoint or TransferType enum in this app's integration to send an invalid value against.`,
  'TC-PYW-01': `Not Applicable: payouts go through theKey "IP" (src/api/httpApi.ts:720), not Sling's POST /api/Wallet/transfer/account, and no webhook receiver is registered anywhere in the codebase. Separately, wallet.getWithdrawalHistory() currently throws "not supported" (src/api/httpApi.ts:725-727) — there's no confirmed way to observe a payout's outcome at all yet, independent of provider.`,
  'TC-PYW-02': 'Not Applicable: no webhook receiver exists to resend a duplicate payload to, and no idempotency/replay-handling logic exists to observe.',
};

for (const [testCase, comment] of Object.entries(comments)) {
  // Cell text is e.g. "TC-PW-02 (Negative)", not an exact match on the ID.
  xml = updateRow(xml, (cells) => cells[0]?.startsWith(testCase), { 7: 'Not Applicable', 8: comment });
}

const defects = [
  [
    'DEF-001',
    'All (TC-PW-01, TC-PW-02, TC-PC-02, TC-PC-03, TC-PYW-01, TC-PYW-02)',
    'N/A — no Sling client in app',
    'This UAT plan targets the Sling Payment Collection API (Wallet/payoutWallet, Wallet/charge, Wallet/transfer/account + webhook). This app does not integrate with Sling: src/config/backend.ts and .env define exactly one backend, a proprietary myhandler/theKey gateway at a fixed IP, and withdrawals are placed via theKey "IP" (src/api/httpApi.ts:720). None of the 6 test cases can be executed as written against this app.',
    'Blocker',
    'P0',
    'Open',
    'QA / Tester',
  ],
  [
    'DEF-002',
    'TC-PYW-01',
    'wallet.getWithdrawalHistory (src/api/httpApi.ts:725)',
    'Independent of Sling: the app has no confirmed endpoint yet for withdrawal/payout status or history — getWithdrawalHistory() currently throws "not supported". There is no way to observe a payout completing regardless of which provider is behind it.',
    'High',
    'P1',
    'Open',
    'QA / Tester',
  ],
  [
    'DEF-003',
    'TC-PYW-01 (behind theKey "IP")',
    'theKey "IP" (src/api/httpApi.ts wallet.requestWithdrawal); theKey "AAA" (account verification)',
    'Live re-test on 2026-09-11 against the production myhandler gateway (not staging — no staging environment exists per DEF-001): a real withdrawal was submitted with a real, freshly-verified bank account (Zenith Bank Plc, 000015) — response {"status":"PAYOUT_FAILED","message":"Payout was not successful.","response":null}, no further detail. Separately, "AAA" (account-name verification, the closest equivalent to a payout pre-check) returned {"accountName":"Vigipay Sling","bankName":"Demo Bank"} for that same real account — placeholder/sandbox values, not a real lookup. Both point to the same root cause: whatever Sling integration sits behind this backend\'s "IP"/"AAA" keys is still running against Sling sandbox/test credentials, not production. This is the concrete symptom DEF-001 predicted from the code alone — recommend treating this as the actual go/no-go blocker for "migration to live," to be re-tested once the backend owner confirms Sling has been switched to production credentials.',
    'Blocker',
    'P0',
    'Open',
    'QA / Tester',
  ],
];

for (const defect of defects) {
  xml = updateRow(xml, (cells) => cells[0] === defect[0], {
    1: defect[1], 2: defect[2], 3: defect[3], 4: defect[4], 5: defect[5], 6: defect[6], 7: defect[7],
  });
}

xml = updateParagraph(
  xml,
  (paragraph) => /Total Test Cases:\s*6/.test(cellText(paragraph)),
  'Total Test Cases: 6 | Passed: 0 | Failed: 0 | Blocked: 0 | Not Applicable: 6 | Not Started: 0 | Pass Rate: N/A | Open Defects: 3 | Last Verified: 2026-09-11'
);
xml = updateParagraph(
  xml,
  (paragraph) => /Environment:\s*Staging/.test(cellText(paragraph)),
  'Scope: GET Payout Wallet | GET Payout Charge | Process Payout & Webhook Notification   |   Environment: N/A — see DEF-001, this app has no Sling integration to stage (live re-test against production gateway instead — see DEF-003)'
);

fs.writeFileSync(documentPath, xml);
execFileSync('zip', ['-qr', output, '.'], { cwd: tempDir });
fs.rmSync(tempDir, { recursive: true, force: true });
console.log(output);

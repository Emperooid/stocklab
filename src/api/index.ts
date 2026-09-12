import { httpApi } from './httpApi';

// AUTH: cut over to the real backend. G10, G11, G20, G21, G22, G1001 are all
// confirmed working live (G1001 was flaky while the backend owner was
// actively redeploying — session/deviceId/trans_token are tied together, so
// don't test the same phone number from two places at once).
//
// ROUNDS: also cut over now that a real session actually works — this is
// the real test of G12 (predict), G13 (results), G14 (history). Admin-only
// pieces (Default Stock Values) will throw "not supported" if used — no
// endpoint for those yet — but predicting and viewing results should work.
//
// WALLET: cut over too, per explicit instruction to drop demo data and only
// show real backend data. getBalance now calls G24 for the real WBalance.
// Deposits are virtual-account only (getBankProfile/BB, generateVirtualAccount/VV)
// — the old PAY/GR card-checkout path was removed per product decision, not
// kept as a fallback. setPayoutBankDetails (PP) is real. requestWithdrawal
// still throws "not available yet" — BB/PP/VV only cover bank details, not
// an actual payout-trigger endpoint.
// INVITE: new referral program (B1_LogInvite, B2_IsRegisteredUser,
// B3_GetCountInvited) — all real, all used by the Invite screen.
export const api = {
  auth: httpApi.auth,
  rounds: httpApi.rounds,
  wallet: httpApi.wallet,
  invite: httpApi.invite,
};

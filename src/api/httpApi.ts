import { Bank, DailyHistoryEntry, DailyRound, ResolvedBankAccount, User, WalletTransaction } from '../types';
import { ROUND_SLOTS, getSlotStatus } from '../lib/schedule';
import { getDeviceId } from '../lib/deviceId';
import { callGateway, getSession, setSession } from './backendClient';

/**
 * Real backend implementation, built from the documented theKey table +
 * request-validation flow, and confirmed against the live server for the
 * transport layer only (AuthSP token issuance, and that unauthenticated
 * myhandler calls are correctly rejected).
 *
 * NOT SAFE TO SWITCH ON YET (see src/api/index.ts) — several things this
 * app depends on have no documented endpoint at all:
 *
 *   - Setting/updating a round's Stock Value, or default Stock Values.
 *     There is no G-key for this anywhere in the doc. Round Controls
 *     (admin) cannot work against this backend until one exists.
 *   - Creating a deposit or withdrawal. G15/G16 only ever *show* deposit/
 *     withdrawal history for a month — nothing initiates one. The exempt
 *     key "Pay" is mentioned once (in the exemption list) but never
 *     documented, so it may be the intended entry point — needs asking.
 *   - Resolving a bank account name before a withdrawal, or listing banks.
 *   - A plain "get my current balance/profile" call. The closest things
 *     are the monthly G15/G17 Show* endpoints, which return Balance as a
 *     side effect of a differently-scoped query.
 *
 * Also: auth here is phone + PIN (G22/G11), not email + password — the
 * current Login/Register screens collect email + password and would need
 * rework before this could actually be used end to end.
 */

function findSlot(roundId: string) {
  return ROUND_SLOTS.find((s) => s.id === roundId);
}

function notSupported(feature: string): never {
  throw new Error(`${feature} isn't available yet — no backend endpoint exists for it.`);
}

export const httpApi = {
  auth: {
    /**
     * ASSUMPTION: G22 is callable before a session exists (it has to be,
     * it's how a session is created) even though it isn't in the doc's
     * exempt list. Unverified against a live call — the doc's validation
     * flow would otherwise require being logged in in order to log in.
     *
     * `email` here is actually a phone number — see file header.
     */
    async login(phone: string, pin: string): Promise<User> {
      const deviceId = await getDeviceId();
      const loginRes = await callGateway<any>(
        'G22',
        { PhoneNo: phone, PinCode: pin, DeviceID: deviceId },
        { paramsField: 'jsonInput', requiresSession: false }
      );

      const sessionToken = loginRes?.sessionToken ?? loginRes?.SessionToken ?? loginRes?.token;
      if (!sessionToken) {
        throw new Error('Login succeeded but no session token was returned — response shape needs checking against a real call.');
      }

      const tokenRes = await callGateway<{ success: boolean; trans_token: string }>(
        'G1001',
        { sessionToken, phone, deviceId },
        { requiresSession: false }
      );
      if (!tokenRes?.trans_token) {
        throw new Error('Could not obtain a transaction token from G1001.');
      }

      setSession({ phone, refID: tokenRes.trans_token });

      // The doc doesn't specify G22's full response shape beyond "user/session
      // information" — best-effort extraction, defaults filled in otherwise.
      return {
        id: phone,
        name: loginRes?.fullname ?? loginRes?.FullName ?? phone,
        email: phone,
        role: 'user',
        balance: Number(loginRes?.balance ?? loginRes?.Balance ?? 0),
        totalProfit: 0,
        totalProfitPercent: 0,
      };
    },

    /**
     * Real registration is a two-step OTP flow (G10 then G11), not a single
     * call — the Register screen would need an OTP-entry step added (the
     * same pattern ForgotPasswordScreen already uses) before this can work.
     * This method sends the OTP request only; there is no single call that
     * completes registration without one.
     */
    async register(_name: string, _phone: string, _pin: string): Promise<User> {
      notSupported('One-call registration (the real backend needs an OTP step in between — see registerStart/registerComplete)');
    },

    async registerStart(phone: string): Promise<void> {
      await callGateway('G10', { phone }, { requiresSession: false });
    },

    async registerComplete(phone: string, fullname: string, gender: string, pincode: string, otp: string): Promise<void> {
      await callGateway('G11', { phone, fullname, gender, pincode, otp }, { requiresSession: false });
    },

    async me(): Promise<User> {
      notSupported('Fetching the current user profile (no plain profile/balance endpoint is documented)');
    },

    async requestPasswordReset(phone: string): Promise<void> {
      await callGateway('G20', { Phone: phone }, { requiresSession: false });
    },

    async resetPassword(phone: string, otp: string, newPassword: string): Promise<void> {
      await callGateway('G21', { Phone: phone, OTP: otp, NewPassword: newPassword }, { requiresSession: false });
    },
  },

  rounds: {
    async getToday(): Promise<DailyRound[]> {
      const { phone } = requireSession();
      const today = new Date().toISOString().slice(0, 10);
      const results = await callGateway<any>('G13', { phone, date: today });

      // ASSUMPTION: results is an array keyed by slot somehow — the doc only
      // says "JSON array of results". Needs checking against a real call to
      // know how to match entries back to ROUND_SLOTS, and whether it
      // includes the user's own submitted prediction per round at all.
      const resultsBySlot = new Map<string, any>();
      if (Array.isArray(results)) {
        for (const r of results) {
          const slotId = r.slot ?? r.Slot ?? r.roundId;
          if (slotId) resultsBySlot.set(String(slotId), r);
        }
      }

      const now = new Date();
      return ROUND_SLOTS.map((slot) => ({
        slot,
        status: getSlotStatus(slot, now),
        prediction: undefined, // not distinguishable from resultsBySlot without a confirmed response shape
        stockValue: undefined, // no endpoint returns this ahead of settlement — see file header
        result: resultsBySlot.has(slot.id) ? mapResult(slot.id, resultsBySlot.get(slot.id)) : undefined,
      }));
    },

    async submitPrediction(roundId: string, value: number): Promise<void> {
      const { phone } = requireSession();
      const slot = findSlot(roundId);
      // The doc has the client send its own "balance" — unusual (normally
      // the backend would look this up), but that's what's documented.
      // No local balance is available at this layer, so this needs wiring
      // to the wallet store's current balance before use.
      await callGateway('G12', { slot: slot?.id ?? roundId, phone, predfigure: value, balance: 0 });
    },

    async setStockValue(): Promise<void> {
      notSupported('Setting a round Stock Value');
    },

    async getDefaultStockValues(): Promise<Record<string, number>> {
      notSupported('Default Stock Values');
    },

    async setDefaultStockValues(): Promise<void> {
      notSupported('Default Stock Values');
    },

    async getHistory(year?: number, month?: number): Promise<DailyHistoryEntry[]> {
      const { phone } = requireSession();
      const now = new Date();
      const res = await callGateway<any>('G14', {
        Year: year ?? now.getFullYear(),
        Month: (month ?? now.getMonth()) + 1,
        Phone: phone,
      });
      // ASSUMPTION: array shape unconfirmed — needs mapping to
      // DailyHistoryEntry once a real response is available.
      return Array.isArray(res) ? res : [];
    },
  },

  wallet: {
    async getBalance() {
      notSupported('Fetching current balance directly (only the monthly Show* endpoints return a Balance field)');
    },
    async createDepositReference(): Promise<{ reference: string; email: string }> {
      notSupported('Starting a deposit (no documented endpoint — possibly the undocumented "Pay" key)');
    },
    async verifyDeposit(): Promise<{ balance: number }> {
      notSupported('Verifying a deposit');
    },
    async cancelDeposit(): Promise<void> {
      notSupported('Cancelling a deposit');
    },
    async getBanks(): Promise<Bank[]> {
      notSupported('Listing banks');
    },
    async resolveBankAccount(): Promise<ResolvedBankAccount> {
      notSupported('Resolving a bank account name');
    },
    async requestWithdrawal(): Promise<WalletTransaction> {
      notSupported('Requesting a withdrawal (G16 only shows withdrawal history, nothing creates one)');
    },
    async getTransactions(): Promise<WalletTransaction[]> {
      notSupported('A unified transaction list (would need combining G15/G16/G17/G18, each month-scoped)');
    },
  },
};

function requireSession() {
  const session = getSession();
  if (!session) throw new Error('Not logged in.');
  return session;
}

function mapResult(roundId: string, raw: any) {
  return {
    roundId,
    stockValue: Number(raw.stockValue ?? raw.StockValue ?? 0),
    userPrediction: raw.predfigure ?? raw.PredFigure ?? undefined,
    distance: raw.distance ?? undefined,
    changePercent: raw.changePercent ?? raw.percentGainLoss ?? undefined,
    valueGained: raw.value ?? raw.Value ?? raw.amount ?? undefined,
    balanceAfter: raw.balance ?? raw.Balance ?? undefined,
  };
}

import { Bank, DailyHistoryEntry, DailyRound, ResolvedBankAccount, User, WalletTransaction } from '../types';
import { ROUND_SLOTS, getSlotStatus, localDateKey } from '../lib/schedule';
import { getDeviceId } from '../lib/deviceId';
import { callGateway, getSession, setSession } from './backendClient';

/**
 * Real backend implementation, built from the documented theKey table +
 * request-validation flow, and confirmed against the live server for the
 * transport layer (AuthSP token issuance, unauthenticated calls correctly
 * rejected) plus several operations confirmed directly against real traffic:
 *
 *   - G12 (setFigure): slot/phone/predfigure are JSON *strings*, plus a
 *     `SlotAmount` string — the fixed amount to play that round with. This
 *     replaced the old always-"0" `balance` field; confirmed live via the
 *     "Balance Allocated to Slot is too low" rejection until SlotAmount is
 *     set explicitly.
 *   - G22 (login): real response includes `WBalance` (confirmed dynamic —
 *     watched it change live from "1000" to "50000" after a backend update)
 *     and `MinWallet` (confirmed dynamic per-account, not hardcoded).
 *   - G24 (full profile lookup): request is just {"phone": "..."}, response
 *     includes WBalance plus name/gender/etc. without needing a full
 *     re-login. Used by `auth.me()` below.
 *   - G25 (balance-only lookup): same request shape, lighter response
 *     {success, phone, balance}. Used by `wallet.getBalance()` below.
 *   - PAY (Pay_CreatePayment, key is literally "PAY"): takes
 *     cref/amount/description/cname/femail/cmobile. This is the deposit
 *     creation endpoint — "Pay" in the exemption list refers to this. Both
 *     request AND response CONFIRMED live (new payment gateway, not
 *     Paystack) — the response's `response` field is a JSON-encoded
 *     *string* containing `responseData.redirectUrl`, a hosted checkout
 *     page to open. Balance is credited server-side via webhook once
 *     payment completes — no client-side verify/confirm call exists or is
 *     needed. See createDepositReference() below.
 *   - G13/G14 (results/history): CONFIRMED field names from the API docs —
 *     {Id, Slot, Phone, StartBalance, PredValue, Average, StockValue,
 *     Datein, Timein, PValueGL, TotalFinalGain, TotalFinalLoss,
 *     NetMovement, EndBalance, DateComputed, TimeComputed, FinalGorL,
 *     UserDateIn, UserTimeIn} — same shape for both keys. See mapResult()
 *     below. Not yet verified against a real settled round from our own
 *     account, only against documentation examples.
 *
 * PER USER (confirmed, not just an assumption): there is no operator/admin
 * role in this product — the Stock Value for each round is drawn
 * automatically server-side and only revealed once a round settles. No
 * "Round Controls" or Stock-Value-setting UI exists in the client anymore;
 * it was removed once this was confirmed.
 *
 * NOT SAFE TO SWITCH ON YET (see src/api/index.ts) — still open:
 *
 *   - Creating a *withdrawal*. PAY covers deposits; nothing documented
 *     covers paying a user out. G16 only ever shows withdrawal history.
 *   - Resolving a bank account name before a withdrawal, or listing banks.
 *   - Real response shape for G11 (register) — still only known from the
 *     request side, not tested live yet.
 *   - TodayRound: per Mr Yemi, this is a computed/read-only stat (total of
 *     SlotAmount across rounds played today), not something the client
 *     sets — no client changes needed for it beyond what SlotAmount
 *     already covers.
 *
 * Also: auth is phone + password (the Login/Register screens already
 * collect this correctly). The wire field is still named pincode/PinCode
 * per the doc, but it's just a string — our client sends a 6+ character
 * password through it, not a numeric PIN. See validation.ts.
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
     * G22 is callable before a session exists (it has to be — it's how a
     * session is created), requiresSession: false confirmed correct live.
     *
     * The `paramsField: 'jsonInput'` wrapper was wrong, same mistake as the
     * G10/G11 "jsonData" column — confirmed live: with the wrapper, G22
     * failed with {"IsValid":false,"Message":"Login Again!"} even for a
     * real, just-registered account (the server couldn't see PhoneNo/
     * PinCode/DeviceID because they were nested, so its own field
     * validation failed and fell through to the generic auth-rejection
     * path). Fields are sent flat now, matching every other confirmed key.
     */
    /**
     * CONFIRMED live response shape for a real successful login:
     *   {"IsValid":true,"Message":"Login successful","MinWallet":"0",
     *    "Profile":{"FullName":"...","Gender":"...","ID":"3","Phone":"234..."},
     *    "SessionID":"<uuid>"}
     * No "sessionToken" field at all — SessionID is what feeds G1001.
     * Profile.Phone comes back in international format (234... no leading
     * 0) — we keep using the local-format `phone` we were given instead, to
     * stay consistent with how the rest of the app validates/displays it.
     *
     * CONFIRMED live: the trans_token G1001 mints is SINGLE-USE — it
     * validates for exactly one call, then every later call with that same
     * token fails with "Unauthorized User Access". So login only stores the
     * SessionID; callGateway() mints a fresh trans_token via G1001 right
     * before every protected call instead of reusing one from login time.
     */
    async login(phone: string, pin: string): Promise<User> {
      const deviceId = await getDeviceId();
      const loginRes = await callGateway<any>(
        'G22',
        { PhoneNo: phone, PinCode: pin, DeviceID: deviceId },
        { requiresSession: false }
      );

      const sessionId = loginRes?.SessionID;
      if (!sessionId) {
        throw new Error('Login succeeded but no session ID was returned.');
      }

      setSession({ phone, sessionId });

      const profile = loginRes?.Profile ?? {};
      return {
        id: profile.ID ?? phone,
        name: profile.FullName ?? phone,
        phone,
        // CONFIRMED live: Profile.email is now present (added alongside the
        // G11 email field) — empty string for accounts that registered
        // before it existed. `|| undefined` lets authStore's preserveEmail
        // fall back to a locally-remembered email instead of overwriting it
        // with a known-blank one.
        email: profile.email || undefined,
        role: 'user',
        balance: 0, // WBalance IS present in this response (confirmed), but G25 is the dedicated/canonical balance lookup — see wallet.getBalance()
        totalProfit: 0,
        totalProfitPercent: 0,
        // Defensive — not confirmed present on G22 (only seen on G24 so
        // far), but read it here too in case it's nested under Profile the
        // same way email is. refreshUser() (G24) is the confirmed source.
        slotAmount: profile.SlotAmount != null ? Number(profile.SlotAmount) : undefined,
      };
    },

    /**
     * Step 1 of registration: sends the OTP.
     *
     * CONFIRMED via a real Postman request that got a real success response:
     * the body is FLAT (no jsonData wrapper) with a capital-P "Phone":
     *   {"theKey":"G10","Phone":"08143640561"}
     * -> {"success":true,"message":"OTP sent successfully"}
     *
     * Earlier attempts nesting under jsonData (with either casing) all got
     * {"success":false,"message":"...is required"} — the wrapper was the
     * actual bug, not the field casing. One earlier "success" with a nested
     * body and a fake all-zeros number is now believed to have hit a
     * special-cased test number that bypasses validation, not evidence the
     * wrapper ever worked.
     */
    async registerStart(phone: string): Promise<void> {
      await callGateway('G10', { Phone: phone }, { requiresSession: false });
    },

    /**
     * Step 2: completes registration with the OTP the user received.
     *
     * CONFIRMED live: the flat body shape (no jsonData wrapper) is correct
     * here too — a deliberately wrong OTP got back {"success":false,
     * "message":"OTP not found or already used"}, a real business-logic
     * error, not a field-shape error. Full success response still
     * unconfirmed (would require a real OTP to complete); registration
     * doesn't establish a session by itself, so the caller still needs to
     * log in separately afterward.
     */
    /**
     * CONFIRMED field set (per Mr Yemi): {otp, phone, fullname, gender,
     * pincode, email}. G11's own response doesn't echo email back (nor does
     * G22/G24), so we just remember what we sent — see User.email.
     */
    async registerComplete(phone: string, fullname: string, gender: string, pincode: string, otp: string, email: string): Promise<User> {
      await callGateway('G11', { phone, fullname, gender, pincode, otp, email }, { requiresSession: false });
      return {
        id: phone,
        name: fullname,
        phone,
        email,
        role: 'user',
        balance: 0,
        totalProfit: 0,
        totalProfitPercent: 0,
      };
    },

    /**
     * CONFIRMED shape (G24, per Mr Yemi): request is just {"phone": "..."},
     * response is {IsValid, ID, Phone, FullName, Gender, iStatus, DateIn,
     * TimeIn, WBalance, Message}. This is the same lookup wallet.getBalance()
     * below uses to refresh WBalance without a full re-login.
     *
     * NEW: G24 now also returns `SlotAmount` — a fixed, per-user stake
     * amount. Per explicit product decision, this replaces the old
     * free-text amount field entirely: users no longer choose how much to
     * stake per round, they play with whatever SlotAmount their profile
     * has, non-editable in the app.
     */
    async me(): Promise<User> {
      const { phone } = requireSession();
      const res = await callGateway<any>('G24', { phone });
      return {
        id: String(res?.ID ?? phone),
        name: res?.FullName ?? phone,
        phone,
        role: 'user',
        balance: Number(res?.WBalance ?? 0),
        totalProfit: 0,
        totalProfitPercent: 0,
        slotAmount: res?.SlotAmount != null ? Number(res.SlotAmount) : undefined,
      };
    },

    /**
     * CONFIRMED working live (previously required a session — the backend
     * owner has since added it to the exemption list). A real call for an
     * unregistered number returned {"success":false,"message":"Phone
     * number is not registered."}, a genuine business-logic response.
     */
    async requestPasswordReset(phone: string): Promise<void> {
      await callGateway('G20', { Phone: phone }, { requiresSession: false });
    },

    /** CONFIRMED working live — a deliberately wrong OTP returned {"success":false,"message":"Invalid or expired OTP."}. */
    async resetPassword(phone: string, otp: string, newPin: string): Promise<void> {
      await callGateway('G21', { Phone: phone, OTP: otp, NewPassword: newPin }, { requiresSession: false });
    },
  },

  rounds: {
    async getToday(): Promise<DailyRound[]> {
      const { phone } = requireSession();
      const today = localDateKey(new Date());
      const raw = await callGateway<any>('G13', { phone, date: today });
      // CONFIRMED live: G13's own response shape has changed mid-session
      // (a backend edit that fixed an unrelated SQL error also switched it
      // from a bare array to {success, data: [...]}) — accept either so a
      // future server-side tweak like this doesn't silently zero out every
      // result again.
      const results = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];

      // CONFIRMED shape — see mapResult() below. `Slot` is a plain numeric
      // string ("15"), matching RoundSlot.index — NOT RoundSlot.id ("r15").
      // Fixed a real bug here: the old code matched against slot.id, which
      // could never succeed against a plain "15", so a settled result would
      // never have attached to its round even once G13 started returning
      // real data.
      const resultsBySlot = new Map<string, any>();
      if (Array.isArray(results)) {
        for (const r of results) {
          const slotIndex = r.Slot ?? r.slot ?? r.roundId;
          if (slotIndex != null) resultsBySlot.set(String(slotIndex), r);
        }
      }

      const now = new Date();
      return ROUND_SLOTS.map((slot) => {
        const status = getSlotStatus(slot, now);
        // CONFIRMED live: G13 creates a row for a round the moment it's
        // played, well before that round actually settles — a still-OPEN
        // round (40 minutes from closing) was already returning a row with
        // placeholder zeros (StockValue 0, GLN "N"), which rendered as a
        // fake "result" in the UI. Only treat a round as having a real
        // result once it's actually settled by clock time — a played-but-
        // pending row existing in G13 isn't a result yet.
        const raw = status === 'settled' ? resultsBySlot.get(String(slot.index)) : undefined;
        return {
          slot,
          status,
          prediction: undefined, // not distinguishable from resultsBySlot without a confirmed response shape
          stockValue: undefined, // drawn automatically server-side and only revealed at settlement (see result.stockValue below) — there's no operator to set this ahead of time
          result: raw ? mapResult(slot.id, raw) : undefined,
        };
      });
    },

    /**
     * CONFIRMED with the backend dev (updated): slot/phone/predfigure are
     * sent as JSON strings, plus a new `SlotAmount` field — the fixed amount
     * to play this round with, in Naira. This replaces the old always-"0"
     * `balance` field entirely (his example omits `balance` altogether) —
     * `SlotAmount` is what previously showed up server-side as "Balance
     * Allocated to Slot" (confirmed live: G12 rejected plays with
     * "Balance Allocated to Slot is too low" even at a large WBalance, until
     * this field is set explicitly per round).
     *
     * Per Mr Yemi, the response is meant to include the updated balance too
     * — exact field name not confirmed yet (every response we've captured
     * so far was just {message, success}, before this was added). Probes
     * the likely names defensively and returns whatever's found; roundsStore
     * uses this to update the wallet balance immediately without waiting on
     * a separate G25 call, when it's present.
     */
    async submitPrediction(roundId: string, value: number, amount: number): Promise<number | undefined> {
      const { phone } = requireSession();
      const slot = findSlot(roundId);
      const res = await callGateway<any>('G12', {
        slot: String(slot?.index ?? roundId),
        phone,
        predfigure: String(value),
        SlotAmount: String(amount),
      });
      const rawBalance = res?.WBalance ?? res?.balance ?? res?.Balance;
      return rawBalance != null ? Number(rawBalance) : undefined;
    },

    /**
     * CONFIRMED with the backend dev: G26 (SetProfileAutoPlay) configures
     * *and* enables/disables server-side Auto Play in one call — the server
     * plays every round itself from then on (works even with the app
     * closed), no client-side loop needed. `half_full` is "half" (12
     * rounds/day) or "full" (24 rounds/day); there's no predfigure field —
     * the server picks the number itself, matching how the Stock Value is
     * also drawn automatically with no operator involved.
     */
    async setAutoPlayProfile(mode: 'half' | 'full', amountPerSlot: number, enabled: boolean): Promise<void> {
      const { phone } = requireSession();
      await callGateway('G26', {
        Phone: phone,
        half_full: mode,
        amountperslot: amountPerSlot,
        istatus: enabled ? 1 : 0,
      });
    },

    /**
     * CONFIRMED with the backend dev: G27 (SetAutoPlay) is a lighter-weight
     * on/off toggle — flips Auto Play without resending mode/amount. Use
     * this once a profile has already been set up via setAutoPlayProfile.
     */
    async setAutoPlayStatus(enabled: boolean): Promise<void> {
      const { phone } = requireSession();
      await callGateway('G27', { Phone: phone, istatus: enabled ? 1 : 0 });
    },

    /**
     * ASSUMPTION (untestable until the session-validation bug is fixed):
     * G14 returns a flat array of individual round plays for the month, not
     * pre-grouped by day — same shape family as G13's per-round entries.
     * Grouped into DailyHistoryEntry here the same way mockApi.summarizeDay
     * does it. Field names are best-effort guesses (see mapResult) and need
     * checking against a real response once one is available.
     */
    async getHistory(year?: number, month?: number): Promise<DailyHistoryEntry[]> {
      const { phone } = requireSession();
      const now = new Date();
      const res = await callGateway<any>('G14', {
        Year: year ?? now.getFullYear(),
        Month: (month ?? now.getMonth()) + 1,
        Phone: phone,
      });
      // Same {success, data} vs. bare-array inconsistency seen on G13 — see
      // the comment in getToday() above.
      const results = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      return groupHistoryByDate(results);
    },
  },

  wallet: {
    /**
     * CONFIRMED shape (G25, per Mr Yemi): request {"phone": "..."}, response
     * {success, phone, balance} — a lighter-weight balance-only lookup than
     * G24's full profile payload, which is what auth.me() uses instead. No
     * totalProfit/totalProfitPercent field exists on this or any other
     * confirmed endpoint yet, so those stay honest zeros.
     *
     * Throws on failure instead of swallowing it — this used to catch and
     * return zeros unconditionally, which meant ANY transient failure (a
     * network hiccup, a slow response) silently replaced a real balance
     * with ₦0 on the next screen focus/pull-to-refresh, with no way to
     * distinguish "your balance is actually zero" from "we couldn't fetch
     * it". walletStore.refresh() now keeps the last known balance on
     * failure instead of overwriting it — the fix belongs there, not here.
     */
    async getBalance() {
      const { phone } = requireSession();
      const res = await callGateway<any>('G25', { phone });
      return { balance: Number(res?.balance ?? 0), totalProfit: 0, totalProfitPercent: 0 };
    },
    /**
     * CONFIRMED live (full round-trip, per Mr Yemi) — the new payment
     * gateway (not Paystack) works like this:
     *   1. We call PAY with cref/amount/description/cname/femail/cmobile.
     *      `cref` must be unique per attempt — we generate it client-side.
     *   2. The response's `response` field is itself a JSON-encoded
     *      *string* (not a nested object) — has to be JSON.parse()'d again.
     *      Real example:
     *        { status: true, httpStatus: 200,
     *          response: '{"status":true,"responseData":{"transactionReference":"...","charge":780,"redirectUrl":"https://...","message":null,"responseCode":"00"}}',
     *          request: '...' }
     *   3. Open `responseData.redirectUrl` (a hosted checkout page) — no
     *      WebView/SDK integration needed, a plain browser open is enough.
     *   4. The backend verifies and credits the balance itself via a
     *      webhook once payment completes — there's nothing for the client
     *      to call afterward. The existing G25 balance refresh (on screen
     *      focus) picks up the new balance once the webhook has landed.
     */
    async createDepositReference(amount: number, email?: string): Promise<{ redirectUrl: string; reference: string }> {
      const { phone } = requireSession();
      const cref = `dep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      // CONFIRMED live: the gateway validates femail as a real email address
      // and rejects a plain phone number with "The CustomerEmail field is
      // not a valid e-mail address." Registration now collects a real email
      // (G11's `email` field) — use it when known. Accounts that registered
      // before this (or a session that hasn't got it locally — see
      // User.email) fall back to a synthesized address that at least
      // passes format validation.
      const femail = email?.trim() || `${phone.replace(/\D/g, '')}@stocklab.app`;

      // CONFIRMED live: the gateway expects `amount` in kobo, not naira —
      // a ₦10,000 deposit showed as "101.30" on the checkout page (₦100.00
      // from 10000 kobo, plus the gateway's ₦1.30 fee), because we were
      // sending the raw naira value unconverted. The old Paystack
      // integration handled this correctly (`amount * 100`); that
      // conversion was dropped when switching gateways.
      const res = await callGateway<any>('PAY', {
        cref,
        amount: Math.round(amount * 100),
        description: 'Wallet deposit',
        cname: phone,
        femail,
        cmobile: phone,
      });

      let inner = res?.response;
      if (typeof inner === 'string') {
        try {
          inner = JSON.parse(inner);
        } catch {
          throw new Error('PAY succeeded but its response could not be parsed. Please try again.');
        }
      }
      const redirectUrl = inner?.responseData?.redirectUrl;
      if (!redirectUrl) {
        throw new Error('PAY succeeded but returned no checkout link. Please try again.');
      }
      return { redirectUrl, reference: inner?.responseData?.transactionReference ?? cref };
    },
    async getBanks(): Promise<Bank[]> {
      notSupported('Listing banks');
    },
    async resolveBankAccount(_accountNumber: string, _bankCode: string): Promise<ResolvedBankAccount> {
      notSupported('Resolving a bank account name');
    },
    async requestWithdrawal(_amount: number, _bank: Bank, _account: ResolvedBankAccount): Promise<WalletTransaction> {
      notSupported('Requesting a withdrawal (G16 only shows withdrawal history, nothing creates one)');
    },
    /**
     * Same reasoning as getBalance(): a real unified list would need
     * combining G15/G16/G17/G18 (each month-scoped, none confirmed yet).
     * Returns an empty list instead of throwing so the wallet screen's
     * auto-refresh doesn't break — an empty transaction history is at least
     * honest, unlike fabricated mock entries.
     */
    async getTransactions(): Promise<WalletTransaction[]> {
      return [];
    },
  },
};

function requireSession() {
  const session = getSession();
  if (!session) throw new Error('Not logged in.');
  return session;
}

/**
 * G13 (results by date) / G14 (play history) share one record shape, which
 * has changed more than once live during backend development — field names
 * below are read defensively (old name ?? new name) rather than assuming
 * either is final:
 *   - StartBalance -> renamed SlotAmount (the stake, per Mr Yemi — never a
 *     wallet balance, so not used for changePercent either way)
 *   - PValueGL -> split into Gain/GainPercent/Loss/LossPercent
 *   - FinalGorL ('G'/'L') -> GLN ('G'/'L'/'N' — 'N' for neutral/unset)
 *   - EndBalance -> renamed CurrentBalance
 *
 * CONFIRMED live: settlement itself still looks incomplete server-side —
 * every settled round captured so far (old shape and new) has come back
 * with a neutral/zeroed verdict (PValueGL/GLN "N", Gain/Loss/NetMovement
 * all 0) regardless of how close the prediction was, including one exact
 * PredValue==StockValue match. Don't treat a 0 valueGained as necessarily
 * meaningful yet — it may just mean "not computed."
 *
 * `distance` isn't read from `Closeness` (unconfirmed what it actually
 * measures — the one sample seen was 0 despite PredValue/StockValue being 3
 * apart, i.e. real placeholder data) — computed here as
 * |PredValue - StockValue| instead, same as before.
 */
function mapResult(roundId: string, raw: any) {
  const stockValue = Number(raw.StockValue ?? raw.stockValue ?? 0);
  const userPrediction = raw.PredValue != null ? Number(raw.PredValue) : (raw.predfigure ?? raw.PredFigure ?? undefined);
  const balanceAfter =
    raw.CurrentBalance != null
      ? Number(raw.CurrentBalance)
      : raw.EndBalance != null
        ? Number(raw.EndBalance)
        : (raw.balance ?? raw.Balance ?? undefined);

  let valueGained: number | undefined;
  if (raw.Gain != null || raw.Loss != null) {
    valueGained = Number(raw.Gain ?? 0) - Number(raw.Loss ?? 0);
  } else if (raw.NetMovement != null) {
    valueGained = Number(raw.NetMovement);
  } else {
    valueGained = raw.value ?? raw.Value ?? raw.amount ?? undefined;
  }

  let changePercent: number | undefined;
  if (raw.GainPercent != null || raw.LossPercent != null) {
    changePercent = Number(raw.GainPercent ?? 0) - Number(raw.LossPercent ?? 0);
  } else {
    // CONFIRMED live: PValueGL isn't always numeric — came back as "N"
    // (neutral) instead of a percentage on an incomplete settlement. Guard
    // against that becoming NaN and corrupting the display.
    const parsedPValueGL = raw.PValueGL != null && raw.PValueGL !== '' ? Number(raw.PValueGL) : NaN;
    changePercent = Number.isFinite(parsedPValueGL) ? parsedPValueGL : undefined;
  }

  const glFlag = raw.GLN ?? raw.FinalGorL;
  const finalOutcome: 'gain' | 'loss' | undefined = glFlag === 'G' ? 'gain' : glFlag === 'L' ? 'loss' : undefined;

  return {
    roundId,
    stockValue,
    userPrediction,
    distance: userPrediction != null ? Math.abs(userPrediction - stockValue) : undefined,
    changePercent,
    valueGained,
    balanceAfter,
    finalOutcome,
  };
}

/** Groups a flat array of round-play records (G14, same shape as G13 — see mapResult) into DailyHistoryEntry[]. */
function groupHistoryByDate(raw: any[]): DailyHistoryEntry[] {
  const byDate = new Map<string, any[]>();
  for (const entry of raw) {
    const date = String(entry.Datein ?? entry.DateComputed ?? entry.date ?? entry.Date ?? 'unknown');
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date)!.push(entry);
  }

  return Array.from(byDate.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, entries]) => {
      const rounds: DailyRound[] = entries.map((entry, i) => {
        const slotIndex = Number(entry.Slot ?? entry.slot ?? entry.roundId ?? i + 1);
        const slot = ROUND_SLOTS.find((s) => s.index === slotIndex) ?? ROUND_SLOTS[i % ROUND_SLOTS.length];
        return {
          slot,
          status: 'settled' as const,
          result: mapResult(slot.id, entry),
        };
      });
      const settled = rounds.filter((r) => r.result);
      const totalGain = settled.reduce((sum, r) => sum + (r.result?.valueGained ?? 0), 0);
      const totalChangePercent = settled.reduce((sum, r) => sum + (r.result?.changePercent ?? 0), 0);
      return { date, rounds, roundsSettled: settled.length, totalGain, totalChangePercent };
    });
}

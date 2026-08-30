import { Bank, DailyHistoryEntry, DailyRound, LinkedBankAccount, ResolvedBankAccount, SupportContact, User, WalletTransaction, WithdrawalHistoryEntry } from '../types';
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

/**
 * G22/G24's AmountDeposited/AmountPlayed/AmountGained/AmountWithdrawn come
 * back as comma-formatted strings (e.g. "51,318,325.00") — a bare Number()
 * on these silently produces NaN.
 */
function parseCommaNumber(value: unknown): number | undefined {
  if (typeof value !== 'string' || value === '') return undefined;
  const n = Number(value.replace(/,/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

/**
 * CONFIRMED live: both G22 and G24 now nest a profit/loss summary — `Profile`
 * on G22, lowercase `profile` on G24, same shape either way:
 *   {AmountDeposited, AmountPlayed, AmountGained, PercentGained, PercentLoss, AmountWithdrawn}
 * PercentGained/PercentLoss both come back "0.00%" even against a real
 * ₦1,080,100 loss — clearly not computed yet — so totalProfitPercent is
 * derived here from the (reliable) amount fields instead of trusting them.
 */
function parseProfitSummary(raw: any): {
  totalProfit: number;
  totalProfitPercent: number;
  totalDeposited?: number;
  totalWithdrawn?: number;
  alertMessage?: string;
  newsMessage?: string;
} {
  const summary = raw?.Profile ?? raw?.profile ?? {};
  const totalDeposited = parseCommaNumber(summary.AmountDeposited);
  const totalProfit = parseCommaNumber(summary.AmountGained) ?? 0;
  const totalWithdrawn = parseCommaNumber(summary.AmountWithdrawn);
  const totalProfitPercent = totalDeposited ? (totalProfit / totalDeposited) * 100 : 0;
  // Single current message strings, not a list — example shape (not yet
  // live-confirmed): Profile.alert / Profile.news, each just one string at a
  // time. This backend has been inconsistent with casing elsewhere (Profile
  // vs profile, WBalance vs balance), so checked defensively both ways —
  // but as of 2026-08-30 neither casing has actually appeared in a live G24
  // response, so this may just be a genuine backend gap, not a parsing miss.
  const alertMessage = summary.alert || summary.Alert || raw?.alert || raw?.Alert || undefined;
  const newsMessage = summary.news || summary.News || raw?.news || raw?.News || undefined;
  return { totalProfit, totalProfitPercent, totalDeposited, totalWithdrawn, alertMessage, newsMessage };
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
        // before it existed. `|| undefined` lets authStore's
        // preserveLoginOnlyFields fall back to a locally-remembered email
        // instead of overwriting it with a known-blank one.
        email: profile.email || undefined,
        role: 'user',
        balance: 0, // WBalance IS present in this response (confirmed), but G25 is the dedicated/canonical balance lookup — see wallet.getBalance()
        // CONFIRMED live: SlotAmount is now on G22 too, but at the TOP
        // LEVEL of the response (sibling to Profile/SessionID), not nested
        // inside Profile like email is — a real live response showed
        // {IsValid, SessionID, SlotAmount, WBalance, Profile: {...}}.
        slotAmount: loginRes?.SlotAmount != null ? Number(loginRes.SlotAmount) : undefined,
        ...parseProfitSummary(loginRes),
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
        slotAmount: res?.SlotAmount != null ? Number(res.SlotAmount) : undefined,
        ...parseProfitSummary(res),
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

    /**
     * G19 (Admin Contact) — a "reach the developers" support contact for
     * the Profile page. CONFIRMED live it responds with
     * {"success":false,"message":"Admin contact not found."} regardless of
     * what's sent, meaning no contact is configured server-side yet — not
     * a request-format problem. Field names on a real success response are
     * an unconfirmed guess (see SupportContact) since we've never seen one.
     */
    async getSupportContact(): Promise<SupportContact | null> {
      const { phone } = requireSession();
      const res = await callGateway<any>('G19', { phone }).catch(() => null);
      if (!res || res.success === false) return null;
      return {
        email: res.Email ?? res.email ?? undefined,
        phone: res.Phone ?? res.phone ?? undefined,
        whatsapp: res.WhatsApp ?? res.Whatsapp ?? res.whatsapp ?? undefined,
        message: res.Message ?? res.message ?? undefined,
      };
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
     * CONFIRMED per Mr Yemi's official docs (G14_showPlayHistory): request
     * is {"Year": "2026", "Month": "08", "Phone": "..."} — Year AND Month
     * are both zero-padded/plain STRINGS, not numbers (matches what we'd
     * already found live: a numeric Month fails validation with "Invalid
     * Year, Month or Phone."). Response is {success, data: [...]}, same
     * record shape family as G13 (see mapResult) — confirmed by the same
     * docs showing a real example record with Gain/GainPercent/Closeness/GLN.
     *
     * Still unresolved live even with the correct request shape: the
     * endpoint fails server-side with "Unable to convert MySQL date/time
     * value to System.DateTime" — a real backend bug, not a request-format
     * issue.
     */
    async getHistory(year?: number, month?: number): Promise<DailyHistoryEntry[]> {
      const { phone } = requireSession();
      const now = new Date();
      const res = await callGateway<any>('G14', {
        Year: String(year ?? now.getFullYear()),
        Month: String((month ?? now.getMonth()) + 1).padStart(2, '0'),
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
      //
      // CONFIRMED live: the backend's own outgoing request to the gateway
      // hardcodes `returnUrl: "https://www.shopy.com"` — after completing
      // payment, the user gets stranded on that page with no way back into
      // the app. We didn't send a returnUrl at all before, so there was
      // nothing for the backend to use instead. Sending our app's own deep
      // link here — NEEDS Mr Yemi to actually relay this value to the
      // gateway's returnUrl instead of the hardcoded one for this to work;
      // sending it alone doesn't guarantee he's reading it yet.
      const returnUrl = `stocklab://deposit-return?ref=${encodeURIComponent(cref)}`;
      const res = await callGateway<any>('PAY', {
        cref,
        amount: Math.round(amount * 100),
        description: 'Wallet deposit',
        cname: phone,
        femail,
        cmobile: phone,
        returnUrl,
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
    /**
     * CONFIRMED live (via manual testing with Mr Yemi): GR re-triggers the
     * gateway->PayHook crediting flow for a given transaction reference —
     * takes {phone, refNo}. Useful because passively waiting for the
     * balance to change (G25 polling) depends entirely on the webhook
     * having already landed; actively requerying nudges it instead of just
     * hoping. `reference` must be the gateway's own transactionReference
     * from createDepositReference()'s return value, not our own `cref`.
     */
    async requeryDeposit(reference: string): Promise<{ success: boolean; message?: string }> {
      const { phone } = requireSession();
      const res = await callGateway<any>('GR', { phone, refNo: reference });
      return { success: !!res?.success, message: res?.message };
    },
    async getBanks(): Promise<Bank[]> {
      notSupported('Listing banks');
    },
    async resolveBankAccount(_accountNumber: string, _bankCode: string): Promise<ResolvedBankAccount> {
      notSupported('Resolving a bank account name');
    },
    /**
     * Step 1 of linking (or changing) a payout account: after the account
     * number resolves to a real name, this sends a one-time code so the
     * user can confirm the account actually belongs to them before it gets
     * saved as their withdrawal destination. No confirmed endpoint yet.
     */
    async sendBankVerificationOtp(_account: ResolvedBankAccount & { bankName: string }): Promise<void> {
      notSupported('Sending a bank account verification code');
    },
    /**
     * Step 2: submits the code the user received along with the account
     * details, confirming and saving it as the on-file payout account. No
     * confirmed endpoint yet.
     */
    async confirmBankVerificationOtp(_otp: string, _account: ResolvedBankAccount & { bankName: string }): Promise<LinkedBankAccount> {
      notSupported('Confirming a bank account verification code');
    },
    /** No confirmed endpoint yet for the on-file payout account the withdrawal page displays. */
    async getLinkedBankAccount(): Promise<LinkedBankAccount | null> {
      notSupported('Looking up your payout bank account');
    },
    /**
     * Withdrawal uses whatever bank account is on file (linked via the
     * verify+OTP flow above) — no bank/account picking at request time. No
     * confirmed endpoint yet for actually creating a withdrawal request.
     */
    async requestWithdrawal(_amount: number): Promise<void> {
      notSupported('Requesting a withdrawal');
    },
    /** No confirmed endpoint yet for the withdrawal history table (Date Requested/Balance Before/After/Open-Closed/Date Credited). */
    async getWithdrawalHistory(): Promise<WithdrawalHistoryEntry[]> {
      notSupported('Fetching withdrawal history');
    },
    /**
     * CONFIRMED shape (G15_ShowDepositsAND_Others, per Mr Yemi's docs):
     * request {Year, Month, Phone, Code}, Code one of D(eposit)/W(ithdrawal)/
     * G(ain)/P(lay); response {success, Code, Balance, TotalAmountWithinMonth,
     * Records}.
     *
     * CONFIRMED live record shape (Records was empty until a server-side fix
     * — this is real data, not a guess):
     *   Deposit: {Id, Phone, Label:"DEPOSIT", LabelID:"D", Bank, Amount, Datein, Timein}
     *   Play:    {Id, Phone, Label:"<slot index>", LabelID:"P", Bank, Amount (negative), Datein, Timein}
     * Withdrawal/Gain records not seen populated yet (no withdrawals exist;
     * settlement math isn't computing real gains yet) — mapped the same way
     * defensively, on the assumption they share this shape.
     */
    async getTransactions(year?: number, month?: number): Promise<WalletTransaction[]> {
      const { phone } = requireSession();
      const now = new Date();
      const yearStr = String(year ?? now.getFullYear());
      const monthStr = String((month ?? now.getMonth()) + 1).padStart(2, '0');
      const codes: Array<'D' | 'W' | 'G' | 'P'> = ['D', 'W', 'G', 'P'];
      const responses = await Promise.all(
        codes.map((Code) => callGateway<any>('G15', { Year: yearStr, Month: monthStr, Phone: phone, Code }).catch(() => null))
      );
      const allRecords = responses.flatMap((res) => (Array.isArray(res?.Records) ? res.Records : []));
      const transactions = allRecords.map(mapTransaction).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return transactions;
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
 * CONFIRMED live: there is no server-drawn "stock value" — `StockValue`
 * exactly equals `CurrentBalance` in every real settled record seen (543.75
 * == 543.75, 300 == 300, -187.5 == -187.5, across multiple rows), and was
 * wildly out of range (97979) before that. Scoring is actually based on
 * `Average` — the mean prediction across all players for that round —
 * with `Closeness` (0-1) measuring how near a pick was to it: the closest
 * pick to Average got a real gain, the farthest got a real loss, in the
 * same real dataset. `distance` is computed here as |PredValue - Average|
 * instead of the old (meaningless) |PredValue - StockValue|.
 */
function mapResult(roundId: string, raw: any) {
  const userPrediction = raw.PredValue != null ? Number(raw.PredValue) : (raw.predfigure ?? raw.PredFigure ?? undefined);
  const parsedAverage = raw.Average != null && raw.Average !== '' ? Number(raw.Average) : NaN;
  const average = Number.isFinite(parsedAverage) ? parsedAverage : undefined;
  const parsedCloseness = raw.Closeness != null && raw.Closeness !== '' ? Number(raw.Closeness) : NaN;
  const closeness = Number.isFinite(parsedCloseness) ? parsedCloseness : undefined;
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
    average,
    closeness,
    userPrediction,
    distance: userPrediction != null && average != null ? Math.abs(userPrediction - average) : undefined,
    changePercent,
    valueGained,
    balanceAfter,
    finalOutcome,
  };
}

/**
 * Maps a G15 Records entry to a WalletTransaction — see the confirmed shape
 * noted above wallet.getTransactions(). `LabelID` is the category
 * (D/W/P, or G/L/N for a settled round outcome); `Label` is either a fixed
 * string ("DEPOSIT") or the slot index as a string, depending on category.
 */
function mapTransaction(raw: any): WalletTransaction {
  const labelId = raw.LabelID;
  const amount = Number(raw.Amount ?? 0);
  const createdAt = `${raw.Datein ?? ''}T${raw.Timein ?? '00:00:00'}`;

  let type: WalletTransaction['type'];
  let description: string;
  if (labelId === 'D') {
    type = 'deposit';
    description = raw.Bank ? `Deposit via ${raw.Bank}` : 'Deposit';
  } else if (labelId === 'W') {
    type = 'withdrawal';
    description = raw.Bank ? `Withdrawal to ${raw.Bank}` : 'Withdrawal';
  } else if (labelId === 'P') {
    type = 'round_stake';
    description = `Round ${raw.Label} stake`;
  } else {
    // 'G'/'L'/'N' — a settled round's gain/loss outcome, not seen populated yet
    type = amount >= 0 ? 'round_gain' : 'round_loss';
    description = `Round ${raw.Label} result`;
  }

  return {
    id: String(raw.Id),
    type,
    amount,
    createdAt,
    description,
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

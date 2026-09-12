import { DailyHistoryEntry, DailyRound, InviteStats, LinkedBankAccount, SupportContact, User, VirtualAccount, WalletPeriodTotals, WalletTransaction, WithdrawalHistoryEntry } from '../types';
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
 *   - PAY (Pay_CreatePayment)/GR (deposit requery): the old card-checkout
 *     deposit path — confirmed working while it existed, but deliberately
 *     removed per product decision in favor of the virtual-account model
 *     (VV/BB) being the only deposit method now. Not a gap, a removal.
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
 *   - The OTP delivered via G20 (reused for RBP/IP below, since neither
 *     came with its own matching "send OTP" endpoint) is UNCONFIRMED to
 *     actually be what RBP/IP validate — needs a real live test.
 *   - How a VV-generated virtual account's incoming transfer actually
 *     credits the wallet balance — no webhook/requery equivalent to PAY's
 *     is documented for it yet.
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
 * A real Nigerian bank account number (NUBAN) is always 10 digits. CONFIRMED
 * live: when the backend's virtual-account provider call times out, BB/VV
 * still return success:true but put literal error text ("ERROR", "TOKEN
 * TIMEOUT", even a raw exception message) into these exact fields instead —
 * this rejects anything that isn't a plausible account number before it's
 * ever treated as real data, so that failure mode shows "not set up yet" in
 * the UI instead of a crash dump.
 */
function isLikelyAccountNumber(value: unknown): boolean {
  if (typeof value !== 'string' && typeof value !== 'number') return false;
  return /^\d{10}$/.test(String(value));
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
  appStoreUrl?: string;
  playStoreUrl?: string;
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
  // CONFIRMED live on G22's top level (sibling to Profile, same place as
  // alert/news): {appstore, playstore}. Currently just Mr Yemi's test
  // placeholders (google.com/yahoo.com), not real store listings yet — the
  // Invite screen uses these for its WhatsApp download link, so they'll
  // start working for real the moment he sets the actual URLs, no client
  // change needed.
  const appStoreUrl = raw?.appstore || raw?.AppStore || undefined;
  const playStoreUrl = raw?.playstore || raw?.PlayStore || undefined;
  return { totalProfit, totalProfitPercent, totalDeposited, totalWithdrawn, alertMessage, newsMessage, appStoreUrl, playStoreUrl };
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
     *
     * This is a manual (user-tapped) submission only. Auto Play rounds no
     * longer call G12 from the client at all — CONFIRMED per Mr Yemi
     * (2026-09-08), calling A1 to enable Auto Play on a round is now the
     * only client action needed; the backend sets a figure and settles the
     * round itself on its own schedule. See autoPlayStore.ts.
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
     * CONFIRMED per Mr Yemi's A1/A2/UU doc: A2_GetAutoPlaybyPhone returns
     * every round's Auto Play record in one call — {autoplay: [{Round,
     * Status, Figure, ...}]}. Used to hydrate all 24 rounds' state at once
     * (on Predict screen focus and once at app startup) rather than calling
     * A3 (single-round lookup) 24 times.
     *
     * CONFIRMED live: this key requires PascalCase `Phone` — lowercase
     * `phone` (which A1/UU already sent correctly, but this didn't) gets
     * rejected with {"message":"Phone is required","success":false}. Same
     * per-endpoint casing inconsistency already documented elsewhere in
     * this file (e.g. G12 vs G26/A1) — the response field casing inside
     * `records` below is still unconfirmed pending a real successful call.
     */
    async getAutoPlayConfigs(): Promise<Record<number, { enabled: boolean; figure: number }>> {
      const { phone } = requireSession();
      const res = await callGateway<any>('A2', { Phone: phone });
      const records = res?.autoplay ?? res?.Autoplay ?? [];
      const configs: Record<number, { enabled: boolean; figure: number }> = {};
      for (const record of records) {
        const round = Number(record?.round ?? record?.Round);
        if (Number.isNaN(round)) continue;
        configs[round] = {
          enabled: Number(record?.status ?? record?.Status) === 1,
          figure: Number(record?.figure ?? record?.Figure ?? 3),
        };
      }
      return configs;
    },

    /**
     * CONFIRMED per the same doc: A1_SetAutoPlay sets one round's Auto Play
     * config. Figure is only sent when enabling — per the documented rule,
     * "When Status = 0 (OFF), Figure is not required and the existing
     * Figure is not changed", so omitting it when disabling is correct, not
     * an oversight.
     */
    async setAutoPlayConfig(round: number, enabled: boolean, figure?: number): Promise<void> {
      const { phone } = requireSession();
      await callGateway('A1', {
        Phone: phone,
        Round: round,
        Status: enabled ? 1 : 0,
        ...(enabled ? { Figure: figure } : {}),
      });
    },

    /**
     * CONFIRMED per the same doc: UU_Universal is a bulk on/off for every
     * round belonging to this phone in one call — the master toggle above
     * the per-round list. Doesn't touch each round's individual Figure.
     */
    async setAllAutoPlay(enabled: boolean): Promise<void> {
      const { phone } = requireSession();
      await callGateway('UU', { Phone: phone, Status: enabled ? 1 : 0 });
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
     * CONFIRMED per Mr Yemi's BB/PP/VV doc (BB_getBankAccountProfile):
     * reads back both the inbound (deposit, i.e. virtual account) and
     * outbound (payout) bank details in one call from gtblusers. Response
     * field casing hasn't been confirmed live yet — probes the documented
     * lowercase names with a PascalCase fallback, same defensive approach
     * used everywhere else in this file for this backend's inconsistent casing.
     *
     * CONFIRMED live (via a manual Postman probe, not the app itself): when
     * the backend's own call to its third-party virtual-account provider
     * times out, it still returns success:true, but stuffs the failure
     * itself into the data fields instead of a real account — a real
     * response looked like {"inbankname":"TOKEN TIMEOUT",
     * "inbankaccountno":"ERROR", "inaccountname":"System.Threading.Tasks.
     * TaskCanceledException: ..."} (a raw .NET stack trace, no less). Never
     * trust these fields at face value — isLikelyAccountNumber() below
     * rejects anything that isn't a plausible 10-digit NUBAN before this
     * is treated as a real account, so a future recurrence of this backend
     * bug shows "not set up yet" instead of a crash dump in the deposit UI.
     */
    async getBankProfile(): Promise<{ deposit: VirtualAccount | null; payout: LinkedBankAccount | null }> {
      const { phone } = requireSession();
      const res = await callGateway<any>('BB', { phone });
      const inBank = res?.inbankname ?? res?.InBankName;
      const inAcct = res?.inbankaccountno ?? res?.InBankAccountNo;
      const inName = res?.inaccountname ?? res?.InAccountName;
      const outBank = res?.outbankname ?? res?.OutBankName;
      const outAcct = res?.outbankaccountno ?? res?.OutBankAccountNo;
      const outName = res?.outaccountname ?? res?.OutAccountName;
      return {
        deposit: isLikelyAccountNumber(inAcct) ? { bankName: inBank ?? '', accountNumber: String(inAcct), accountName: inName ?? '' } : null,
        payout: isLikelyAccountNumber(outAcct) ? { bankName: outBank ?? '', accountNumber: String(outAcct), fullName: outName ?? '' } : null,
      };
    },
    /**
     * CONFIRMED per the same doc (VV_generateVirtualAccount): idempotent —
     * checks whether the user already has a virtual account, generates one
     * only if missing. Safe to call every time the deposit UI needs it.
     *
     * Same third-party-timeout failure mode as getBankProfile above applies
     * here too (this is the call that actually hit it live) — this is the
     * primary creation path, so rather than silently returning garbage
     * (which the deposit screen would then display as-is), an implausible
     * account number throws a clean error instead, matching how every
     * other real failure surfaces here.
     */
    async generateVirtualAccount(): Promise<VirtualAccount> {
      const { phone } = requireSession();
      const res = await callGateway<any>('VV', { phone });
      const accountNumber = res?.inbankaccountno ?? res?.InBankAccountNo;
      if (!isLikelyAccountNumber(accountNumber)) {
        throw new Error('Could not create your deposit account right now. Please try again shortly.');
      }
      return {
        bankName: res?.inbankname ?? res?.InBankName ?? '',
        accountNumber: String(accountNumber),
        accountName: res?.inaccountname ?? res?.InAccountName ?? '',
      };
    },
    /**
     * CONFIRMED shape per Mr Yemi's doc (theKey "AAA") — resolves the real
     * account holder's name from just a bank + account number, third-party
     * (VigiPay-style) name-enquiry underneath. Request: {bankCode,
     * accNumber}. Response: {status, responseData: {accountName,
     * accountNumber, bankName, bankCode}, message, responseCode}.
     *
     * Per the new product decision, this REPLACES letting the user type
     * their own "name on the account" for PP/RBP — free-typed names could
     * silently mismatch the real account holder, which is exactly the kind
     * of mistake that sends a payout to the wrong place. Now the name is
     * always the one the bank itself returns for that account number.
     *
     * Session requirement isn't stated in the doc. NOT defaulting to exempt
     * this time — assuming exempt was wrong for both IP and RBP earlier this
     * session (both came back with the generic "Login Again!" session
     * rejection until real session headers were sent), so this leaves
     * requiresSession at its default (true) instead of repeating that guess.
     * callGateway's existing status===false handling already surfaces a
     * failed lookup's message (e.g. wrong account/bank combination) as a
     * clean BackendError, so no extra handling needed for that case here.
     */
    async verifyBankAccount(bankCode: string, accountNumber: string): Promise<{ accountName: string; bankName: string }> {
      requireSession();
      const res = await callGateway<any>('AAA', { bankCode, accNumber: accountNumber });
      const data = res?.responseData;
      if (!data?.accountName) {
        throw new Error('Could not verify that account. Check the account number and bank.');
      }
      return {
        accountName: data.accountName,
        bankName: data.bankName ?? '',
      };
    },
    /**
     * CONFIRMED per the same doc (PP_SetPayOutBankDetails): can only be set
     * once per account — exact rejection shape on a second call isn't
     * confirmed live yet, but callGateway's existing success===false
     * handling already surfaces the server's own message as a BackendError,
     * so no extra handling is needed here.
     *
     * `bankCode` (the NIBSS institution code, from the bank picker) is
     * CONFIRMED required — not by Mr Yemi's original doc, but live: RBP
     * below rejected a call with the same outbank-name/OTP/PinCode shape with
     * {"message": "BankCode is required", "success": false}.
     *
     * Sends BOTH `BankCode` and `outbankcode`, deliberately — CONFIRMED live
     * that `BankCode` alone reaches PP correctly (visible verbatim in the
     * request body in every device log) but PP silently never persists it
     * (`outbankcode` always comes back null in its response, even on a
     * success), while the exact same `BankCode` field DOES get saved
     * correctly by RBP. That split strongly suggests PP's own handler reads
     * a different field name than RBP's does — most likely `outbankcode`,
     * matching the lowercase "out"-prefixed naming its three sibling fields
     * already use here (outbankname/outbankaccountno/outaccountname), unlike
     * RBP which happens to check `BankCode`. Sending both costs nothing and
     * covers whichever one each endpoint's code actually reads.
     */
    async setPayoutBankDetails(bankName: string, bankCode: string, accountNumber: string, accountName: string): Promise<LinkedBankAccount> {
      const { phone } = requireSession();
      const res = await callGateway<any>('PP', {
        phone,
        outbankname: bankName,
        BankCode: bankCode,
        outbankcode: bankCode,
        outbankaccountno: accountNumber,
        outaccountname: accountName,
      });
      return {
        bankName: res?.outbankname ?? res?.OutBankName ?? bankName,
        accountNumber: String(res?.outbankaccountno ?? res?.OutBankAccountNo ?? accountNumber),
        fullName: res?.outaccountname ?? res?.OutAccountName ?? accountName,
      };
    },
    /**
     * UNCONFIRMED assumption, not a documented endpoint for this purpose:
     * neither RBP (reset payout bank details) nor IP (trigger a withdrawal)
     * came with a matching "send the OTP these consume" endpoint. Reusing
     * G20 (password-reset OTP) purely as a delivery mechanism for both —
     * we never call G21 afterward, so no password actually changes; RBP/IP
     * are what's expected to consume this code for their own, different
     * purposes. If either validates against a separate OTP store than what
     * G20 writes to, this fails cleanly with an "invalid OTP" error rather
     * than doing anything wrong — but this genuinely needs confirming with
     * him, not just trusting it works, for both call sites.
     */
    async sendWalletSecurityOtp(): Promise<void> {
      const { phone } = requireSession();
      await callGateway('G20', { Phone: phone }, { requiresSession: false });
    },
    /**
     * CONFIRMED shape per Mr Yemi (theKey "RBP"), for resetting/changing
     * payout bank details already set once via PP — {Phone, OTP, PinCode,
     * outbankname, outbankaccountno, outaccountname}.
     *
     * NOT session-exempt — CONFIRMED live the hard way: IP (below) was built
     * with the same "PinCode is its own proof, trans_token is redundant"
     * assumption and, called without session headers, came back
     * {"IsValid": false, "Message": "Login Again!"} — this backend's generic
     * central-auth-pipeline rejection, which callGateway treats as "the
     * whole session is dead" and force-logs-out. So the assumption was
     * simply wrong: OTP+PinCode is extra proof layered on top of the normal
     * trans_token/refID/phone/deviceid session, not a replacement for it.
     * Fixed here too on the same reasoning, even though this one hadn't
     * been hit live yet — no reason to wait for it to fail the same way.
     *
     * CONFIRMED live: also requires `BankCode` (the NIBSS institution code)
     * alongside outbankname — rejected with {"message": "BankCode is
     * required", "success": false} without it, and CONFIRMED `BankCode` is
     * what RBP actually persists (comes back correctly in its response,
     * unlike PP — see setPayoutBankDetails' comment for that mismatch).
     * Also sending `outbankcode` alongside it here anyway, purely as cheap
     * insurance in case that ever changes; doesn't affect the confirmed-
     * working `BankCode` behavior either way.
     */
    async resetPayoutBankDetails(
      otp: string,
      pinCode: string,
      bankName: string,
      bankCode: string,
      accountNumber: string,
      accountName: string
    ): Promise<LinkedBankAccount> {
      const { phone } = requireSession();
      const res = await callGateway<any>('RBP', {
        Phone: phone,
        OTP: otp,
        PinCode: pinCode,
        outbankname: bankName,
        BankCode: bankCode,
        outbankcode: bankCode,
        outbankaccountno: accountNumber,
        outaccountname: accountName,
      });
      return {
        bankName: res?.outbankname ?? res?.OutBankName ?? bankName,
        accountNumber: String(res?.outbankaccountno ?? res?.OutBankAccountNo ?? accountNumber),
        fullName: res?.outaccountname ?? res?.OutAccountName ?? accountName,
      };
    },
    /**
     * CONFIRMED shape per Mr Yemi (theKey "IP"): {Phone, Amount, OTP,
     * PinCode}. Withdrawal uses whatever bank account is already on file
     * (set via PP/RBP above) — no bank/account picking at request time,
     * "IP" only takes an amount plus the same OTP+password proof RBP uses.
     *
     * NOT session-exempt — CONFIRMED live: calling this without the normal
     * trans_token/refID/phone/deviceid session headers returns
     * {"IsValid": false, "Message": "Login Again!"}, which callGateway reads
     * as "the login session is dead" and force-logs-out the whole app back
     * to the sign-in screen. That's what was actually happening — not a real
     * session expiry, just this call never sending the session proof it
     * turns out to need. OTP+PinCode is on top of the normal session, not
     * instead of it.
     */
    async requestWithdrawal(amount: number, otp: string, pinCode: string): Promise<void> {
      const { phone } = requireSession();
      await callGateway('IP', { Phone: phone, Amount: amount, OTP: otp, PinCode: pinCode });
    },
    /** No confirmed endpoint yet for the withdrawal history table (Date Requested/Balance Before/After/Open-Closed/Date Credited). */
    async getWithdrawalHistory(): Promise<WithdrawalHistoryEntry[]> {
      notSupported('Fetching withdrawal history');
    },
    /**
     * CONFIRMED shape (G15_ShowDepositsAND_Others, per Mr Yemi's docs):
     * request {Year, Month, Phone, Code}, Code one of D(eposit)/W(ithdrawal)/
     * G(ame)/P(lay); response {success, Code, Balance, TotalAmountWithinMonth,
     * Records}. CONFIRMED per Mr Yemi (2026-09-08): Code "G" actually means
     * `LabelID IN ('G','L','N')` — every game outcome (gain/loss/neutral),
     * not gains only, despite the "G" letter suggesting otherwise.
     *
     * CONFIRMED live record shape (Records was empty until a server-side fix
     * — this is real data, not a guess):
     *   Deposit: {Id, Phone, Label:"DEPOSIT", LabelID:"D", Bank, Amount, Datein, Timein}
     *   Play:    {Id, Phone, Label:"<slot index>", LabelID:"P", Bank, Amount (negative), Datein, Timein}
     * Withdrawal/Game records not seen populated yet (no withdrawals exist;
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
    /**
     * CONFIRMED shape (G15B_ShowTotalsByMonth, per Mr Yemi 2026-09-08):
     * request {Year, Month, Phone} -> {success, Year, Month, Phone, D, W, G, P}
     * — pre-summed monthly totals per category, sparing a client-side sum
     * over getTransactions()'s full record list. D/W/G mean the same thing
     * as G15's codes (G = every game outcome, not gains only); P (Play) is
     * returned as an absolute value per his doc, even though individual G15
     * play records are negative amounts.
     *
     * Replaces the backend's PercentGained/PercentLoss fields (G22/G24),
     * which are confirmed-dead placeholders (always "0.00%") — per Mr
     * Yemi's new direction, show these as exact totals instead, with any
     * percentage derived client-side from Plays vs. Gains (see
     * computeGainPercent below), not trusted from the backend.
     */
    async getMonthlyTotals(year?: number, month?: number): Promise<WalletPeriodTotals> {
      const { phone } = requireSession();
      const now = new Date();
      const yearStr = String(year ?? now.getFullYear());
      const monthStr = String((month ?? now.getMonth()) + 1).padStart(2, '0');
      const res = await callGateway<any>('G15B', { Year: yearStr, Month: monthStr, Phone: phone });
      return {
        deposits: parseCommaNumber(res?.D) ?? 0,
        withdrawals: parseCommaNumber(res?.W) ?? 0,
        gains: parseCommaNumber(res?.G) ?? 0,
        plays: parseCommaNumber(res?.P) ?? 0,
      };
    },
    /**
     * CONFIRMED shape (G15C_ShowTotalsByToday, per Mr Yemi 2026-09-08):
     * request {Phone} -> {success, Date, Phone, D, W, G, P} — same fields as
     * G15B, scoped to today instead of a calendar month.
     */
    async getDailyTotals(): Promise<WalletPeriodTotals> {
      const { phone } = requireSession();
      const res = await callGateway<any>('G15C', { Phone: phone });
      return {
        deposits: parseCommaNumber(res?.D) ?? 0,
        withdrawals: parseCommaNumber(res?.W) ?? 0,
        gains: parseCommaNumber(res?.G) ?? 0,
        plays: parseCommaNumber(res?.P) ?? 0,
      };
    },
  },

  invite: {
    /**
     * CONFIRMED per Mr Yemi's B1/B2/B3 doc (B3_GetCountInvited): returns
     * this user's referral stats in one call. Response field casing not
     * confirmed live yet — probes the documented PascalCase with a
     * lowercase fallback, same defensive approach as every other endpoint
     * here.
     *
     * CONFIRMED live: the request param requires PascalCase `Phone` —
     * lowercase `phone` gets rejected with {"message":"Phone is
     * required","success":false}, same as A2 (see getAutoPlayConfigs).
     */
    async getStats(): Promise<InviteStats> {
      const { phone } = requireSession();
      const res = await callGateway<any>('B3', { Phone: phone });
      return {
        numberInvited: Number(res?.NumberInvited ?? res?.numberinvited ?? 0),
        successfulConversions: Number(res?.SuccessfulConversions ?? res?.successfulconversions ?? 0),
        credits: Number(res?.Credits ?? res?.credits ?? 0),
        payout: Number(res?.Payout ?? res?.payout ?? 0),
      };
    },
    /**
     * CONFIRMED per the same doc (B2_IsRegisteredUser): `Phone` here is the
     * number being checked (a contact), not the caller's own — used to
     * decide whether a contact shows a "already joined" badge or an invite
     * button. Return field name isn't given in the doc beyond "whether the
     * phone is a registered user" — probes likely names defensively.
     * Deliberately does NOT fall back to `success`: that only reflects
     * whether the call itself worked, not the registration result, and
     * using it here would read as "everyone is registered."
     *
     * CORRECTED (an earlier version of this comment claimed lowercase
     * `phone` worked here — that was wrong, confirmed live by directly
     * comparing both casings side by side): lowercase `phone` gets B2 to
     * fail with the generic {"IsValid":false,"Message":"Login Again!"}
     * central-auth-pipeline rejection for EVERY number, registered or not
     * — the backend never sees a phone to check at all. `Phone` (PascalCase,
     * matching B1/B3) is required. That earlier claim was itself built on a
     * coincidence, same as the bare-boolean fix below's own history.
     *
     * The response isn't always an object — it can be a bare boolean
     * (`<- B2 false`) for a real, previously-seen number. For a number the
     * system has never seen at all, it instead returns
     * {"IsValid":false,"Message":"Incoherent Data : Unauthorized Access -2"}
     * — the SAME shape used for actual session death elsewhere, but this has
     * nothing to do with the caller's own session (checking a contact's
     * number is a normal, frequent Invite-screen action, not an auth event).
     * `ignoreIsValidFalse` stops that from force-logging out anyone who
     * opens Invite; the catch below then treats "couldn't confirm" the same
     * as "not registered" — both get the same UI treatment (show Invite,
     * not a joined badge), so there's nothing meaningful to distinguish here.
     */
    async isRegistered(phoneToCheck: string): Promise<boolean> {
      try {
        const res = await callGateway<any>('B2', { Phone: phoneToCheck }, { ignoreIsValidFalse: true });
        if (typeof res === 'boolean') return res;
        return !!(res?.isRegistered ?? res?.IsRegistered ?? res?.registered ?? res?.Registered ?? res?.exists ?? res?.Exists);
      } catch {
        return false;
      }
    },
    /**
     * CONFIRMED per the same doc (B1_LogInvite): logs that this user
     * invited `receiverPhone` — the backend already knows who invited whom
     * from this call alone, so no separate referral code is needed for the
     * per-contact WhatsApp invite flow.
     */
    async logInvite(receiverPhone: string): Promise<void> {
      const { phone } = requireSession();
      await callGateway('B1', { Phone: phone, Receiver: receiverPhone });
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

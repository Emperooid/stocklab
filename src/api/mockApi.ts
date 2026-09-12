import { Bank, DailyHistoryEntry, DailyRound, ResolvedBankAccount, RoundResult, User, WalletTransaction } from '../types';
import { ROUND_SLOTS, getOperatingDayStart, getSlotStatus } from '../lib/schedule';
import { applyConservativeAdjustment, ROUND_STAKE } from '../lib/payout';

// In-memory mock backend. Swap this module out for src/api/httpApi.ts
// once real endpoints are available — see src/api/index.ts.

// MOCK: this single demo account defaults to 'admin' so it can exercise the
// Round Controls (Set/Update Stock Value, defaults) while there's only one
// user in the system. A real backend must assign role from the database
// based on the authenticated account — never trust a client-sent role, and
// never default a real user to admin.
let currentUser: User = {
  id: 'u1',
  name: 'Ada Obi',
  phone: '08012345678',
  role: 'admin',
  balance: 5000,
  totalProfit: 0,
  totalProfitPercent: 0,
};

const pendingOtps = new Map<string, string>(); // phone -> OTP, for register/reset flows

const predictions = new Map<string, number>(); // roundId -> user's value
const stockValues = new Map<string, number>(); // roundId -> operator-set Stock Value for today
const defaultStockValues = new Map<string, number>(); // slot id -> default, reapplied every day unless overridden
const results = new Map<string, RoundResult>(); // roundId -> settled result
const transactions: WalletTransaction[] = [];
const historyByDate = new Map<string, DailyRound[]>(); // past days, archived on rollover

function delay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function failAfterDelay(message: string, ms = 400): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms));
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function summarizeDay(date: string, rounds: DailyRound[]): DailyHistoryEntry {
  const settled = rounds.filter((r) => r.result);
  const totalGain = settled.reduce((sum, r) => sum + (r.result?.valueGained ?? 0), 0);
  const totalChangePercent = settled.reduce((sum, r) => sum + (r.result?.changePercent ?? 0), 0);
  return { date, rounds, roundsSettled: settled.length, totalGain, totalChangePercent };
}

let activeDateKey = dateKey(getOperatingDayStart(new Date()));

/**
 * Archives the current operating day's rounds (if any were settled) and
 * resets state for a new day. The operating day rolls over at midnight (see
 * DAY_START_HOUR in schedule.ts), matching Round 1 opening at 12:00 AM.
 */
function rolloverDayIfNeeded(now: Date) {
  const todayKey = dateKey(getOperatingDayStart(now));
  if (todayKey === activeDateKey) return;

  const rounds = ROUND_SLOTS.map((slot) => ({
    slot,
    status: 'settled' as const,
    prediction:
      predictions.has(slot.id)
        ? { roundId: slot.id, value: predictions.get(slot.id)!, submittedAt: activeDateKey }
        : undefined,
    stockValue: stockValues.get(slot.id),
    result: results.get(slot.id),
  }));
  if (rounds.some((r) => r.result)) {
    historyByDate.set(activeDateKey, rounds);
  }

  predictions.clear();
  stockValues.clear(); // manual overrides don't carry over; defaultStockValues does
  results.clear();
  activeDateKey = todayKey;
}

/** Seeds a handful of past days so the History screen has something to show in dev. */
function seedSyntheticHistory() {
  let runningBalance = currentUser.balance;
  for (let i = 6; i >= 1; i--) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const key = dateKey(day);

    const rounds: DailyRound[] = ROUND_SLOTS.map((slot) => {
      const predictedValue = 1 + Math.floor(Math.random() * 5);
      const stockValue = 1 + Math.floor(Math.random() * 5);
      const adj = applyConservativeAdjustment(runningBalance, predictedValue, stockValue);
      runningBalance = adj.balanceAfter;

      const result: RoundResult = {
        roundId: slot.id,
        average: stockValue,
        userPrediction: predictedValue,
        distance: adj.distance,
        changePercent: adj.changePercent,
        valueGained: adj.valueGained,
        balanceAfter: adj.balanceAfter,
      };

      return {
        slot,
        status: 'settled',
        prediction: { roundId: slot.id, value: predictedValue, submittedAt: day.toISOString() },
        stockValue,
        result,
      };
    });

    historyByDate.set(key, rounds);
  }
}
seedSyntheticHistory();

export const mockApi = {
  auth: {
    async login(phone: string, _pin: string) {
      currentUser = { ...currentUser, phone };
      return delay(currentUser);
    },
    async registerStart(phone: string) {
      pendingOtps.set(phone, '123456'); // mock: always "sends" the same code
      return delay({ ok: true });
    },
    async registerComplete(phone: string, fullname: string, _gender: string, _pin: string, otp: string) {
      if (pendingOtps.get(phone) !== otp) {
        return failAfterDelay('Invalid or expired code.', 300);
      }
      pendingOtps.delete(phone);
      currentUser = { ...currentUser, name: fullname, phone };
      return delay(currentUser);
    },
    async me() {
      return delay(currentUser);
    },
    async requestPasswordReset(phone: string) {
      pendingOtps.set(phone, '123456');
      return delay({ ok: true });
    },
    async resetPassword(phone: string, code: string, _newPin: string) {
      if (pendingOtps.get(phone) !== code) {
        return failAfterDelay('Invalid or expired code.', 300);
      }
      pendingOtps.delete(phone);
      return delay({ ok: true });
    },
  },

  rounds: {
    async getToday(): Promise<DailyRound[]> {
      const now = new Date();
      rolloverDayIfNeeded(now);

      return delay(
        ROUND_SLOTS.map((slot) => {
          let status = getSlotStatus(slot, now);
          const predictedValue = predictions.get(slot.id);
          const stockValue = stockValues.get(slot.id) ?? defaultStockValues.get(slot.id);
          let result = results.get(slot.id);

          // Closing time has passed — settle it if the operator has set a Stock Value.
          if (status === 'settled' && !result) {
            if (stockValue === undefined) {
              // Closed, but no Stock Value set yet — waiting on the operator.
              status = 'awaiting_result';
            } else if (predictedValue !== undefined) {
              const adj = applyConservativeAdjustment(currentUser.balance, predictedValue, stockValue);
              result = {
                roundId: slot.id,
                average: stockValue,
                userPrediction: predictedValue,
                distance: adj.distance,
                changePercent: adj.changePercent,
                valueGained: adj.valueGained,
                balanceAfter: adj.balanceAfter,
              };
              results.set(slot.id, result);

              currentUser = {
                ...currentUser,
                balance: adj.balanceAfter,
                totalProfit: currentUser.totalProfit + adj.valueGained,
                totalProfitPercent: ((currentUser.totalProfit + adj.valueGained) / 5000) * 100,
              };
              transactions.unshift({
                id: `t-${slot.id}`,
                type: adj.valueGained >= 0 ? 'round_gain' : 'round_loss',
                amount: adj.valueGained,
                createdAt: new Date().toISOString(),
                description: `Round ${slot.index} settlement (Stock Value ${stockValue})`,
              });
            }
          }

          return {
            slot,
            status,
            prediction:
              predictedValue !== undefined
                ? { roundId: slot.id, value: predictedValue, submittedAt: new Date().toISOString() }
                : undefined,
            stockValue,
            result,
          };
        })
      );
    },

    /** Charges the chosen play amount from the wallet, then records the prediction. */
    async submitPrediction(roundId: string, value: number, amount: number = ROUND_STAKE) {
      if (currentUser.balance < amount) {
        return failAfterDelay(`You need at least ₦${amount} in your wallet to play this round.`, 300);
      }
      const slot = ROUND_SLOTS.find((s) => s.id === roundId);
      currentUser = { ...currentUser, balance: currentUser.balance - amount };
      transactions.unshift({
        id: `stake-${roundId}-${Date.now()}`,
        type: 'round_stake',
        amount: -amount,
        createdAt: new Date().toISOString(),
        description: `Round ${slot?.index ?? ''} entry fee`.trim(),
      });
      predictions.set(roundId, value);
      return delay({ ok: true });
    },

    /**
     * Sets or updates today's Stock Value for a round. Can be called any
     * time before it settles. Operator-only — a real backend must re-check
     * the caller's role server-side exactly like this, never trusting the
     * client to simply hide the button from non-admins.
     */
    async setStockValue(roundId: string, value: number): Promise<void> {
      if (currentUser.role !== 'admin') {
        return failAfterDelay('Only an operator can set the Stock Value.', 300);
      }
      if (results.has(roundId)) {
        return failAfterDelay('This round has already settled and its Stock Value can no longer be changed.', 300);
      }
      stockValues.set(roundId, value);
      return delay(undefined, 300);
    },

    async getDefaultStockValues(): Promise<Record<string, number>> {
      return delay(Object.fromEntries(defaultStockValues));
    },

    /** Default Stock Values applied to each of today's 5 rounds unless individually overridden. Operator-only. */
    async setDefaultStockValues(values: Record<string, number>): Promise<void> {
      if (currentUser.role !== 'admin') {
        return failAfterDelay('Only an operator can set default Stock Values.', 300);
      }
      defaultStockValues.clear();
      for (const [slotId, value] of Object.entries(values)) {
        defaultStockValues.set(slotId, value);
      }
      return delay(undefined, 300);
    },

    async getHistory(): Promise<DailyHistoryEntry[]> {
      const entries = Array.from(historyByDate.entries())
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([date, rounds]) => summarizeDay(date, rounds));
      return delay(entries);
    },
  },

  wallet: {
    async getBalance() {
      return delay({ balance: currentUser.balance, totalProfit: currentUser.totalProfit, totalProfitPercent: currentUser.totalProfitPercent });
    },

    /**
     * Step 1 of a deposit: create a pending record and hand back a reference
     * + the email to charge. The client opens Paystack checkout with these
     * (public key only, no secret needed to start a charge).
     */
    async createDepositReference(amount: number): Promise<{ reference: string; email: string }> {
      const reference = `dep_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      transactions.unshift({
        id: reference,
        type: 'deposit',
        amount,
        createdAt: new Date().toISOString(),
        description: 'Wallet deposit',
        status: 'pending',
      });
      // Paystack's checkout requires an email; the app no longer collects
      // one (auth is phone-only), so synthesize a placeholder from the phone.
      return delay({ reference, email: `${currentUser.phone.replace(/\D/g, '')}@crowdstock.app` });
    },

    /**
     * Step 2 of a deposit, after Paystack's checkout reports success.
     *
     * MOCK ONLY: this trusts the client's word and credits the balance.
     * A real backend must NEVER do this — it must call Paystack's Verify
     * Transaction endpoint server-side with the secret key, confirm
     * status === 'success' and the amount matches, and only then credit
     * the wallet. Skipping that step lets anyone fake a "successful" charge.
     */
    async verifyDeposit(reference: string): Promise<{ balance: number }> {
      const tx = transactions.find((t) => t.id === reference && t.type === 'deposit');
      if (!tx) throw new Error('Unknown deposit reference.');

      tx.status = 'success';
      currentUser = { ...currentUser, balance: currentUser.balance + tx.amount };
      return delay({ balance: currentUser.balance }, 600);
    },

    async cancelDeposit(reference: string): Promise<void> {
      const tx = transactions.find((t) => t.id === reference && t.type === 'deposit');
      if (tx && tx.status === 'pending') tx.status = 'failed';
      return delay(undefined, 100);
    },

    async getBanks(): Promise<Bank[]> {
      return delay([
        { code: '044', name: 'Access Bank' },
        { code: '023', name: 'Citibank Nigeria' },
        { code: '050', name: 'Ecobank Nigeria' },
        { code: '011', name: 'First Bank of Nigeria' },
        { code: '214', name: 'First City Monument Bank' },
        { code: '058', name: 'Guaranty Trust Bank' },
        { code: '030', name: 'Heritage Bank' },
        { code: '082', name: 'Keystone Bank' },
        { code: '076', name: 'Polaris Bank' },
        { code: '221', name: 'Stanbic IBTC Bank' },
        { code: '068', name: 'Standard Chartered Bank' },
        { code: '232', name: 'Sterling Bank' },
        { code: '032', name: 'Union Bank of Nigeria' },
        { code: '033', name: 'United Bank For Africa' },
        { code: '215', name: 'Unity Bank' },
        { code: '035', name: 'Wema Bank' },
        { code: '057', name: 'Zenith Bank' },
      ]);
    },

    /**
     * MOCK ONLY: fabricates a plausible account name from the account number.
     * A real backend must proxy Paystack's Resolve Account Number endpoint
     * (also secret-key-only) so the user can confirm who they're sending to
     * before a withdrawal is submitted.
     */
    async resolveBankAccount(accountNumber: string, bankCode: string): Promise<ResolvedBankAccount> {
      if (accountNumber.length !== 10) {
        return failAfterDelay('Enter a valid 10-digit account number.', 500);
      }
      const names = ['CHIOMA OKAFOR', 'TUNDE BALOGUN', 'AMINA YUSUF', 'EMEKA NWOSU', 'FUNKE ADEYEMI'];
      const name = names[Number(accountNumber) % names.length];
      return delay({ accountNumber, bankCode, accountName: name }, 700);
    },

    /**
     * Requests a payout to a resolved bank account. Funds are held
     * immediately; a real backend processes this via Paystack Transfers
     * (secret-key-only — cannot be initiated from the app) and updates the
     * status asynchronously (webhook or polling).
     */
    async requestWithdrawal(amount: number, bank: Bank, account: ResolvedBankAccount): Promise<WalletTransaction> {
      if (amount > currentUser.balance) {
        return failAfterDelay('Insufficient balance.', 300);
      }

      currentUser = { ...currentUser, balance: currentUser.balance - amount };
      const tx: WalletTransaction = {
        id: `wd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        type: 'withdrawal',
        amount: -amount,
        createdAt: new Date().toISOString(),
        description: `Withdrawal to ${bank.name} •••${account.accountNumber.slice(-4)} (${account.accountName})`,
        status: 'pending',
      };
      transactions.unshift(tx);

      // Simulate the backend/Paystack transfer completing a little later.
      setTimeout(() => {
        tx.status = 'success';
      }, 4000);

      return delay({ ...tx }, 500);
    },

    async getTransactions(): Promise<WalletTransaction[]> {
      return delay([...transactions]);
    },
  },
};

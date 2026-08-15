import { Bank, DailyHistoryEntry, DailyRound, ResolvedBankAccount, RoundResult, User, WalletTransaction } from '../types';
import { ROUND_SLOTS, getSlotStatus } from '../lib/schedule';
import { applyConservativeAdjustment, computeStockValue } from '../lib/payout';

// In-memory mock backend. Swap this module out for src/api/httpApi.ts
// once real endpoints are available — see src/api/index.ts.

let currentUser: User = {
  id: 'u1',
  name: 'Ada Obi',
  email: 'ada@example.com',
  balance: 5000,
  totalProfit: 0,
  totalProfitPercent: 0,
};

const predictions = new Map<string, number>(); // roundId -> user's value
const results = new Map<string, RoundResult>(); // roundId -> settled result
const transactions: WalletTransaction[] = [];
const historyByDate = new Map<string, DailyRound[]>(); // past days, archived on rollover

function delay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function failAfterDelay(message: string, ms = 400): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms));
}

function simulateCrowd(): number[] {
  const count = 40 + Math.floor(Math.random() * 60);
  return Array.from({ length: count }, () => 1 + Math.floor(Math.random() * 5));
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

let activeDateKey = dateKey(new Date());

/** Archives the current day's rounds (if any were settled) and resets state for a new day. */
function rolloverDayIfNeeded(now: Date) {
  const todayKey = dateKey(now);
  if (todayKey === activeDateKey) return;

  const rounds = ROUND_SLOTS.map((slot) => ({
    slot,
    status: 'settled' as const,
    prediction:
      predictions.has(slot.id)
        ? { roundId: slot.id, value: predictions.get(slot.id)!, submittedAt: activeDateKey }
        : undefined,
    result: results.get(slot.id),
  }));
  if (rounds.some((r) => r.result)) {
    historyByDate.set(activeDateKey, rounds);
  }

  predictions.clear();
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
      const crowd = simulateCrowd();
      const { average, stockValue } = computeStockValue([...crowd, predictedValue]);
      const adj = applyConservativeAdjustment(runningBalance, predictedValue, stockValue);
      runningBalance = adj.balanceAfter;

      const result: RoundResult = {
        roundId: slot.id,
        stockValue,
        averageRaw: average,
        totalParticipants: crowd.length + 1,
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
        result,
      };
    });

    historyByDate.set(key, rounds);
  }
}
seedSyntheticHistory();

export const mockApi = {
  auth: {
    async login(email: string, _password: string) {
      currentUser = { ...currentUser, email };
      return delay(currentUser);
    },
    async register(name: string, email: string, _password: string) {
      currentUser = { ...currentUser, name, email };
      return delay(currentUser);
    },
    async me() {
      return delay(currentUser);
    },
    async requestPasswordReset(_email: string) {
      // Mock: always "sends" a 6-digit code. A real backend emails/SMSes this.
      return delay({ ok: true });
    },
    async resetPassword(_email: string, code: string, _newPassword: string) {
      if (code !== '123456') {
        return failAfterDelay('Invalid or expired code.', 300);
      }
      return delay({ ok: true });
    },
  },

  rounds: {
    async getToday(): Promise<DailyRound[]> {
      const now = new Date();
      rolloverDayIfNeeded(now);

      return delay(
        ROUND_SLOTS.map((slot) => {
          const status = getSlotStatus(slot, now);
          const predictedValue = predictions.get(slot.id);
          let result = results.get(slot.id);

          // auto-settle rounds whose window has passed but weren't settled yet
          if (status === 'settled' && !result && predictedValue !== undefined) {
            const crowd = simulateCrowd();
            const { average, stockValue } = computeStockValue([...crowd, predictedValue]);
            const adj = applyConservativeAdjustment(currentUser.balance, predictedValue, stockValue);
            result = {
              roundId: slot.id,
              stockValue,
              averageRaw: average,
              totalParticipants: crowd.length + 1,
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
              totalProfitPercent:
                ((currentUser.totalProfit + adj.valueGained) / 5000) * 100,
            };
            transactions.unshift({
              id: `t-${slot.id}`,
              type: adj.valueGained >= 0 ? 'round_gain' : 'round_loss',
              amount: adj.valueGained,
              createdAt: new Date().toISOString(),
              description: `Round ${slot.index} settlement (Stock Value ${stockValue})`,
            });
          }

          return {
            slot,
            status,
            prediction:
              predictedValue !== undefined
                ? { roundId: slot.id, value: predictedValue, submittedAt: new Date().toISOString() }
                : undefined,
            result,
          };
        })
      );
    },

    async submitPrediction(roundId: string, value: number) {
      predictions.set(roundId, value);
      return delay({ ok: true });
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
      return delay({ reference, email: currentUser.email });
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

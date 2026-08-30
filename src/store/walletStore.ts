import { create } from 'zustand';
import { Bank, LinkedBankAccount, ResolvedBankAccount, WalletTransaction, WithdrawalHistoryEntry } from '../types';
import { api } from '../api';
import { useAuthStore } from './authStore';
import { NIGERIAN_BANKS } from '../lib/banks';

interface PendingDeposit {
  amount: number;
  balanceBefore: number;
  startedAt: number;
  /** The gateway's own transactionReference (not our client-generated cref) — needed to requery this specific deposit. */
  reference: string;
}

interface WalletState {
  balance: number;
  totalProfit: number;
  totalProfitPercent: number;
  transactions: WalletTransaction[];
  banks: Bank[];
  isLoading: boolean;
  // Deposits are credited by a server-side webhook with no client-side
  // confirm/verify call available (see createDepositReference) — this is
  // purely a UI cue so "why hasn't my balance changed yet" doesn't look like
  // the app silently ate the deposit while the webhook is still catching up.
  pendingDeposit: PendingDeposit | null;
  refresh: () => Promise<void>;
  createDepositReference: (amount: number) => Promise<{ redirectUrl: string; reference: string }>;
  startPendingDeposit: (amount: number, reference: string) => void;
  dismissPendingDeposit: () => void;
  /** Best-effort — nudges the gateway->PayHook crediting flow instead of only passively waiting for G25 to reflect it. Never throws. */
  requeryPendingDeposit: () => Promise<void>;
  /**
   * Manual fallback for a deposit that never reflected — the user pastes a
   * reference (from the confirmation email the gateway sends) and this
   * requeries it directly, independent of whatever this session happens to
   * be tracking in pendingDeposit (the app may have been closed/reopened
   * since the deposit was made). Compares balance before/after to report
   * whether it actually credited, rather than just relaying GR's own
   * message, which doesn't clearly say "credited" vs "not yet" in plain terms.
   */
  verifyDepositByReference: (reference: string) => Promise<{ credited: boolean; message?: string }>;
  fetchBanks: () => Promise<void>;
  resolveBankAccount: (accountNumber: string, bankCode: string) => Promise<ResolvedBankAccount>;
  /** Step 1 of linking/changing a payout account — sends a one-time code to confirm the resolved account belongs to the user. */
  sendBankVerificationOtp: (account: ResolvedBankAccount & { bankName: string }) => Promise<void>;
  /** Step 2 — submits the code; on success, saves and reflects the new account in linkedBankAccount. */
  confirmBankVerificationOtp: (otp: string, account: ResolvedBankAccount & { bankName: string }) => Promise<void>;
  linkedBankAccount: LinkedBankAccount | null;
  fetchLinkedBankAccount: () => Promise<void>;
  withdrawalHistory: WithdrawalHistoryEntry[];
  fetchWithdrawalHistory: () => Promise<void>;
  requestWithdrawal: (amount: number) => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  balance: 0,
  totalProfit: 0,
  totalProfitPercent: 0,
  transactions: [],
  banks: [],
  isLoading: false,
  pendingDeposit: null,
  linkedBankAccount: null,
  withdrawalHistory: [],

  refresh: async () => {
    set({ isLoading: true });
    try {
      const [{ balance, totalProfit, totalProfitPercent }, transactions] = await Promise.all([
        api.wallet.getBalance(),
        api.wallet.getTransactions(),
      ]);
      const pending = get().pendingDeposit;
      // The webhook credit is the only signal we have that a pending deposit
      // resolved — once the balance actually moves off what it was when the
      // deposit started, treat it as settled and drop the banner.
      const stillPending = pending && balance === pending.balanceBefore ? pending : null;
      set({ balance, totalProfit, totalProfitPercent, transactions, isLoading: false, pendingDeposit: stillPending });
    } catch (e) {
      // Keep the last known balance/transactions on a failed refresh rather
      // than wiping them to zero — a transient failure here used to look
      // like "your balance disappeared" until you logged out and back in.
      set({ isLoading: false });
      throw e;
    }
  },

  createDepositReference: async (amount) => {
    return api.wallet.createDepositReference(amount, useAuthStore.getState().user?.email);
  },

  startPendingDeposit: (amount, reference) => {
    set({ pendingDeposit: { amount, balanceBefore: get().balance, startedAt: Date.now(), reference } });
  },

  dismissPendingDeposit: () => set({ pendingDeposit: null }),

  requeryPendingDeposit: async () => {
    const reference = get().pendingDeposit?.reference;
    if (!reference) return;
    await api.wallet.requeryDeposit(reference).catch(() => {});
  },

  verifyDepositByReference: async (reference) => {
    const balanceBefore = get().balance;
    const result = await api.wallet.requeryDeposit(reference);
    await get().refresh().catch(() => {});
    const credited = get().balance !== balanceBefore;
    return { credited, message: result.message };
  },

  /**
   * Tries the backend first (in case a live "list banks" endpoint ever
   * ships), but there's no real need to block the bank picker on that —
   * NIBSS bank codes are effectively static, so a bundled client-side list
   * (see lib/banks.ts) is a perfectly good fallback, not just a placeholder.
   */
  fetchBanks: async () => {
    if (get().banks.length > 0) return;
    try {
      const banks = await api.wallet.getBanks();
      set({ banks });
    } catch {
      set({ banks: NIGERIAN_BANKS });
    }
  },

  resolveBankAccount: async (accountNumber, bankCode) => {
    return api.wallet.resolveBankAccount(accountNumber, bankCode);
  },

  sendBankVerificationOtp: async (account) => {
    await api.wallet.sendBankVerificationOtp(account);
  },

  confirmBankVerificationOtp: async (otp, account) => {
    const linkedBankAccount = await api.wallet.confirmBankVerificationOtp(otp, account);
    set({ linkedBankAccount });
  },

  fetchLinkedBankAccount: async () => {
    const linkedBankAccount = await api.wallet.getLinkedBankAccount();
    set({ linkedBankAccount });
  },

  fetchWithdrawalHistory: async () => {
    const withdrawalHistory = await api.wallet.getWithdrawalHistory();
    set({ withdrawalHistory });
  },

  requestWithdrawal: async (amount) => {
    await api.wallet.requestWithdrawal(amount);
    await get().refresh();
    await get().fetchWithdrawalHistory();
  },
}));

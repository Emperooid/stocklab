import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DailyRound, UserPrediction } from '../types';
import { api } from '../api';
import { getOperatingDayStart, localDateKey } from '../lib/schedule';
import { syncNotificationsForRounds } from './settingsStore';
import { useWalletStore } from './walletStore';

/**
 * Playing a round can move the wallet balance (whether SlotAmount is
 * deducted immediately or only at settlement is still unconfirmed with the
 * backend — see the open question raised after this). Either way, the
 * Wallet/Rounds header balance previously only updated on the *next* screen
 * focus, which looked like "my balance never changes when I play" even if
 * the backend actually did something.
 *
 * If G12's own response already included the new balance, apply it
 * directly — no need for a second round-trip. Otherwise fall back to a
 * best-effort G25 refresh (failing shouldn't break the predict flow).
 */
function refreshWalletBestEffort(knownBalance?: number) {
  if (knownBalance != null) {
    useWalletStore.setState({ balance: knownBalance });
    return;
  }
  useWalletStore.getState().refresh().catch(() => {});
}

function dayKey(now: Date): string {
  return localDateKey(getOperatingDayStart(now));
}

export function roundKey(roundId: string, now: Date): string {
  return `${dayKey(now)}_${roundId}`;
}

/** Drops entries from an older operating day than today/yesterday, so this map doesn't grow forever. */
export function pruneOldKeys<T>(map: Record<string, T>, now: Date): Record<string, T> {
  const today = dayKey(now);
  const yesterday = dayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const next: Record<string, T> = {};
  for (const [key, value] of Object.entries(map)) {
    if (key.startsWith(today) || key.startsWith(yesterday)) next[key] = value;
  }
  return next;
}

interface RoundsState {
  rounds: DailyRound[];
  isLoading: boolean;
  // CONFIRMED live: G13 never reflects a pending prediction before a round
  // settles — it keeps returning [] immediately after a successful G12
  // submit. Without this, the UI has no way to show "you predicted X" until
  // settlement, which looked like submissions were silently failing even
  // though they succeeded. Tracked locally, keyed by operating-day +
  // roundId (round ids like "r11" repeat every day) since the server gives
  // us nothing to go on yet.
  localPredictions: Record<string, UserPrediction>;
  fetchRounds: () => Promise<void>;
  submitPrediction: (roundId: string, value: number, amount: number) => Promise<void>;
}

function applyLocalOverrides(rounds: DailyRound[], localPredictions: Record<string, UserPrediction>, now: Date): DailyRound[] {
  return rounds.map((r) => ({
    ...r,
    prediction: r.prediction ?? localPredictions[roundKey(r.slot.id, now)],
  }));
}

export const useRoundsStore = create<RoundsState>()(
  persist(
    (set, get) => ({
      rounds: [],
      isLoading: false,
      localPredictions: {},

      fetchRounds: async () => {
        set({ isLoading: true });
        try {
          const rounds = applyLocalOverrides(await api.rounds.getToday(), get().localPredictions, new Date());
          set({ rounds, isLoading: false });
          syncNotificationsForRounds(rounds);
        } catch (e) {
          set({ isLoading: false });
          throw e;
        }
      },

      submitPrediction: async (roundId, value, amount) => {
        const newBalance = await api.rounds.submitPrediction(roundId, value, amount);
        const now = new Date();
        const key = roundKey(roundId, now);
        const localPredictions = pruneOldKeys(
          { ...get().localPredictions, [key]: { roundId, value, submittedAt: now.toISOString() } },
          now
        );
        set({ localPredictions });
        await get().fetchRounds();
        refreshWalletBestEffort(newBalance);
      },
    }),
    {
      name: 'crowdstock-rounds',
      storage: createJSONStorage(() => AsyncStorage),
      // rounds/isLoading are always refetched on launch — only the local
      // prediction overrides need to survive a reload.
      partialize: (state) => ({ localPredictions: state.localPredictions }),
    }
  )
);

/**
 * Today's profit derived from settled rounds already in memory — same
 * approach httpApi.ts's groupHistoryByDate uses for history entries. Exists
 * because walletStore's totalProfit/totalProfitPercent are permanently
 * hardcoded to 0 (no backend field for them has ever been confirmed), even
 * though the real per-round numbers (G13's NetMovement/changePercent, via
 * mapResult) are sitting right here in `rounds` and unused by HomeScreen/
 * RoundsScreen, which is why "today's profit" looked stuck at 0 even after
 * rounds had actually settled.
 */
export function computeTodayProfit(rounds: DailyRound[]): { profit: number; profitPercent: number } {
  const settled = rounds.filter((r) => r.result);
  const profit = settled.reduce((sum, r) => sum + (r.result?.valueGained ?? 0), 0);
  const profitPercent = settled.reduce((sum, r) => sum + (r.result?.changePercent ?? 0), 0);
  return { profit, profitPercent };
}

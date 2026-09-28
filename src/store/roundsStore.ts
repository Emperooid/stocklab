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
  /**
   * Clears rounds AND localPredictions. The latter is persisted to
   * AsyncStorage but keyed only by day+roundId, not by phone/account — a
   * second account logging in on the same device would otherwise inherit
   * the first account's "you predicted X" overrides for today's rounds.
   * Called from authStore.logout().
   */
  reset: () => void;
}

function applyLocalOverrides(rounds: DailyRound[], localPredictions: Record<string, UserPrediction>, now: Date): DailyRound[] {
  return rounds.map((r) => ({
    ...r,
    prediction: r.prediction ?? localPredictions[roundKey(r.slot.id, now)],
  }));
}

/**
 * Backfills `prediction` for any round G15 (Code "P") confirms was played
 * today but that neither G13 nor the local device-only record already
 * caught — a fresh install, a different device than the one that actually
 * submitted, or G13's own settlement-only visibility gap. No figure is
 * known in that case (G15's play records don't carry it), so `value` stays
 * undefined — still enough to correctly show "already played" instead of
 * letting the UI treat an untracked-but-real submission as never happened.
 *
 * INFERENCE (not a confirmed backend fact): PredictionControl/RoundsScreen
 * both label this specific case ("played, figure unknown") as Auto Play in
 * their copy. The reasoning: a manual submission always writes a local
 * record on the device that made it (roundsStore.submitPrediction), so the
 * only way a round shows up here as played-but-untracked is if nothing on
 * this device ever submitted it — which is exactly what an automatic,
 * backend-driven Auto Play submission looks like. It's not airtight (a
 * manual play from a *different* device would look identical), but it's the
 * only real signal available — G13/G14 have no confirmed field that states
 * this directly, and Mr Yemi's own answer on this pointed back to G15 (P)
 * rather than a dedicated flag. Revisit if he ever adds a real one.
 */
function applyServerPlayedOverride(rounds: DailyRound[], playedIndices: number[]): DailyRound[] {
  if (playedIndices.length === 0) return rounds;
  const playedSet = new Set(playedIndices);
  return rounds.map((r) =>
    r.prediction || !playedSet.has(r.slot.index)
      ? r
      : { ...r, prediction: { roundId: r.slot.id, value: undefined, submittedAt: new Date().toISOString() } }
  );
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
          const [today, playedIndices] = await Promise.all([
            api.rounds.getToday(),
            // Best-effort: a failure here shouldn't block loading rounds at
            // all, it just means this cycle skips the extra reliability
            // check and falls back to local/G13 tracking alone.
            api.rounds.getPlayedRoundIndices().catch(() => []),
          ]);
          const rounds = applyServerPlayedOverride(
            applyLocalOverrides(today, get().localPredictions, new Date()),
            playedIndices
          );
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

      reset: () => set({ rounds: [], isLoading: false, localPredictions: {} }),
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

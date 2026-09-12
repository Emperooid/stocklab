import { create } from 'zustand';
import { AutoPlaySlotConfig } from '../types';
import { api } from '../api';
import { ROUND_SLOTS } from '../lib/schedule';

const DEFAULT_SLOT_CONFIG: AutoPlaySlotConfig = { enabled: false, figure: 3 };

function indexFromRoundId(roundId: string): number {
  return ROUND_SLOTS.find((s) => s.id === roundId)?.index ?? Number(roundId.replace(/\D/g, ''));
}

interface AutoPlayState {
  // Whether `slots` has been populated from the server (A2) at least once
  // this session. Not persisted — the server is the source of truth
  // (A1/A2/UU), refetched via loadFromServer() rather than cached locally.
  loaded: boolean;
  slots: Record<string, AutoPlaySlotConfig>;
  getSlotConfig: (roundId: string) => AutoPlaySlotConfig;
  /** Hydrates all 24 rounds' state from A2 in one call. Safe to call repeatedly (screen focus, app start). */
  loadFromServer: () => Promise<void>;
  /** Persists via A1. Figure is only sent while enabling, per the documented "OFF doesn't touch Figure" rule. Rolls back optimistic state on failure. */
  setSlotEnabled: (roundId: string, enabled: boolean) => Promise<void>;
  /** Updates the local figure; only pushes to A1 immediately if the round is currently enabled (A1 ignores Figure while OFF anyway). */
  setSlotFigure: (roundId: string, figure: number) => Promise<void>;
  /** Master toggle via UU — bulk on/off for every round in one call. */
  setAllEnabled: (enabled: boolean) => Promise<void>;
}

/**
 * Per-round Auto Play, per Mr Yemi's spec: each of the 24 round cards has
 * its own figure (1-5) + on/off toggle, persisted server-side via A1/A2/UU.
 *
 * CONFIRMED per Mr Yemi (2026-09-08): the backend now fully owns Auto Play
 * end to end — after A1 turns a round's Auto Play on, the backend sets a
 * figure and settles the round itself on its own schedule, with zero
 * further client action. This replaced an earlier client-side engine
 * (useAutoPlayEngine, removed) that watched round close times and fired G12
 * manually — that approach only worked while the app was open/foregrounded,
 * which is no longer a limitation now that the server handles it
 * unconditionally. This store is now purely a thin client for A1/A2/UU plus
 * whatever local optimistic-update bookkeeping the toggle UI needs — no
 * submission tracking or "missed" guards to maintain anymore.
 */
export const useAutoPlayStore = create<AutoPlayState>((set, get) => ({
  loaded: false,
  slots: {},

  getSlotConfig: (roundId) => get().slots[roundId] ?? DEFAULT_SLOT_CONFIG,

  loadFromServer: async () => {
    try {
      const configs = await api.rounds.getAutoPlayConfigs();
      const slots: Record<string, AutoPlaySlotConfig> = {};
      for (const [indexStr, config] of Object.entries(configs)) {
        slots[`r${indexStr}`] = config;
      }
      set({ slots, loaded: true });
    } catch (e) {
      // CONFIRMED live: leaving `loaded` false on failure made
      // RoundAutoPlayControl/MasterAutoPlayToggle (both gated on it)
      // render nothing at all during a backend outage — the entire
      // Auto Play UI silently vanished with no indication why, which
      // is worse than showing it with default (all-off) values. Mark
      // loaded anyway so the UI still renders; a later successful
      // fetch (retry, focus, refresh) overwrites these defaults with
      // the real server state.
      set({ loaded: true });
      throw e;
    }
  },

  setSlotEnabled: async (roundId, enabled) => {
    const previous = get().slots[roundId] ?? DEFAULT_SLOT_CONFIG;
    const next = { ...previous, enabled };
    set((state) => ({ slots: { ...state.slots, [roundId]: next } }));
    try {
      await api.rounds.setAutoPlayConfig(indexFromRoundId(roundId), enabled, enabled ? next.figure : undefined);
    } catch (e) {
      set((state) => ({ slots: { ...state.slots, [roundId]: previous } }));
      throw e;
    }
  },

  setSlotFigure: async (roundId, figure) => {
    const previous = get().slots[roundId] ?? DEFAULT_SLOT_CONFIG;
    const next = { ...previous, figure };
    set((state) => ({ slots: { ...state.slots, [roundId]: next } }));
    if (!next.enabled) return; // matches A1's own rule: Figure isn't stored while OFF, so nothing to push yet
    try {
      await api.rounds.setAutoPlayConfig(indexFromRoundId(roundId), true, figure);
    } catch (e) {
      set((state) => ({ slots: { ...state.slots, [roundId]: previous } }));
      throw e;
    }
  },

  setAllEnabled: async (enabled) => {
    const previous = get().slots;
    set((state) => ({
      slots: Object.fromEntries(
        ROUND_SLOTS.map((slot) => [slot.id, { ...(state.slots[slot.id] ?? DEFAULT_SLOT_CONFIG), enabled }])
      ),
    }));
    try {
      await api.rounds.setAllAutoPlay(enabled);
    } catch (e) {
      set({ slots: previous });
      throw e;
    }
  },
}));

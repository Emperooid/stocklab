import { create } from 'zustand';
import { DailyRound } from '../types';
import { api } from '../api';
import { syncNotificationsForRounds } from './settingsStore';
import { maybeAutoPlay } from './autoPlayStore';

interface RoundsState {
  rounds: DailyRound[];
  defaultStockValues: Record<string, number>;
  isLoading: boolean;
  fetchRounds: () => Promise<void>;
  submitPrediction: (roundId: string, value: number) => Promise<void>;
  setStockValue: (roundId: string, value: number) => Promise<void>;
  fetchDefaultStockValues: () => Promise<void>;
  setDefaultStockValues: (values: Record<string, number>) => Promise<void>;
}

export const useRoundsStore = create<RoundsState>((set, get) => ({
  rounds: [],
  defaultStockValues: {},
  isLoading: false,

  fetchRounds: async () => {
    set({ isLoading: true });
    try {
      const rounds = await api.rounds.getToday();
      set({ rounds, isLoading: false });
      syncNotificationsForRounds(rounds);

      const played = await maybeAutoPlay(rounds);
      if (played) await get().fetchRounds();
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  submitPrediction: async (roundId, value) => {
    await api.rounds.submitPrediction(roundId, value);
    await get().fetchRounds();
  },

  setStockValue: async (roundId, value) => {
    await api.rounds.setStockValue(roundId, value);
    await get().fetchRounds();
  },

  fetchDefaultStockValues: async () => {
    const defaultStockValues = await api.rounds.getDefaultStockValues();
    set({ defaultStockValues });
  },

  setDefaultStockValues: async (values) => {
    await api.rounds.setDefaultStockValues(values);
    set({ defaultStockValues: values });
    await get().fetchRounds();
  },
}));

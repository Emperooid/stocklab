import { create } from 'zustand';
import { DailyRound } from '../types';
import { api } from '../api';
import { syncNotificationsForRounds } from './settingsStore';

interface RoundsState {
  rounds: DailyRound[];
  isLoading: boolean;
  fetchRounds: () => Promise<void>;
  submitPrediction: (roundId: string, value: number) => Promise<void>;
}

export const useRoundsStore = create<RoundsState>((set, get) => ({
  rounds: [],
  isLoading: false,

  fetchRounds: async () => {
    set({ isLoading: true });
    try {
      const rounds = await api.rounds.getToday();
      set({ rounds, isLoading: false });
      syncNotificationsForRounds(rounds);
    } catch (e) {
      set({ isLoading: false });
      throw e;
    }
  },

  submitPrediction: async (roundId, value) => {
    await api.rounds.submitPrediction(roundId, value);
    await get().fetchRounds();
  },
}));

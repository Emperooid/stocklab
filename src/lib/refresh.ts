import { useAuthStore } from '../store/authStore';
import { useAutoPlayStore } from '../store/autoPlayStore';
import { useCardsStore } from '../store/cardsStore';
import { useRoundsStore } from '../store/roundsStore';
import { useWalletStore } from '../store/walletStore';

/**
 * Everything the app caches from the backend, reloaded together — the same set
 * RootNavigator refreshes when the app returns to the foreground.
 *
 * This is what a pull-to-refresh does on a screen that has nothing more
 * specific to reload, so every page "reloads" rather than some of them
 * spinning for no reason. Screens with a narrower refresh keep their own.
 *
 * allSettled, not all: one endpoint being down must not abandon the rest, and
 * every store keeps its last-known data when its own call fails.
 */
export async function refreshAppData(): Promise<void> {
  if (!useAuthStore.getState().user) return;
  await Promise.allSettled([
    useWalletStore.getState().refresh(),
    useRoundsStore.getState().fetchRounds(),
    useCardsStore.getState().refreshFromServer(),
    useAutoPlayStore.getState().loadFromServer(),
    useAuthStore.getState().refreshUser(),
  ]);
}

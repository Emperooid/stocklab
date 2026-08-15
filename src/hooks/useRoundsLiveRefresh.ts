import { useEffect, useRef } from 'react';
import { useNow } from './useNow';
import { useRoundsStore } from '../store/roundsStore';
import { getSlotStatus } from '../lib/schedule';

/**
 * Ticks every second and re-fetches rounds the instant any slot's live
 * status (upcoming/open/settled) flips, so open/settle transitions and
 * settlement results appear without the user pulling to refresh.
 */
export function useRoundsLiveRefresh() {
  const now = useNow(1000);
  const rounds = useRoundsStore((s) => s.rounds);
  const fetchRounds = useRoundsStore((s) => s.fetchRounds);
  const prevStatuses = useRef<Record<string, string>>({});
  const initialized = useRef(false);

  useEffect(() => {
    const next: Record<string, string> = {};
    let changed = false;
    for (const r of rounds) {
      const liveStatus = getSlotStatus(r.slot, now);
      next[r.slot.id] = liveStatus;
      if (initialized.current && prevStatuses.current[r.slot.id] !== liveStatus) {
        changed = true;
      }
    }
    prevStatuses.current = next;
    initialized.current = true;
    if (changed) fetchRounds();
  }, [now]);

  return now;
}

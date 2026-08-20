import { RoundSlot, RoundStatus } from '../types';

// 24 rounds a day, one per hour: opens on the hour, closes 50 minutes later
// (e.g. Round 2 opens 1:00 AM, closes 1:50 AM; Round 3 opens 2:00 AM, closes 2:50 AM).
// Round N (1-24) = hour (N-1), so Round 1 is midnight and Round 24 is 11 PM.
export const ROUND_SLOTS: RoundSlot[] = Array.from({ length: 24 }, (_, hour) => ({
  id: `r${hour + 1}`,
  index: hour + 1,
  submitTime: `${String(hour).padStart(2, '0')}:00`,
  settleTime: `${String(hour).padStart(2, '0')}:50`,
}));

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function getSlotStatus(slot: RoundSlot, now: Date = new Date()): RoundStatus {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const submitMinutes = toMinutes(slot.submitTime);
  const settleMinutes = toMinutes(slot.settleTime);

  if (nowMinutes < submitMinutes) return 'upcoming';
  if (nowMinutes >= submitMinutes && nowMinutes < settleMinutes) return 'open';
  return 'settled';
}

export function timeOnDate(hhmm: string, base: Date): Date {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date(base);
  d.setHours(h, m, 0, 0);
  return d;
}

export interface RoundBoundary {
  at: Date;
  slot: RoundSlot;
  kind: 'open' | 'settle';
}

/** The next submit-open or settle time (today) after `now`, across all slots. */
export function getNextBoundary(now: Date = new Date()): RoundBoundary | null {
  const boundaries: RoundBoundary[] = [];
  for (const slot of ROUND_SLOTS) {
    boundaries.push({ at: timeOnDate(slot.submitTime, now), slot, kind: 'open' });
    boundaries.push({ at: timeOnDate(slot.settleTime, now), slot, kind: 'settle' });
  }
  boundaries.sort((a, b) => a.at.getTime() - b.at.getTime());
  return boundaries.find((b) => b.at.getTime() > now.getTime()) ?? null;
}

export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

import { RoundSlot, RoundStatus } from '../types';

// 24 rounds a day, one per hour, opening on the hour and closing 50 minutes
// later. Round 0 opens 12:00 AM (midnight) and Round 23 opens 11:00 PM,
// closing 11:50 PM. Round index matches the hour directly (0-23) — CONFIRMED
// live this was the actual off-by-one behind "Slot is Closed" at 13:14 for
// the 13:00-13:50 window: the old 1-24 scheme (index = hour + 1) sent slot
// 14 for the 1pm hour, which the backend read as the 2pm slot (not yet
// open) instead of the current one.
export const DAY_START_HOUR = 0;

function hhmm(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export const ROUND_SLOTS: RoundSlot[] = Array.from({ length: 24 }, (_, i) => {
  const hour = (DAY_START_HOUR + i) % 24;
  return {
    id: `r${i}`,
    index: i,
    submitTime: hhmm(hour, 0),
    settleTime: hhmm(hour, 50),
  };
});

/**
 * Formats a Date as its LOCAL calendar day ("YYYY-MM-DD") — deliberately
 * NOT `date.toISOString().slice(0, 10)`, which renders in UTC. For any
 * timezone ahead of UTC (e.g. Lagos, UTC+1), that converts local midnight
 * back to 23:00 the previous UTC day, so for the first hour of every local
 * day (00:00-00:59) the ISO-string approach silently computes "yesterday"
 * instead of "today" — the exact kind of off-by-one that would make a
 * round submitted or checked in that window look like it belongs to the
 * wrong day everywhere a day-key is used (G13's date param, local
 * prediction tracking, Auto Play's played-round guard).
 */
export function localDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Start of the current "operating day" — the most recent DAY_START_HOUR:00. */
export function getOperatingDayStart(now: Date): Date {
  const start = new Date(now);
  start.setHours(DAY_START_HOUR, 0, 0, 0);
  if (start.getTime() > now.getTime()) {
    start.setDate(start.getDate() - 1); // today's cutoff hasn't happened yet — still in yesterday's cycle
  }
  return start;
}

/** The slot's real submit datetime, correctly rolling into the next calendar day past midnight. */
export function slotSubmitAt(slot: RoundSlot, now: Date): Date {
  const dayStart = getOperatingDayStart(now);
  // slot.index is 0-based (matches the hour directly, e.g. index 13 = 1pm)
  // — no -1 offset needed, unlike the old 1-24 scheme.
  return new Date(dayStart.getTime() + slot.index * 60 * 60 * 1000);
}

/** The slot's real settle datetime (50 minutes after it opens). */
export function slotSettleAt(slot: RoundSlot, now: Date): Date {
  return new Date(slotSubmitAt(slot, now).getTime() + 50 * 60 * 1000);
}

export function getSlotStatus(slot: RoundSlot, now: Date = new Date()): RoundStatus {
  const n = now.getTime();
  const submit = slotSubmitAt(slot, now).getTime();
  const settle = slotSettleAt(slot, now).getTime();

  if (n < submit) return 'upcoming';
  if (n >= submit && n < settle) return 'open';
  return 'settled';
}

/** @deprecated Use slotSubmitAt/slotSettleAt — this assumes same-calendar-day, which breaks across the day rollover. */
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

/** The next submit-open or settle time after `now`, across all of today's slots. */
export function getNextBoundary(now: Date = new Date()): RoundBoundary | null {
  const boundaries: RoundBoundary[] = [];
  for (const slot of ROUND_SLOTS) {
    boundaries.push({ at: slotSubmitAt(slot, now), slot, kind: 'open' });
    boundaries.push({ at: slotSettleAt(slot, now), slot, kind: 'settle' });
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

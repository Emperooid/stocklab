import { RoundSlot, RoundStatus } from '../types';

// 5 daily rounds: submit at 09/12/15/18/21, settle 1hr later
export const ROUND_SLOTS: RoundSlot[] = [
  { id: 'r1', index: 1, submitTime: '09:00', settleTime: '10:00' },
  { id: 'r2', index: 2, submitTime: '12:00', settleTime: '13:00' },
  { id: 'r3', index: 3, submitTime: '15:00', settleTime: '16:00' },
  { id: 'r4', index: 4, submitTime: '18:00', settleTime: '19:00' },
  { id: 'r5', index: 5, submitTime: '21:00', settleTime: '22:00' },
];

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

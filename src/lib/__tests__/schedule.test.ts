import {
  ROUND_SLOTS,
  formatCountdown,
  getNextBoundary,
  getOperatingDayStart,
  getSlotStatus,
  localDateKey,
  slotSettleAt,
  slotSubmitAt,
  timeOnDate,
} from '../schedule';

describe('localDateKey', () => {
  it('formats as the local calendar day (not UTC ISO)', () => {
    expect(localDateKey(new Date(2026, 8, 13, 0, 30))).toBe('2026-09-13');
    expect(localDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });
});

describe('ROUND_SLOTS', () => {
  it('has 24 hourly slots indexed 0-23', () => {
    expect(ROUND_SLOTS).toHaveLength(24);
    expect(ROUND_SLOTS[0].id).toBe('r0');
    expect(ROUND_SLOTS[23].id).toBe('r23');
  });

  it('maps the slot index directly to the hour (open :00, settle :50)', () => {
    expect(ROUND_SLOTS[13].submitTime).toBe('13:00');
    expect(ROUND_SLOTS[13].settleTime).toBe('13:50');
    expect(ROUND_SLOTS[23].submitTime).toBe('23:00');
  });
});

describe('getOperatingDayStart', () => {
  it('returns midnight of the current day once past midnight', () => {
    const now = new Date(2026, 8, 13, 14, 30);
    expect(getOperatingDayStart(now).getTime()).toBe(new Date(2026, 8, 13).getTime());
  });
});

describe('slotSubmitAt / slotSettleAt', () => {
  const now = new Date(2026, 8, 13, 14, 30);

  it('maps the slot index directly to the hour', () => {
    const r13 = ROUND_SLOTS[13];
    expect(slotSubmitAt(r13, now).getTime()).toBe(new Date(2026, 8, 13, 13, 0).getTime());
    expect(slotSettleAt(r13, now).getTime()).toBe(new Date(2026, 8, 13, 13, 50).getTime());
  });
});

describe('getSlotStatus', () => {
  const r13 = ROUND_SLOTS[13];

  it('marks the 13:00-13:50 slot open at 13:14 (the historical off-by-one case)', () => {
    expect(getSlotStatus(r13, new Date(2026, 8, 13, 13, 14))).toBe('open');
  });

  it('transitions upcoming -> open -> settled across the boundaries', () => {
    expect(getSlotStatus(r13, new Date(2026, 8, 13, 12, 59))).toBe('upcoming');
    expect(getSlotStatus(r13, new Date(2026, 8, 13, 13, 0))).toBe('open');
    expect(getSlotStatus(r13, new Date(2026, 8, 13, 13, 49))).toBe('open');
    expect(getSlotStatus(r13, new Date(2026, 8, 13, 13, 50))).toBe('settled');
  });
});

describe('getNextBoundary', () => {
  it('returns the next settle boundary during an open round', () => {
    const b = getNextBoundary(new Date(2026, 8, 13, 13, 14));
    expect(b).not.toBeNull();
    expect(b!.kind).toBe('settle');
    expect(b!.slot.id).toBe('r13');
    expect(b!.at.getTime()).toBe(new Date(2026, 8, 13, 13, 50).getTime());
  });

  it('returns the next open boundary after a round has settled', () => {
    const b = getNextBoundary(new Date(2026, 8, 13, 13, 51));
    expect(b).not.toBeNull();
    expect(b!.kind).toBe('open');
    expect(b!.slot.id).toBe('r14');
    expect(b!.at.getTime()).toBe(new Date(2026, 8, 13, 14, 0).getTime());
  });
});

describe('formatCountdown', () => {
  it('renders hh:mm:ss', () => {
    expect(formatCountdown(0)).toBe('00:00:00');
    expect(formatCountdown(-1000)).toBe('00:00:00');
    expect(formatCountdown(1000)).toBe('00:00:01');
    expect(formatCountdown(3661000)).toBe('01:01:01');
    expect(formatCountdown(23 * 3600 * 1000 + 59 * 60 * 1000 + 58 * 1000)).toBe('23:59:58');
  });
});

describe('timeOnDate (deprecated)', () => {
  it('sets the time on the same calendar day', () => {
    const d = timeOnDate('13:30', new Date(2026, 8, 13));
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(13);
    expect(d.getHours()).toBe(13);
    expect(d.getMinutes()).toBe(30);
  });
});

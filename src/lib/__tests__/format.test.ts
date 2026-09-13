import {
  computeGainPercent,
  formatMoney,
  formatPercent,
  formatSigned,
  formatTime12h,
} from '../format';

describe('formatMoney', () => {
  it('prefixes ₦ and always shows two decimals', () => {
    expect(formatMoney(500)).toMatch(/^₦/);
    expect(formatMoney(500)).toContain('500');
    expect(formatMoney(500)).toMatch(/00$/);
  });
});

describe('formatSigned', () => {
  it('prefixes + for non-negative and - for negative amounts', () => {
    expect(formatSigned(50)).toMatch(/^\+/);
    expect(formatSigned(0)).toMatch(/^\+/);
    expect(formatSigned(-50)).toMatch(/^-/);
  });
});

describe('formatPercent', () => {
  it('signs and fixes to two decimals', () => {
    expect(formatPercent(1.5)).toBe('+1.50%');
    expect(formatPercent(-1.5)).toBe('-1.50%');
    expect(formatPercent(0)).toBe('+0.00%');
  });
});

describe('computeGainPercent', () => {
  it('derives percent return as gains / plays', () => {
    expect(computeGainPercent(100, 2000)).toBe(5);
    expect(computeGainPercent(-50, 1000)).toBe(-5);
  });

  it('returns 0 when nothing has been played (no divide-by-zero)', () => {
    expect(computeGainPercent(100, 0)).toBe(0);
  });
});

describe('formatTime12h', () => {
  it('converts 24h hh:mm to 12h AM/PM', () => {
    expect(formatTime12h('09:00')).toBe('9:00 AM');
    expect(formatTime12h('13:30')).toBe('1:30 PM');
    expect(formatTime12h('00:00')).toBe('12:00 AM');
    expect(formatTime12h('12:00')).toBe('12:00 PM');
    expect(formatTime12h('23:59')).toBe('11:59 PM');
  });
});

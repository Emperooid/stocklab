export function formatMoney(amount: number): string {
  return `₦${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatSigned(amount: number): string {
  const formatted = formatMoney(Math.abs(amount));
  return amount >= 0 ? `+${formatted}` : `-${formatted}`;
}

export function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

/**
 * Percentage return for a period's totals — gains as a share of what was
 * played. Not a backend field (PercentGained/PercentLoss are confirmed-dead
 * placeholders, always "0.00%") — Mr Yemi's direction (2026-09-08) was to
 * show exact totals and derive % client-side "based on Plays and Gains";
 * this is that derivation. Plays is 0 whenever nothing's been staked yet.
 */
export function computeGainPercent(gains: number, plays: number): number {
  return plays > 0 ? (gains / plays) * 100 : 0;
}

/** "09:00" -> "9:00 AM" */
export function formatTime12h(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${period}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * When a card was created, formatted from the string the backend sent rather
 * than from a re-parsed Date.
 *
 * The backend stamps its own clock, and `new Date(raw).toLocaleString()`
 * re-reads that through the device's timezone — which is why a card created a
 * moment ago displayed "1h ago". Showing the server's own figures keeps it
 * exact, and makes any clock difference between server and device visible
 * instead of silently shifting it.
 */
export function formatCreatedAt(raw: string | undefined, iso: string): string {
  const m = raw?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (m) {
    const [, mm, dd, , hh, mi, ap] = m;
    const month = MONTHS[Number(mm) - 1] ?? mm;
    const time = `${Number(hh)}:${mi}${ap ? ` ${ap.toUpperCase()}` : ''}`;
    return `${Number(dd)} ${month}, ${time}`;
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

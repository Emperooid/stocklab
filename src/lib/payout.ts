/**
 * StockGod payout math.
 *
 * Two models from the spec:
 *  - "Conservative adjustment": per-user balance change based purely on how
 *    close their own prediction was to the Stock Value. Used for the
 *    Rounds screen display (matches the mockup's Change %/Value Gained columns).
 *  - "Zero-sum pool": the fair, real-money model. A round pool is collected
 *    from all participants (riskRate * balance each) and redistributed
 *    proportionally to winners by |score|. Losers fund the pool, winners split it.
 *    This is what a real backend should use for actual settlement.
 */

export const MIN_VALUE = 1;
export const MAX_VALUE = 5;
export const DEFAULT_RISK_RATE = 0.005; // 0.5% max risk per round

// distance -> adjustment rate (conservative table, Section 4 of spec)
const CONSERVATIVE_RATES: Record<number, number> = {
  0: 0.01,
  1: 0.005,
  2: 0,
  3: -0.0025,
  4: -0.005,
};

// distance -> points (Section 5 scoring, used for pool distribution)
const SCORE_TABLE: Record<number, number> = {
  0: 2,
  1: 1,
  2: 0,
  3: -1,
  4: -2,
};

export function computeStockValue(submissions: number[]): { average: number; stockValue: number } {
  if (submissions.length === 0) {
    return { average: 0, stockValue: MIN_VALUE };
  }
  const average = submissions.reduce((sum, v) => sum + v, 0) / submissions.length;
  const stockValue = Math.min(MAX_VALUE, Math.max(MIN_VALUE, Math.round(average)));
  return { average, stockValue };
}

export function computeDistance(prediction: number, stockValue: number): number {
  return Math.abs(prediction - stockValue);
}

export function getAdjustmentRate(distance: number): number {
  return CONSERVATIVE_RATES[distance] ?? 0;
}

export function getScore(distance: number): number {
  return SCORE_TABLE[distance] ?? 0;
}

export interface ConservativeResult {
  distance: number;
  changePercent: number;
  valueGained: number;
  balanceAfter: number;
}

export function applyConservativeAdjustment(balance: number, prediction: number, stockValue: number): ConservativeResult {
  const distance = computeDistance(prediction, stockValue);
  const rate = getAdjustmentRate(distance);
  const valueGained = round2(balance * rate);
  const balanceAfter = round2(balance + valueGained);
  return { distance, changePercent: rate * 100, valueGained, balanceAfter };
}

export interface PoolParticipant {
  userId: string;
  balance: number;
  prediction: number;
}

export interface PoolSettlement {
  userId: string;
  distance: number;
  points: number;
  payout: number; // positive = gain, negative = loss
  balanceAfter: number;
}

/**
 * Zero-sum pool settlement: every participant contributes riskRate * balance
 * to the pool. Losers' contributions (and the pool) are split among winners
 * proportional to their |points|. Neutral (0-point) users break even.
 */
export function settleRoundPool(
  participants: PoolParticipant[],
  stockValue: number,
  riskRate: number = DEFAULT_RISK_RATE
): PoolSettlement[] {
  const scored = participants.map((p) => {
    const distance = computeDistance(p.prediction, stockValue);
    return { ...p, distance, points: getScore(distance) };
  });

  const pool = round2(scored.reduce((sum, p) => sum + p.balance * riskRate, 0));
  const totalPositive = scored.reduce((sum, p) => sum + (p.points > 0 ? p.points : 0), 0);
  const totalNegative = scored.reduce((sum, p) => sum + (p.points < 0 ? Math.abs(p.points) : 0), 0);

  return scored.map((p) => {
    let payout = 0;
    if (p.points > 0 && totalPositive > 0) {
      payout = round2((p.points / totalPositive) * pool);
    } else if (p.points < 0 && totalNegative > 0) {
      payout = -round2((Math.abs(p.points) / totalNegative) * pool);
    }
    return {
      userId: p.userId,
      distance: p.distance,
      points: p.points,
      payout,
      balanceAfter: round2(p.balance + payout),
    };
  });
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

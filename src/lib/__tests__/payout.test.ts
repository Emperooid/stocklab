import {
  applyConservativeAdjustment,
  computeDistance,
  computeStockValue,
  getAdjustmentRate,
  getScore,
  settleRoundPool,
} from '../payout';

describe('computeStockValue', () => {
  it('rounds the average of submissions to the nearest whole number (spec example: 2,3,4,3,2 -> 2.8 -> 3)', () => {
    const { average, stockValue } = computeStockValue([2, 3, 4, 3, 2]);
    expect(average).toBeCloseTo(2.8);
    expect(stockValue).toBe(3);
  });

  it('rounds down when the average is below the midpoint', () => {
    expect(computeStockValue([1, 1, 1, 2]).stockValue).toBe(1);
  });

  it('clamps to the 1-5 range even with degenerate input', () => {
    expect(computeStockValue([5, 5, 5]).stockValue).toBe(5);
    expect(computeStockValue([1, 1, 1]).stockValue).toBe(1);
  });

  it('returns the minimum value and zero average for no submissions', () => {
    expect(computeStockValue([])).toEqual({ average: 0, stockValue: 1 });
  });
});

describe('computeDistance', () => {
  it('is the absolute difference between prediction and stock value', () => {
    expect(computeDistance(4, 3)).toBe(1);
    expect(computeDistance(1, 5)).toBe(4);
    expect(computeDistance(3, 3)).toBe(0);
  });
});

describe('getAdjustmentRate / getScore (conservative table from spec Section 4)', () => {
  it.each([
    [0, 0.01, 2],
    [1, 0.005, 1],
    [2, 0, 0],
    [3, -0.0025, -1],
    [4, -0.005, -2],
  ])('distance %i -> rate %f, score %i', (distance, rate, score) => {
    expect(getAdjustmentRate(distance)).toBeCloseTo(rate);
    expect(getScore(distance)).toBe(score);
  });
});

describe('applyConservativeAdjustment', () => {
  it.each([
    [0, 5050],
    [1, 5025],
    [2, 5000],
    [3, 4987.5],
    [4, 4975],
  ])('a %i-away prediction on a ₦5000 balance settles to ₦%f (spec Section 4 table)', (distance, expectedBalance) => {
    const prediction = 3;
    const stockValue = prediction - distance >= 1 ? prediction - distance : prediction + distance;
    const { balanceAfter } = applyConservativeAdjustment(5000, prediction, stockValue);
    expect(balanceAfter).toBeCloseTo(expectedBalance);
  });

  it('never lets a single round move more than 1% of the balance', () => {
    for (let distance = 0; distance <= 4; distance++) {
      const { changePercent } = applyConservativeAdjustment(5000, 3, 3 - distance >= 1 ? 3 - distance : 3 + distance);
      expect(Math.abs(changePercent)).toBeLessThanOrEqual(1);
    }
  });
});

describe('settleRoundPool (zero-sum model from spec Section 5)', () => {
  it('is zero-sum: total payouts across all participants sum to ~0', () => {
    const participants = [
      { userId: 'a', balance: 5000, prediction: 3 }, // distance 0 -> winner
      { userId: 'b', balance: 5000, prediction: 3 }, // distance 0 -> winner
      { userId: 'c', balance: 5000, prediction: 5 }, // distance 4 -> loser (funds the pool)
      { userId: 'd', balance: 5000, prediction: 1 }, // distance 2 -> neutral
    ];

    const settlements = settleRoundPool(participants, 3);
    const totalPayout = settlements.reduce((sum, s) => sum + s.payout, 0);

    expect(totalPayout).toBeCloseTo(0, 2);
  });

  it('splits the pool proportionally to |points| among winners, and neutral users break even', () => {
    const participants = [
      { userId: 'winner-1', balance: 5000, prediction: 3 }, // distance 0, points +2
      { userId: 'winner-2', balance: 5000, prediction: 3 }, // distance 0, points +2
      { userId: 'loser', balance: 5000, prediction: 5 }, // distance 4, points -2
      { userId: 'neutral', balance: 5000, prediction: 1 }, // distance 2, points 0
    ];

    const settlements = settleRoundPool(participants, 3);
    const byId = Object.fromEntries(settlements.map((s) => [s.userId, s]));

    // pool = 4 users * 5000 * 0.5% = 100; two equal-strength winners split it evenly
    expect(byId['winner-1'].payout).toBeCloseTo(50);
    expect(byId['winner-2'].payout).toBeCloseTo(50);
    expect(byId['loser'].payout).toBeCloseTo(-100);
    expect(byId['neutral'].payout).toBe(0);
    expect(byId['neutral'].balanceAfter).toBe(5000);
  });

  it('leaves everyone unchanged when the whole round is neutral (distance 2 for all)', () => {
    const participants = [
      { userId: 'a', balance: 5000, prediction: 1 },
      { userId: 'b', balance: 3000, prediction: 5 },
    ];
    const settlements = settleRoundPool(participants, 3);
    expect(settlements.every((s) => s.payout === 0)).toBe(true);
  });
});

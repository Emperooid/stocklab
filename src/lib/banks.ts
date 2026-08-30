import { Bank } from '../types';

/**
 * Bundled client-side instead of fetched from the backend — NIBSS/CBN bank
 * codes are effectively static (they almost never change), so there's no
 * real need to depend on a "list banks" endpoint that doesn't exist yet
 * just to populate a picker. walletStore.fetchBanks() tries the backend
 * first anyway (in case a live, more-current list ever ships) and only
 * falls back to this.
 *
 * VERIFY BEFORE RELYING ON FOR REAL PAYOUTS: these codes are compiled from
 * general knowledge of Nigeria's standard NIP bank code list, not pulled
 * live from NIBSS — cross-check against Mr Yemi's own backend/admin data
 * (or NIBSS's published list) before this is trusted for real money
 * movement, especially the fintech/microfinance entries, which are more
 * likely to have drifted.
 */
export const NIGERIAN_BANKS: Bank[] = [
  { code: '044', name: 'Access Bank' },
  { code: '023', name: 'Citibank Nigeria' },
  { code: '050', name: 'Ecobank Nigeria' },
  { code: '070', name: 'Fidelity Bank' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '214', name: 'First City Monument Bank (FCMB)' },
  { code: '058', name: 'Guaranty Trust Bank (GTBank)' },
  { code: '030', name: 'Heritage Bank' },
  { code: '082', name: 'Keystone Bank' },
  { code: '076', name: 'Polaris Bank' },
  { code: '101', name: 'Providus Bank' },
  { code: '221', name: 'Stanbic IBTC Bank' },
  { code: '068', name: 'Standard Chartered Bank' },
  { code: '232', name: 'Sterling Bank' },
  { code: '032', name: 'Union Bank of Nigeria' },
  { code: '033', name: 'United Bank for Africa (UBA)' },
  { code: '215', name: 'Unity Bank' },
  { code: '035', name: 'Wema Bank' },
  { code: '057', name: 'Zenith Bank' },
  { code: '50211', name: 'Kuda Microfinance Bank' },
  { code: '999992', name: 'OPay (Paycom)' },
  { code: '999991', name: 'PalmPay' },
  { code: '50515', name: 'Moniepoint Microfinance Bank' },
  { code: '51318', name: 'FairMoney Microfinance Bank' },
  { code: '100026', name: 'Carbon (formerly OneFi)' },
  { code: '090267', name: 'Rubies Microfinance Bank' },
  { code: '566', name: 'VFD Microfinance Bank' },
  { code: '50304', name: 'Mint Finex Microfinance Bank' },
  { code: '51310', name: 'Sparkle Microfinance Bank' },
];

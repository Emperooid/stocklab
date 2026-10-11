// The store is persisted through AsyncStorage, which has no native module under
// jest — the package ships this mock for exactly that.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

import { iWon, mapRemoteCard, maskedPhone, parseBackendDate, payoutFor, winnerOf } from '../cardsStore';

/**
 * These are REAL records captured from the live gateway (account 09071929127),
 * so this file is the regression net for the bug where every card was dropped:
 * the mapper looked for `CardID`/`Id`/`id` while the backend sends `ID`.
 */
const MY_PHONE = '09071929127';

/** C6 — GetOpenCardsAvailable. One of mine, one from another player. */
const C6_MINE = {
  Amount: '100.00',
  DateIn1: '10/10/2026 4:26:05 PM',
  ID: 3,
  Phone: '2349071929127',
  PlayStatus: 'Not Played',
  Played: false,
};

const C6_OTHER = {
  Amount: '500.00',
  DateIn1: '10/9/2026 10:19:21 PM',
  ID: 2,
  Phone: '2348164568803',
  PlayStatus: 'Not Played',
  Played: false,
};

/** C3 — GetMyCards, the fuller shape. */
const C3_MINE = {
  Amount: '100.00',
  Amount2: null,
  AmountWon: null,
  Charges: null,
  DateIn1: '10/10/2026 4:27:20 PM',
  DateIn2: '10/10/2026 4:27:20 PM',
  ID: 4,
  Phone: '2349071929127',
  Phone2: null,
  PlayStatus: 'Not Played',
  Played: false,
  Result: null,
  WinPhone: null,
};

describe('mapRemoteCard', () => {
  it('reads the id from the backend’s `ID` key (the bug that hid every card)', () => {
    expect(mapRemoteCard(C6_MINE, MY_PHONE).id).toBe('3');
    expect(mapRemoteCard(C6_OTHER, MY_PHONE).id).toBe('2');
    expect(mapRemoteCard(C3_MINE, MY_PHONE).id).toBe('4');
  });

  it('recognises the signed-in user’s own card from the normalised phone', () => {
    expect(mapRemoteCard(C6_MINE, MY_PHONE).mine).toBe(true);
    expect(mapRemoteCard(C3_MINE, MY_PHONE).mine).toBe(true);
    expect(mapRemoteCard(C6_OTHER, MY_PHONE).mine).toBe(false);
  });

  it('treats an unplayed card as open, not settled', () => {
    expect(mapRemoteCard(C6_MINE, MY_PHONE).status).toBe('open');
    expect(mapRemoteCard(C3_MINE, MY_PHONE).status).toBe('open');
    expect(mapRemoteCard(C6_MINE, MY_PHONE).winner).toBeUndefined();
  });

  it('parses the stake and the US-format DateIn1', () => {
    const card = mapRemoteCard(C6_MINE, MY_PHONE);
    expect(card.amount).toBe(100);
    expect(card.createdAt).toBe(new Date(2026, 9, 10, 16, 26, 5).toISOString());
  });

  it('names the user "You" and never exposes another player’s number', () => {
    expect(mapRemoteCard(C6_MINE, MY_PHONE).originatorName).toBe('You');
    const other = mapRemoteCard(C6_OTHER, MY_PHONE).originatorName;
    expect(other).toBe('0816 456 ****');
    expect(other).not.toContain('2348164568803');
  });

  it('still copes with the older guessed key casing', () => {
    const legacy = { CardID: '9', Amount: 250, Phone: '08031234567', Figure: 4, CreatedAt: '2026-10-10T10:00:00.000Z' };
    const card = mapRemoteCard(legacy, '08031234567');
    expect(card.id).toBe('9');
    expect(card.mine).toBe(true);
    expect(card.originatorFigure).toBe(4);
  });
});

describe('response helpers', () => {
  it('stars out the last four digits, in either number shape', () => {
    // exactly the last four digits are hidden
    expect(maskedPhone('2349024706049')).toBe('0902 470 ****');
    expect(maskedPhone('09024706049')).toBe('0902 470 ****');
    // the tail must not survive anywhere
    const masked = maskedPhone('09024706049');
    expect(masked).not.toContain('6049');
    expect(masked.replace(/[^0-9]/g, '')).toBe('0902470');
    expect(maskedPhone('')).toBe('Player');
  });

  it('parses the gateway date format and passes through ISO', () => {
    expect(parseBackendDate('10/10/2026 4:27:20 PM')).toBe(new Date(2026, 9, 10, 16, 27, 20).toISOString());
    expect(parseBackendDate('10/10/2026 12:05:00 AM')).toBe(new Date(2026, 9, 10, 0, 5, 0).toISOString());
    expect(parseBackendDate('2026-10-10T10:00:00.000Z')).toBe('2026-10-10T10:00:00.000Z');
    expect(parseBackendDate(null)).toBeUndefined();
  });
});

/**
 * The bug that shipped: the gateway's `Result` is often null, so `winner` was
 * undefined and EVERY settled card was scored a loss — including a matched
 * guess by the answering player, which the app's own rules award to them.
 */
describe('winnerOf / iWon', () => {
  const card = (over: Partial<any>) => ({
    id: '1',
    amount: 100,
    createdAt: '2026-10-10T16:00:00.000Z',
    originatorFigure: 3,
    originatorName: 'You',
    originatorPhone: '2349071929127',
    mine: false,
    status: 'settled' as const,
    ...over,
  });

  it('awards a match to the answering player when the gateway stays silent', () => {
    const matched = card({ answeredFigure: 3 }); // winner undefined
    expect(winnerOf(matched)).toBe('answerer');
    expect(iWon(matched)).toBe(true);
  });

  it('awards a miss to the originator when the gateway stays silent', () => {
    const missed = card({ answeredFigure: 5 });
    expect(winnerOf(missed)).toBe('originator');
    expect(iWon(missed)).toBe(false);
  });

  it('still refuses to guess when the figures are unknown', () => {
    const unknown = card({ originatorFigure: 0, answeredFigure: undefined });
    expect(winnerOf(unknown)).toBeUndefined();
    expect(iWon(unknown)).toBe(false);
  });

  it('lets a visible match beat a contradicting gateway Result', () => {
    // Exactly the reported bug: both figures are 3, but the gateway's `Result`
    // resolved to the originator — which rendered as "IT'S A MATCH" over
    // "Not this time -N100.00".
    const contradictory = card({ answeredFigure: 3, winner: 'originator' });
    expect(winnerOf(contradictory)).toBe('answerer');
    expect(iWon(contradictory)).toBe(true);
  });

  it('still trusts the gateway when the figures are unknown', () => {
    const reported = card({ originatorFigure: 0, answeredFigure: undefined, winner: 'originator' });
    expect(winnerOf(reported)).toBe('originator');
    expect(iWon(reported)).toBe(false);
  });

  it('flips the result for the card holder', () => {
    expect(iWon(card({ answeredFigure: 3, mine: true }))).toBe(false);
    expect(iWon(card({ answeredFigure: 5, mine: true }))).toBe(true);
  });

  it('never scores an unsettled card as a win', () => {
    expect(iWon(card({ status: 'open', answeredFigure: 3 }))).toBe(false);
  });
});

/**
 * Live C5 records (account 09071929127). `Result` is the winning ROLE and
 * `IsWinner` is relative to the queried phone — both were being misread.
 */
describe('settled records from the real gateway', () => {
  const MY = '09071929127';
  const base = {
    Amount: '100.00',
    Amount2: '100.00',
    AmountWon: '170.00',
    Charges: '30.00',
    PlayStatus: 'Played',
    Played: true,
  };

  // I was the ORIGINATOR, they matched my 3, so the UNVEILER won and I lost.
  const lostAsOriginator = { ...base, Figure: '3', Figure2: '3', ID: 7, IsWinner: false, Phone: '2349071929127', Phone2: '2349024706049', Result: 'UNVEILER', Role: 'ORIGINATOR', WinPhone: '2349024706049' };

  // I was the UNVEILER, I matched their 1, so I won.
  const wonAsUnveiler = { ...base, Figure: '1', Figure2: '1', ID: 10, IsWinner: true, Phone: '2349024706049', Phone2: '2349071929127', Result: 'UNVEILER', Role: 'UNVEILER', WinPhone: '2349071929127' };

  // I was the UNVEILER on a 300 stake, missed, and the originator won.
  const lostAsUnveiler = { Amount: '300.00', Amount2: '300.00', AmountWon: '510.00', Charges: '90.00', Figure: '3', Figure2: '4', ID: 13, IsWinner: false, Phone: '2348164568803', Phone2: '2349071929127', PlayStatus: 'Played', Played: true, Result: 'ORIGINATOR', Role: 'UNVEILER', WinPhone: '2348164568803' };

  it('reads the winner from IsWinner in both roles', () => {
    expect(winnerOf(mapRemoteCard(lostAsOriginator, MY))).toBe('answerer');
    expect(winnerOf(mapRemoteCard(wonAsUnveiler, MY))).toBe('answerer');
    expect(winnerOf(mapRemoteCard(lostAsUnveiler, MY))).toBe('originator');
  });

  it('gets the player’s own result right', () => {
    expect(iWon(mapRemoteCard(lostAsOriginator, MY))).toBe(false);
    expect(iWon(mapRemoteCard(wonAsUnveiler, MY))).toBe(true);
    expect(iWon(mapRemoteCard(lostAsUnveiler, MY))).toBe(false);
  });

  it('picks up both figures, so the reveal can name them', () => {
    const c = mapRemoteCard(lostAsOriginator, MY);
    expect(c.originatorFigure).toBe(3);
    expect(c.answeredFigure).toBe(3);
    expect(c.hasOwnProperty('id')).toBe(true);
    expect(mapRemoteCard(lostAsUnveiler, MY).originatorFigure).toBe(3);
    expect(mapRemoteCard(lostAsUnveiler, MY).answeredFigure).toBe(4);
  });

  it('takes the payout from AmountWon rather than the local rule', () => {
    expect(mapRemoteCard(lostAsUnveiler, MY).payout).toBe(510);
    expect(mapRemoteCard(wonAsUnveiler, MY).payout).toBe(170);
  });

  it('agrees with the 85% split the gateway actually pays', () => {
    expect(payoutFor(100)).toBe(170);
    expect(payoutFor(300)).toBe(510);
  });
});

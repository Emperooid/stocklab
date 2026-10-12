import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CARDS_API_REMOTE, RemoteCardRecord, remoteCardsApi } from '../api/cardsApi';
import { getSession } from '../api/backendClient';
import { useWalletStore } from './walletStore';

/* ── rules ─────────────────────────────────────────────────────────────────── */
export const CARD_MIN = 100;
export const CARD_MAX = 1000;
export const CARD_STEP = 50;
/** Winner takes 80% of the two combined stakes; the house keeps the other 20%. */
// CONFIRMED live: AmountWon is 85% of the pot and Charges the other 15%
// (stake 100 -> pot 200 -> won 170, charges 30; stake 300 -> pot 600 -> won 510,
// charges 90). The app used to advertise 80/20, which was simply wrong.
export const WINNER_SHARE = 0.85;
export const PLATFORM_SHARE = 0.15;
export const FIGURES = [1, 2, 3, 4, 5] as const;
/** How long one of your own cards stays "waiting for an answer" before the
 *  local opponent answers it. Only used by the local data layer. */
const ANSWER_DELAY_MS = 25_000;

export function potFor(amount: number) {
  return amount * 2;
}
export function payoutFor(amount: number) {
  return Math.round(amount * 2 * WINNER_SHARE);
}

/**
 * Best-guess mapper from a raw C3/C5/C6 record to the app's GameCard shape —
 * UNCONFIRMED per-record field names (see cardsApi.ts's header comment: every
 * live list call returned `data: []`, so no real record has been inspected
 * yet). Defensive `??` fallbacks across the most likely casings, following
 * the confirmed input-param names (CardID/Phone/Amount/Figure). Correct this
 * the first time a real card exists to check against.
 */
/**
 * The gateway is not consistent about key casing — the same record comes back as
 * `ID`/`DateIn1`/`AmountWon` from C3/C6 but lowerCamel elsewhere. Try the exact
 * names first, then a case-insensitive match, so a casing change can never again
 * silently blank out every card.
 */
function field(raw: RemoteCardRecord, ...names: string[]): any {
  for (const name of names) {
    const v = raw[name];
    if (v != null && v !== '') return v;
  }
  const byLower = new Map(Object.keys(raw).map((k) => [k.toLowerCase(), k]));
  for (const name of names) {
    const real = byLower.get(name.toLowerCase());
    if (real !== undefined) {
      const v = raw[real];
      if (v != null && v !== '') return v;
    }
  }
  return undefined;
}

/** Digits only — the session phone is 0907… but the backend echoes 234907…. */
function phoneDigits(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

/**
 * Players shouldn't be able to read each other's number off a card, so the last
 * four digits are starred out — enough to tell two people apart at a glance,
 * not enough to call or message one of them. The familiar 4-3-4 grouping is
 * kept so it still reads like a phone number:
 *
 *   09024706049 -> "0902 470 ****"
 */
export function maskedPhone(value: unknown): string {
  const digits = phoneDigits(value);
  if (!digits) return 'Player';
  const local =
    digits.length === 13 && digits.startsWith('234') ? `0${digits.slice(3)}` : digits.length === 10 ? `0${digits}` : digits;
  if (local.length !== 11) return local;
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${'*'.repeat(4)}`;
}

/** The gateway dates are US-format local time: "10/10/2026 4:27:20 PM". */
export function parseBackendDate(value: unknown): string | undefined {
  if (value == null || value === '') return undefined;
  const raw = String(value).trim();
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!m) {
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
  }
  const [, mm, dd, yyyy, hh, mi, ss, ap] = m;
  let hour = Number(hh);
  if (ap) {
    const upper = ap.toUpperCase();
    if (upper === 'PM' && hour < 12) hour += 12;
    if (upper === 'AM' && hour === 12) hour = 0;
  }
  const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), hour, Number(mi), Number(ss ?? 0));
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

/** Exported for tests — the live record shape is the thing most likely to drift. */
export function mapRemoteCard(raw: RemoteCardRecord, myPhone: string): GameCard {
  const id = String(field(raw, 'CardID', 'CardId', 'ID', 'Id', 'id') ?? '');
  const originatorPhone = String(field(raw, 'Phone', 'OriginatorPhone', 'CreatorPhone') ?? '');
  const answererPhone = field(raw, 'Phone2', 'AnswererPhone', 'AnsweringPhone');

  const myDigits = phoneDigits(myPhone);
  const mine = !!originatorPhone && !!myDigits && phoneDigits(originatorPhone).endsWith(myDigits.slice(-10));

  const answeredFigureRaw = field(raw, 'AnsweringFigure', 'AnswererFigure', 'AnsweredFigure', 'Figure2');
  const playStatus = String(field(raw, 'PlayStatus') ?? '');
  const playedRaw = field(raw, 'Played');
  const played = playedRaw === true || (!!playStatus && !/^\s*not\s+played/i.test(playStatus));
  const resultRaw = field(raw, 'Result', 'Winner', 'winner');
  const isSettled = answeredFigureRaw != null || resultRaw != null || played;

  // `IsWinner` is the most direct signal: a boolean for the queried phone, so
  // it maps onto the winner's role once we know whether we are the originator.
  // `Result` names the winning ROLE — "UNVEILER" (the answering player) or
  // "ORIGINATOR" — not the winning phone as originally assumed; that reading
  // left every "UNVEILER" result with no winner at all.
  const isWinnerRaw = field(raw, 'IsWinner');
  let winner: GameCard['winner'];
  if (typeof isWinnerRaw === 'boolean') {
    winner = isWinnerRaw === mine ? 'originator' : 'answerer';
  } else if (resultRaw != null) {
    const asText = String(resultRaw);
    if (/unveil|answer/i.test(asText)) winner = 'answerer';
    else if (/origin/i.test(asText)) winner = 'originator';
  }

  const amount = Number(field(raw, 'Amount', 'Stake') ?? 0);
  const payoutRaw = field(raw, 'Payout', 'AmountWon');
  const nameRaw = field(raw, 'Name', 'OriginatorName', 'FullName');

  return {
    id,
    amount,
    createdAt: parseBackendDate(field(raw, 'CreatedAt', 'DateCreated', 'DateIn1', 'DateIn')) ?? new Date().toISOString(),
    createdAtRaw: (() => {
      const v = field(raw, 'CreatedAt', 'DateCreated', 'DateIn1', 'DateIn');
      return v == null ? undefined : String(v);
    })(),
    originatorFigure: Number(field(raw, 'Figure', 'OriginatorFigure', 'CreatorFigure') ?? 0),
    originatorName: nameRaw ?? (mine ? 'You' : maskedPhone(originatorPhone)),
    originatorPhone,
    mine,
    status: isSettled ? 'settled' : 'open',
    answeredByName: isSettled ? (field(raw, 'AnsweringName', 'AnswererName') ?? (mine ? undefined : 'You')) : undefined,
    answeredFigure: answeredFigureRaw != null ? Number(answeredFigureRaw) : undefined,
    answeredAt: parseBackendDate(field(raw, 'AnsweredAt', 'DateAnswered', 'DateIn2')),
    winner,
    pot: field(raw, 'Pot') != null ? Number(field(raw, 'Pot')) : isSettled ? potFor(amount) : undefined,
    // Never invent what a settled card paid. This used to fall back to the
    // local 80%-of-pot rule, which could announce a win the gateway never
    // credited. `undefined` means "the server didn't say", not zero.
    // Falls back to the product's own 80%-of-pot rule — the exact number
    // PotBreakdown and computeCardStats already show, so the verdict can't
    // contradict the split printed directly beneath it. If the gateway pays a
    // different share, this one rule is what changes.
    payout: payoutRaw != null ? Number(payoutRaw) : isSettled ? payoutFor(amount) : undefined,
    seen: true,
  };
}

/* ── model ─────────────────────────────────────────────────────────────────── */
export interface GameCard {
  id: string;
  /** The stake each side puts in (they always match). */
  amount: number;
  createdAt: string;
  /**
   * The creation timestamp exactly as the backend wrote it ("10/12/2026 9:45:00
   * AM"). `createdAt` is the same instant re-parsed through the device's clock,
   * which is what made a just-created card read "1h ago" — see formatCreatedAt.
   */
  createdAtRaw?: string;
  /** The figure the originator hid. Only revealed once the card is settled. */
  originatorFigure: number;
  originatorName: string;
  originatorPhone: string;
  /** True when the signed-in user created this card. */
  mine: boolean;
  status: 'open' | 'settled';
  answeredByName?: string;
  answeredFigure?: number;
  answeredAt?: string;
  winner?: 'originator' | 'answerer';
  pot?: number;
  payout?: number;
  /** Set once the signed-in user has seen the reveal, so Play can badge it. */
  seen?: boolean;
}

export interface CardStats {
  played: number;
  wins: number;
  losses: number;
  winnings: number;
  staked: number;
  net: number;
  winRate: number;
}

interface CardsState {
  cards: GameCard[];
  /**
   * card id -> the figure this user hid. The gateway never returns the hidden
   * figure (not even to the owner), so this is the only way an unanswered card
   * of ours can show its own number.
   */
  myPicks: Record<string, number>;
  /** Which API mode the cached cards came from, so demo cards can never leak into remote. */
  cardsCachedMode: 'local' | 'remote' | '';
  /** The card game's own balance, seeded from the wallet on first run. */
  bankroll: number | null;
  seenSeed: boolean;
  hydrated: boolean;
  ensureSeeded: () => void;
  createCard: (figure: number, amount: number) => Promise<GameCard>;
  playCard: (cardId: string, figure: number) => Promise<GameCard>;
  /** Settles any of your own cards whose local opponent has now answered. */
  settleDue: () => void;
  /** Marks a settled card's reveal as viewed, so Play can badge what's new. */
  markSeen: (cardId: string) => void;
  refreshFromServer: () => Promise<void>;
}

/* ── local seed data ───────────────────────────────────────────────────────── */
const BOTS = ['Tunde A.', 'Ngozi K.', 'Emeka O.', 'Blessing I.', 'Yusuf B.', 'Aisha M.', 'Chidi N.'];

function rand<T>(xs: readonly T[]): T {
  return xs[Math.floor(Math.random() * xs.length)];
}
function randAmount(): number {
  const steps = [100, 150, 200, 300, 400, 500, 700, 1000];
  return steps[Math.floor(Math.random() * steps.length)];
}
function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * A brand-new local install starts with a handful of other players' open cards
 * (otherwise there'd be nothing to play) and a little settled history so the
 * Rewards screen shows its real design. All of this disappears the moment
 * CARDS_API_REMOTE is switched on.
 */
function seedCards(): GameCard[] {
  const now = Date.now();
  const open: GameCard[] = BOTS.slice(0, 5).map((name, i) => ({
    id: id('seed'),
    amount: randAmount(),
    createdAt: new Date(now - (i + 1) * 240_000).toISOString(),
    originatorFigure: rand(FIGURES),
    originatorName: name,
    originatorPhone: `080${30000000 + i * 111111}`,
    mine: false,
    status: 'open',
  }));

  const history: Array<[number, number, boolean]> = [
    // [my figure, their figure, I was the originator]
    [3, 3, false],
    [2, 5, false],
    [4, 4, true],
    [1, 3, false],
    [5, 2, true],
  ];
  const settled: GameCard[] = history.map(([mine, theirs, iAmOriginator], i) => {
    const amount = randAmount();
    const matched = mine === theirs;
    // A match always means the answering user won.
    const winner: 'originator' | 'answerer' = matched ? 'answerer' : 'originator';
    const iWon = iAmOriginator ? winner === 'originator' : winner === 'answerer';
    return {
      id: id('hist'),
      amount,
      createdAt: new Date(now - (i + 1) * 5_400_000).toISOString(),
      settledAt: new Date(now - (i + 1) * 5_400_000 + 900_000).toISOString(),
      originatorFigure: iAmOriginator ? mine : theirs,
      originatorName: iAmOriginator ? 'You' : BOTS[i % BOTS.length],
      originatorPhone: '08000000000',
      mine: iAmOriginator,
      status: 'settled',
      answeredByName: iAmOriginator ? BOTS[i % BOTS.length] : 'You',
      answeredFigure: iAmOriginator ? theirs : mine,
      winner,
      pot: potFor(amount),
      payout: payoutFor(amount),
      seen: true,
    } as GameCard & { settledAt: string };
  });

  return [...open, ...settled];
}

/* ── store ─────────────────────────────────────────────────────────────────── */
/**
 * One refresh at a time. ensureSeeded() and settleDue() both refresh, and every
 * card tab calls both on focus, so without this a single tab switch doubles the
 * C3/C5/C6 round trips (each of which mints its own single-use token).
 */
let refreshInFlight: Promise<void> | null = null;

export const useCardsStore = create<CardsState>()(
  persist(
    (set, get) => ({
      cards: [],
      myPicks: {},
      cardsCachedMode: '',
      bankroll: null,
      seenSeed: false,
      hydrated: false,

      ensureSeeded: () => {
        if (CARDS_API_REMOTE) {
          // No local seed data in remote mode — the real wallet balance is the
          // only "bankroll," and real cards come from the server.
          set({ bankroll: useWalletStore.getState().balance, seenSeed: true });
          get().refreshFromServer().catch(() => {});
          return;
        }
        const { seenSeed, bankroll } = get();
        if (seenSeed) return;
        const walletBalance = useWalletStore.getState().balance;
        set({
          cards: seedCards(),
          bankroll: bankroll ?? (walletBalance > 0 ? walletBalance : 2350),
          seenSeed: true,
        });
      },

      createCard: async (figure, amount) => {
        if (CARDS_API_REMOTE) {
          if (amount < CARD_MIN || amount > CARD_MAX) throw new Error(`Set a price between ₦${CARD_MIN} and ₦${CARD_MAX}.`);
          await remoteCardsApi.setCardValue(figure, amount);
          await get().refreshFromServer();
          // C1 answers only {message, status} — no id — so identify the new card
          // as the highest-numbered open card of ours (ids are sequential).
          const mine = get()
            .cards.filter((c) => c.mine && c.status === 'open')
            .sort((a, b) => {
              const an = Number(a.id);
              const bn = Number(b.id);
              if (Number.isFinite(an) && Number.isFinite(bn) && an !== bn) return bn - an;
              return a.createdAt < b.createdAt ? 1 : -1;
            })[0];
          if (!mine) throw new Error('Card created, but it has not appeared in your cards yet — pull to refresh.');
          set({
            myPicks: { ...get().myPicks, [mine.id]: figure },
            cards: get().cards.map((c) => (c.id === mine.id ? { ...c, originatorFigure: figure } : c)),
          });
          return { ...mine, originatorFigure: figure };
        }

        const balance = get().bankroll ?? 0;
        if (amount < CARD_MIN || amount > CARD_MAX) throw new Error(`Set a price between ₦${CARD_MIN} and ₦${CARD_MAX}.`);
        if (balance < amount) throw new Error('Not enough balance for that stake.');

        const card: GameCard = {
          id: id('card'),
          amount,
          createdAt: new Date().toISOString(),
          originatorFigure: figure,
          originatorName: 'You',
          originatorPhone: 'self',
          mine: true,
          status: 'open',
          // The local opponent's answer is decided up front and revealed later.
          answeredByName: rand(BOTS),
          answeredFigure: rand(FIGURES),
        };

        set({ cards: [card, ...get().cards], bankroll: balance - amount });
        return card;
      },

      playCard: async (cardId, figure) => {
        const { cards } = get();
        const target = cards.find((c) => c.id === cardId);
        if (!target) throw new Error('That card is no longer available.');
        if (target.status !== 'open') throw new Error('That card has already been played.');

        if (CARDS_API_REMOTE) {
          await remoteCardsApi.guessCardValue(target.id, figure, target.amount);
          await get().refreshFromServer();
          const updated = get().cards.find((c) => c.id === cardId);
          if (updated) return updated;
          // C2 may not echo the card back into C3/C6 right away — fall back to
          // what's already known locally plus the figure just submitted, so the
          // reveal screen still has something to show.
          return { ...target, status: 'settled', answeredFigure: figure, answeredByName: 'You', answeredAt: new Date().toISOString() };
        }

        const balance = get().bankroll ?? 0;
        if (balance < target.amount) throw new Error('Not enough balance to match that stake.');

        const matched = figure === target.originatorFigure;
        const winner: 'originator' | 'answerer' = matched ? 'answerer' : 'originator';
        const payout = payoutFor(target.amount);

        const settled: GameCard = {
          ...target,
          status: 'settled',
          answeredByName: 'You',
          answeredFigure: figure,
          answeredAt: new Date().toISOString(),
          winner,
          pot: potFor(target.amount),
          payout,
          seen: false,
        };

        set({
          cards: cards.map((c) => (c.id === cardId ? settled : c)),
          // You stake the matching amount, and collect the 80% pot if you match.
          bankroll: balance - target.amount + (matched ? payout : 0),
        });
        return settled;
      },

      settleDue: () => {
        if (CARDS_API_REMOTE) {
          // The server settles a card the moment it's answered (C2) — there's
          // no local "waiting opponent" to simulate. Just pick up whatever's
          // changed server-side since the last fetch.
          get().refreshFromServer().catch(() => {});
          return;
        }
        const now = Date.now();
        let bankroll = get().bankroll ?? 0;
        let changed = false;

        const cards = get().cards.map((card) => {
          if (!card.mine || card.status !== 'open') return card;
          if (now - new Date(card.createdAt).getTime() < ANSWER_DELAY_MS) return card;

          const theirFigure = card.answeredFigure ?? rand(FIGURES);
          const matched = theirFigure === card.originatorFigure;
          const winner: 'originator' | 'answerer' = matched ? 'answerer' : 'originator';
          const payout = payoutFor(card.amount);
          if (winner === 'originator') bankroll += payout;
          changed = true;

          return {
            ...card,
            status: 'settled' as const,
            answeredFigure: theirFigure,
            answeredAt: new Date().toISOString(),
            winner,
            pot: potFor(card.amount),
            payout,
            seen: false,
          };
        });

        if (changed) set({ cards, bankroll });
      },

      markSeen: (cardId) => {
        set({ cards: get().cards.map((c) => (c.id === cardId ? { ...c, seen: true } : c)) });
      },

      refreshFromServer: async () => {
        if (!CARDS_API_REMOTE) return;
        if (refreshInFlight) return refreshInFlight;

        refreshInFlight = (async () => {
          // In remote mode the card balance IS the wallet balance: the backend
          // pays a win straight into the wallet (G25). Without pulling it here
          // a settled win never moved the CARD BALANCE on Cards Home.
          await useWalletStore
            .getState()
            .refreshBalance()
            .catch(() => {});

          const myPhone = getSession()?.phone ?? '';
          const [myRaw, resultsRaw, openRaw] = await Promise.all([
            remoteCardsApi.getMyCards(),
            remoteCardsApi.getCardsResultByPhone(myPhone).catch(() => []),
            remoteCardsApi.getOpenCardsAvailable(),
          ]);

          // C3 (my own cards) and C5 (results involving my phone, either role)
          // both describe cards I'm party to — merge them, C3 winning on
          // conflict since "my own cards" is the more direct source for that.
          const byId = new Map<string, GameCard>();
          for (const raw of resultsRaw) {
            const card = mapRemoteCard(raw, myPhone);
            if (card.id) byId.set(card.id, card);
          }
          for (const raw of myRaw) {
            const card = mapRemoteCard(raw, myPhone);
            if (card.id) byId.set(card.id, card);
          }
          // Open cards from others — exclude the signed-in user's own (already
          // covered above), even if the backend's open-list isn't scoped that way.
          for (const raw of openRaw) {
            const card = mapRemoteCard(raw, myPhone);
            if (card.id && !card.mine && !byId.has(card.id)) byId.set(card.id, card);
          }

          const picks = get().myPicks;
          set({
            bankroll: useWalletStore.getState().balance,
            cards: Array.from(byId.values()).map((card) =>
              card.mine && !card.originatorFigure && picks[card.id]
                ? { ...card, originatorFigure: picks[card.id] }
                : card
            ),
          });
        })().finally(() => {
          refreshInFlight = null;
        });

        return refreshInFlight;
      },
    }),
    {
      // Bumped from 'crowdstock-cards' now that CARDS_API_REMOTE defaults to
      // true — any device that still has locally-seeded demo cards persisted
      // under the old key (from before the real C1-C6 wiring) starts clean
      // under this one instead of briefly showing stale fake cards before
      // refreshFromServer() overwrites them.
      name: 'crowdstock-cards-v2',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        cards: s.cards,
        cardsCachedMode: CARDS_API_REMOTE ? 'remote' : 'local',
        // Kept in remote mode too — the hidden figure only ever exists here.
        myPicks: s.myPicks,
        bankroll: s.bankroll,
        seenSeed: s.seenSeed,
      }),
      onRehydrateStorage: () => (state) => {
        // A device that ran the old seeded local mode still holds demo cards on
        // disk; never let those surface as real ones after switching to remote.
        const mode = CARDS_API_REMOTE ? 'remote' : 'local';
        if (state && state.cardsCachedMode !== mode) {
          useCardsStore.setState({ cards: [] });
        }
        useCardsStore.setState({ hydrated: true });
        state?.ensureSeeded();
      },
    }
  )
);

/* ── selectors ─────────────────────────────────────────────────────────────── */
export function openCards(cards: GameCard[]): GameCard[] {
  return cards.filter((c) => c.status === 'open' && !c.mine);
}
export function myOpenCards(cards: GameCard[]): GameCard[] {
  return cards.filter((c) => c.status === 'open' && c.mine);
}
export function settledCards(cards: GameCard[]): GameCard[] {
  return cards.filter((c) => c.status === 'settled');
}
/**
 * Who won. The gateway's `Result` column is often null (taking `Phone2` with
 * it), which left `winner` undefined — and `iWon()` then reported a loss for
 * every settled card, including matched guesses that the answerer won.
 *
 * The rules are deterministic, so fall back to the figures when both are known:
 * a match is always the answering player's, a miss always the originator's.
 * Returns undefined only when nothing at all can be determined.
 */
export function winnerOf(card: GameCard): 'originator' | 'answerer' | undefined {
  // The figures are direct evidence and the rules are deterministic, so they
  // decide. `winner` is derived from the gateway's opaque `Result` column, the
  // meaning of which is still a guess — and trusting it first meant a visible
  // match could still render as a loss, giving "IT'S A MATCH" stacked above
  // "Not this time". The gateway's value only fills in when the figures are
  // genuinely unknown.
  if (card.originatorFigure > 0 && card.answeredFigure != null) {
    return card.originatorFigure === card.answeredFigure ? 'answerer' : 'originator';
  }
  if (card.winner) return card.winner;
  return undefined;
}

export function iWon(card: GameCard): boolean {
  if (card.status !== 'settled') return false;
  const winner = winnerOf(card);
  return card.mine ? winner === 'originator' : winner === 'answerer';
}
export function computeCardStats(cards: GameCard[]): CardStats {
  const settled = settledCards(cards);
  let wins = 0;
  let winnings = 0;
  let staked = 0;
  for (const c of settled) {
    staked += c.amount;
    if (iWon(c)) {
      wins += 1;
      winnings += c.payout ?? payoutFor(c.amount);
    }
  }
  const losses = settled.length - wins;
  return {
    played: settled.length,
    wins,
    losses,
    winnings,
    staked,
    net: winnings - staked,
    winRate: settled.length ? Math.round((wins / settled.length) * 100) : 0,
  };
}

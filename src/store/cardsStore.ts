import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CARDS_API_REMOTE, remoteCardsApi } from '../api/cardsApi';
import { useWalletStore } from './walletStore';

/* ── rules ─────────────────────────────────────────────────────────────────── */
export const CARD_MIN = 100;
export const CARD_MAX = 1000;
export const CARD_STEP = 50;
/** Winner takes 80% of the two combined stakes; the house keeps the other 20%. */
export const WINNER_SHARE = 0.8;
export const PLATFORM_SHARE = 0.2;
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

/* ── model ─────────────────────────────────────────────────────────────────── */
export interface GameCard {
  id: string;
  /** The stake each side puts in (they always match). */
  amount: number;
  createdAt: string;
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
export const useCardsStore = create<CardsState>()(
  persist(
    (set, get) => ({
      cards: [],
      bankroll: null,
      seenSeed: false,
      hydrated: false,

      ensureSeeded: () => {
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
          await remoteCardsApi.setCardFigure('self', figure, amount);
          await get().refreshFromServer();
          return get().cards[0];
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
          await remoteCardsApi.scoreCardFigure(target.id, 'self', figure, target.amount);
          await get().refreshFromServer();
          return get().cards.find((c) => c.id === cardId) as GameCard;
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
        const [open, results] = await Promise.all([
          remoteCardsApi.getOpenCardLists(),
          remoteCardsApi.getResultsList(),
        ]);
        const fromOpen: GameCard[] = open.map((c) => ({
          id: c.ID,
          amount: c.Amount,
          createdAt: c.CreatedAt ?? new Date().toISOString(),
          originatorFigure: c.Figure,
          originatorName: c.Name ?? 'Player',
          originatorPhone: c.Phone,
          mine: false,
          status: 'open',
        }));
        const settled: GameCard[] = results.map((r) => {
          const matched = r.OriginatorFigure === r.AnsweringFigure;
          return {
            id: r.CardID,
            amount: r.Pot / 2,
            createdAt: new Date().toISOString(),
            originatorFigure: r.OriginatorFigure,
            originatorName: 'Player',
            originatorPhone: 'remote',
            mine: false,
            status: 'settled',
            answeredFigure: r.AnsweringFigure,
            winner: matched ? 'answerer' : 'originator',
            pot: r.Pot,
            payout: r.Payout,
            seen: true,
          };
        });
        set({ cards: [...fromOpen, ...settled] });
      },
    }),
    {
      name: 'crowdstock-cards',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ cards: s.cards, bankroll: s.bankroll, seenSeed: s.seenSeed }),
      onRehydrateStorage: () => (state) => {
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
export function iWon(card: GameCard): boolean {
  if (card.status !== 'settled') return false;
  return card.mine ? card.winner === 'originator' : card.winner === 'answerer';
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

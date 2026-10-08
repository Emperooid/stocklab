import { callGateway } from './backendClient';

/**
 * CrowdStock Cards — the wire contract, exactly as specified:
 *
 *   SetCardFigure(Phone, Figure, Amount)              -> logs a Card
 *   ScoreCardFigure(CardID, phone2, Figure, Amount)   -> returns the Result
 *   GetOpenCardLists()                                -> cards awaiting an answer
 *   GetResultsList()                                  -> settled results
 *
 * The live gateway (backendClient.callGateway) currently exposes G10-G25,
 * B1-B3, BB, PP, UU and VV — none of these four. Rather than ship screens that
 * can't render, the app talks to `cardsApi`, which is either:
 *
 *   • the REMOTE implementation below (the four calls, using the literal
 *     endpoint names as gateway keys and the documented parameter names), or
 *   • the LOCAL implementation in store/cardsStore, which is the default.
 *
 * When the backend is ready, flip CARDS_API_REMOTE to true (or set
 * EXPO_PUBLIC_CARDS_API=remote) and adjust the four keys/params here if Mr Yemi
 * named them differently. Nothing outside this file needs to change.
 */
export const CARDS_API_REMOTE =
  (process.env.EXPO_PUBLIC_CARDS_API ?? 'local') === 'remote';

export interface RemoteCard {
  ID: string;
  Figure: number;
  Amount: number;
  Phone: string;
  Name?: string;
  CreatedAt?: string;
}

export interface RemoteResult {
  CardID: string;
  OriginatorFigure: number;
  AnsweringFigure: number;
  Winner: string;
  Pot: number;
  Payout: number;
}

export const remoteCardsApi = {
  /** 1. SetCardFigure(Phone, Figure, Amount) — logs the card, returns its id. */
  async setCardFigure(phone: string, figure: number, amount: number): Promise<{ CardID: string }> {
    return callGateway<{ CardID: string }>('SetCardFigure', { Phone: phone, Figure: figure, Amount: amount });
  },

  /** 2. ScoreCardFigure(CardID, phone2, Figure, Amount) — settles and returns the result. */
  async scoreCardFigure(
    cardId: string,
    phone2: string,
    figure: number,
    amount: number
  ): Promise<RemoteResult> {
    return callGateway<RemoteResult>('ScoreCardFigure', {
      CardID: cardId,
      phone2,
      Figure: figure,
      Amount: amount,
    });
  },

  /** 3. GetOpenCardLists() — cards still waiting for an answering user. */
  async getOpenCardLists(): Promise<RemoteCard[]> {
    const raw = await callGateway<any>('GetOpenCardLists', {});
    return Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
  },

  /** 4. GetResultsList() — settled results for the signed-in user. */
  async getResultsList(): Promise<RemoteResult[]> {
    const raw = await callGateway<any>('GetResultsList', {});
    return Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
  },
};

export type CardsApi = typeof remoteCardsApi;

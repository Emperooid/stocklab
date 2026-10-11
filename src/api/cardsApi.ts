import { callGateway, getSession } from './backendClient';

/**
 * CrowdStock Cards — CONFIRMED live theKeys (C1-C6), per the backend owner's
 * actual C# dispatch table:
 *
 *   if (theKey == "C1") SetCardValue(jsonData)            — create a card
 *   if (theKey == "C2") theGuessCardValue(jsonData)        — answer + score a card
 *   if (theKey == "C3") GetMyCards(jsonData)               — my own cards
 *   if (theKey == "C4") GetCardResultsAll()                — global results feed
 *   if (theKey == "C5") GetCardsResultByPhone(jsonData)    — results for one phone
 *   if (theKey == "C6") GetOpenCardsAvailable(jsonData)    — open cards to answer
 *
 * An earlier version of this file was built against the backend owner's FIRST,
 * informal description (literal theKeys "SetCardFigure"/"ScoreCardFigure"/
 * "GetOpenCardLists"/"GetResultsList") — those never matched the real gateway's
 * dispatch branches above and would have silently failed. This version uses the
 * real C1-C6 keys, confirmed directly against the dispatch table screenshot.
 *
 * CONFIRMED live (2026-10-09) against the real backend with account 09071929127:
 *   - C3/C4/C5/C6 all share one envelope: {status, message, count, data: []}
 *     (C5 additionally echoes back `Phone`).
 *   - C6 actually REQUIRES `Phone` despite the spec table saying "Required
 *     input: None" — tested empirically: {theKey:'C6'} and {theKey:'C6', phone}
 *     (lowercase) both returned {status:false, message:"Phone is required"};
 *     {theKey:'C6', Phone} (capital P) succeeded. Trust this over the doc.
 *   - C4 genuinely takes no params — tested with {} and it succeeded.
 *   - Every list call returned `data: []` — no card has ever been created on
 *     this backend yet, so the shape of one card/result record INSIDE `data`
 *     is NOT confirmed. The mapping in `store/cardsStore.ts` is a best-guess
 *     following the input-param casing (CardID/Phone/Amount/Figure) and must
 *     be corrected the first time a real card exists to inspect.
 *   - C1 (create) and C2 (answer) have NOT been called live — both move real
 *     money and the test account currently has ₦0 balance. Their request
 *     params below match the confirmed "Required input" table exactly; their
 *     response shapes are unconfirmed until tested with a funded account.
 */

export const CARDS_API_REMOTE = (process.env.EXPO_PUBLIC_CARDS_API ?? 'remote') === 'remote';

function requirePhone(): string {
  const session = getSession();
  if (!session) throw new Error('Not logged in.');
  return session.phone;
}

/** UNCONFIRMED per-record shape — no real card has existed yet to verify field names against. */
export type RemoteCardRecord = Record<string, any>;

export const remoteCardsApi = {
  /** C1 SetCardValue — creates a card with a hidden figure + stake. UNCONFIRMED response shape. */
  async setCardValue(figure: number, amount: number): Promise<RemoteCardRecord> {
    const phone = requirePhone();
    return callGateway<any>('C1', { Phone: phone, Amount: String(amount), Figure: String(figure) });
  },

  /** C2 theGuessCardValue — pays the stake, submits the answering figure, reveal+score in one call. UNCONFIRMED response shape. */
  async guessCardValue(cardId: string, figure: number, amount: number): Promise<RemoteCardRecord> {
    const phone = requirePhone();
    return callGateway<any>('C2', { CardID: cardId, Phone: phone, Amount: String(amount), Figure: String(figure) });
  },

  /** C3 GetMyCards(Phone) — the signed-in user's own cards, any status. */
  async getMyCards(): Promise<RemoteCardRecord[]> {
    const phone = requirePhone();
    const res = await callGateway<any>('C3', { Phone: phone });
    return Array.isArray(res?.data) ? res.data : [];
  },

  /** C4 GetCardResultsAll() — global settled-results feed, confirmed no params needed. */
  async getCardResultsAll(): Promise<RemoteCardRecord[]> {
    const res = await callGateway<any>('C4', {});
    return Array.isArray(res?.data) ? res.data : [];
  },

  /** C5 GetCardsResultByPhone(Phone) — settled results for one phone. */
  async getCardsResultByPhone(phone?: string): Promise<RemoteCardRecord[]> {
    const res = await callGateway<any>('C5', { Phone: phone ?? requirePhone() });
    return Array.isArray(res?.data) ? res.data : [];
  },

  /** C6 GetOpenCardsAvailable(Phone) — CONFIRMED Phone is required despite the spec table saying none. */
  async getOpenCardsAvailable(): Promise<RemoteCardRecord[]> {
    const phone = requirePhone();
    const res = await callGateway<any>('C6', { Phone: phone });
    return Array.isArray(res?.data) ? res.data : [];
  },
};

export type CardsApi = typeof remoteCardsApi;

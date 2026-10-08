/**
 * CrowdStock Cards — the card-duel game's own visual world.
 *
 * Deliberately NOT the stock-rounds palette: that game is cream paper + violet,
 * this one is a felt card table — deep navy, gold rims, magenta and cyan. It
 * stays dark in both app themes; entering Cards should feel like stepping into a
 * different room.
 */
export const cardGame = {
  /** Page + surface ramp. */
  background: '#1A1240',
  table: '#241A57',
  tableRaised: '#2E2368',
  tableDeep: '#150E36',
  rim: '#463A8F',
  rimSoft: '#372B75',

  /** Accents. */
  gold: '#F7B733',
  goldDeep: '#D9930F',
  magenta: '#FF3D8B',
  magentaDeep: '#E01F6E',
  cyan: '#4ADEDE',
  violet: '#8E72FF',

  /** Type. */
  text: '#F6F1FF',
  textMuted: '#B4A7E2',
  textDim: '#7E70B5',

  /** Semantics. */
  success: '#3DDC97',
  successDeep: '#189A63',
  danger: '#FF5B7F',
  dangerDeep: '#D62B52',

  /** Paper, for face-up cards and cream buttons. */
  cream: '#FFF6E6',
  creamDeep: '#E7D3BC',
  ink: '#150E36',
} as const;

export type CardGameColors = typeof cardGame;

export const cardRadius = {
  card: 16,
  chip: 12,
  panel: 22,
  pill: 999,
} as const;

/** Gold glow used on primary card-game surfaces. */
export function goldGlow(intensity = 0.36) {
  return {
    shadowColor: cardGame.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: intensity,
    shadowRadius: 18,
    elevation: 8,
  };
}

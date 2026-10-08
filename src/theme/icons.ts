import { ImageSourcePropType } from 'react-native';

/**
 * Every glyph in the app is a bundled PNG (see tools/gen_assets.py) — the app
 * ships no icon font. Two families:
 *
 *  • TINTED  — drawn as white silhouettes, recoloured at runtime with React
 *              Native's `tintColor` so one file works in light + dark mode and
 *              in any accent colour.
 *  • BRAND   — full-colour artwork (nav bar, rewards, empty states).
 */
export const TINTED_ICONS = {
  'chevron-right': require('../../assets/fun/chevron-right.png'),
  'chevron-left': require('../../assets/fun/chevron-left.png'),
  'chevron-up': require('../../assets/fun/chevron-up.png'),
  'chevron-down': require('../../assets/fun/chevron-down.png'),
  'close': require('../../assets/fun/close.png'),
  'check': require('../../assets/fun/check.png'),
  'search': require('../../assets/fun/search.png'),
  'plus': require('../../assets/fun/plus.png'),
  'minus': require('../../assets/fun/minus.png'),
  'eye': require('../../assets/fun/eye.png'),
  'eye-off': require('../../assets/fun/eye-off.png'),
  'copy': require('../../assets/fun/copy.png'),
  'info': require('../../assets/fun/info.png'),
  'alert': require('../../assets/fun/alert.png'),
  'help': require('../../assets/fun/help.png'),
  'moon': require('../../assets/fun/moon.png'),
  'sun': require('../../assets/fun/sun.png'),
  'bell-outline': require('../../assets/fun/bell-outline.png'),
  'clock': require('../../assets/fun/clock.png'),
  'lock': require('../../assets/fun/lock.png'),
  'phone': require('../../assets/fun/phone.png'),
  'mail': require('../../assets/fun/mail.png'),
  'user-outline': require('../../assets/fun/user-outline.png'),
  'logout': require('../../assets/fun/logout.png'),
  'card': require('../../assets/fun/card.png'),
  'doc': require('../../assets/fun/doc.png'),
  'swap': require('../../assets/fun/swap.png'),
  'refresh': require('../../assets/fun/refresh.png'),
  'filter': require('../../assets/fun/filter.png'),
  'compass': require('../../assets/fun/compass.png'),
  'location': require('../../assets/fun/location.png'),
  'bolt': require('../../assets/fun/bolt.png'),
  'flame': require('../../assets/fun/flame.png'),
  'bulb': require('../../assets/fun/bulb.png'),
  'people-outline': require('../../assets/fun/people-outline.png'),
  'gift-outline': require('../../assets/fun/gift-outline.png'),
  'arrow-up': require('../../assets/fun/arrow-up.png'),
  'arrow-down': require('../../assets/fun/arrow-down.png'),
  'arrow-right': require('../../assets/fun/arrow-right.png'),
  'deposit': require('../../assets/fun/deposit.png'),
  'withdraw': require('../../assets/fun/withdraw.png'),
  'send': require('../../assets/fun/send.png'),
  'trend-up': require('../../assets/fun/trend-up.png'),
  'trend-down': require('../../assets/fun/trend-down.png'),
  'trash': require('../../assets/fun/trash.png'),
  'tag': require('../../assets/fun/tag.png'),
  'heart': require('../../assets/fun/heart.png'),
  'star-outline': require('../../assets/fun/star-outline.png'),
  'megaphone': require('../../assets/fun/megaphone.png'),
  'bank-outline': require('../../assets/fun/bank-outline.png'),
  'shield-check': require('../../assets/fun/shield-check.png'),
  'wifi-off': require('../../assets/fun/wifi-off.png'),
  // Card-game navbar set — gold-on-navy masks.
  'home-outline': require('../../assets/fun/home-outline.png'),
  'cards-outline': require('../../assets/fun/cards-outline.png'),
  'trophy-outline': require('../../assets/fun/trophy-outline.png'),
} as const;

export const BRAND_ICONS = {
  home: require('../../assets/fun/home.png'),
  calendar: require('../../assets/fun/calendar.png'),
  stock: require('../../assets/fun/stock.png'),
  wallet: require('../../assets/fun/wallet.png'),
  profile: require('../../assets/fun/profile.png'),
  trophy: require('../../assets/fun/trophy.png'),
  gift: require('../../assets/fun/gift.png'),
  people: require('../../assets/fun/people.png'),
  coin: require('../../assets/fun/coin.png'),
  bank: require('../../assets/fun/bank.png'),
  shield: require('../../assets/fun/shield.png'),
  bell: require('../../assets/fun/bell.png'),
  medal: require('../../assets/fun/medal.png'),
  sparkle: require('../../assets/fun/sparkle-star.png'),
  crown: require('../../assets/fun/crown.png'),
  pot: require('../../assets/fun/pot.png'),
} as const;

/** Card-duel artwork — non-square (100 x 140 units), so it renders via <PlayingCard>. */
export const CARD_ART = {
  back: require('../../assets/fun/card-back.png'),
  face: require('../../assets/fun/card-face.png'),
} as const;

export const ILLUSTRATIONS = {
  hero: require('../../assets/fun/ill-hero.png'),
  win: require('../../assets/fun/ill-win.png'),
  empty: require('../../assets/fun/ill-empty.png'),
  cards: require('../../assets/fun/ill-cards.png'),
  // Lobby artwork
  wallet: require('../../assets/fun/ill-wallet.png'),
  person: require('../../assets/fun/ill-person.png'),
  phone: require('../../assets/fun/ill-phone.png'),
  crowd: require('../../assets/fun/ill-crowd.png'),
  cash: require('../../assets/fun/ill-cash.png'),
  invite: require('../../assets/fun/ill-invite.png'),
} as const;

export type TintedIconName = keyof typeof TINTED_ICONS;
export type BrandIconName = keyof typeof BRAND_ICONS;
export type IllustrationName = keyof typeof ILLUSTRATIONS;
export type IconName = TintedIconName | BrandIconName;

const TINTED_KEYS = new Set<string>(Object.keys(TINTED_ICONS));

export function iconSource(name: IconName): ImageSourcePropType {
  return (TINTED_ICONS as Record<string, ImageSourcePropType>)[name]
    ?? (BRAND_ICONS as Record<string, ImageSourcePropType>)[name];
}

export function isTinted(name: IconName): boolean {
  return TINTED_KEYS.has(name);
}

/** Brand icons are multi-coloured, so they carry their own default accent. */
export const BRAND_TINT: Record<BrandIconName, string> = {
  home: '#6D4AFF',
  calendar: '#2E9BFF',
  stock: '#00B39B',
  wallet: '#FF6B2C',
  profile: '#FF4D8D',
  trophy: '#FFB020',
  gift: '#FF4D8D',
  people: '#00B39B',
  coin: '#FFB020',
  bank: '#2E9BFF',
  shield: '#00B39B',
  bell: '#FFB020',
  medal: '#FFB020',
  sparkle: '#FF6B2C',
  crown: '#F7B733',
  pot: '#F7B733',
};

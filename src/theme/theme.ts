import { Dimensions, Platform } from 'react-native';
import { useThemeStore } from '../store/themeStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// iPhone 11/13 mini width — the baseline every scaled value is authored against.
const BASE_WIDTH = 375;

/** Scales a size linearly with screen width. */
export function scale(size: number): number {
  return Math.round((SCREEN_WIDTH / BASE_WIDTH) * size);
}

/** Scales a size toward the linear value by `factor` (0 = no scaling, 1 = full linear scaling). */
export function moderateScale(size: number, factor = 0.35): number {
  return Math.round(size + (scale(size) - size) * factor);
}

export const layout = {
  screenWidth: SCREEN_WIDTH,
  screenHeight: SCREEN_HEIGHT,
  isSmallDevice: SCREEN_WIDTH < 360,
  isTablet: SCREEN_WIDTH >= 600,
  /** Caps content width on tablets/large screens so cards don't stretch edge to edge. */
  contentMaxWidth: 520,
  /** Height of the fun bottom bar, excluding the device's safe-area inset. */
  tabBarHeight: 68,
};

/* ══════════════════════════════════════════════════════════════════════════
   COLOUR
   A warm, high-energy palette: cream paper instead of grey, a violet brand
   core (Cowrywise-ish) and tangerine / teal / amber / pink as the loud
   accents that make cards feel like stickers (Chowdeck-ish). Deliberately
   not the green of the reference mockups.
   ══════════════════════════════════════════════════════════════════════════ */

export const darkColors = {
  background: '#171130',
  surface: '#221A3F',
  surfaceAlt: '#2C2350',
  surfaceRaised: '#332A5C',
  border: '#3D3268',
  borderLight: '#4A3E7A',

  primary: '#8E72FF',
  primaryDark: '#7256F0',
  primaryTint: 'rgba(142, 114, 255, 0.20)',
  onPrimary: '#FFFFFF',

  accent: '#FF7A3D',
  accentDark: '#E85C1E',
  accentTint: 'rgba(255, 122, 61, 0.20)',
  onAccent: '#2A1004',

  text: '#FDF8FF',
  textMuted: '#C0B2E0',
  textDim: '#8C7DB4',

  success: '#3DDC97',
  successTint: 'rgba(61, 220, 151, 0.18)',
  danger: '#FF6B8A',
  dangerTint: 'rgba(255, 107, 138, 0.18)',
  warning: '#FFC44D',
  warningTint: 'rgba(255, 196, 77, 0.18)',

  purple: '#B79CFF',
  purpleTint: 'rgba(183, 156, 255, 0.18)',
  blue: '#5FB8FF',
  blueTint: 'rgba(95, 184, 255, 0.18)',

  teal: '#2ED9BE',
  tealTint: 'rgba(46, 217, 190, 0.18)',
  pink: '#FF6FA8',
  pinkTint: 'rgba(255, 111, 168, 0.18)',
  amber: '#FFC44D',
  amberTint: 'rgba(255, 196, 77, 0.18)',

  /** Ink used for outlines and hard "sticker" shadows. */
  ink: '#0E0A1E',
  cream: '#FFF3E4',
  overlay: 'rgba(10, 6, 24, 0.62)',
  /** Hero sweep — layered behind the balance card. */
  heroFrom: '#6D4AFF',
  heroTo: '#9B5BFF',
};

export const lightColors: Colors = {
  background: '#FFF8F1',
  surface: '#FFFFFF',
  surfaceAlt: '#FFF1E4',
  surfaceRaised: '#FFFFFF',
  border: '#F2E1D2',
  borderLight: '#FAEFE6',

  primary: '#6D4AFF',
  primaryDark: '#5738E0',
  primaryTint: 'rgba(109, 74, 255, 0.10)',
  onPrimary: '#FFFFFF',

  accent: '#FF6B2C',
  accentDark: '#E14E13',
  accentTint: 'rgba(255, 107, 44, 0.12)',
  onAccent: '#FFFFFF',

  text: '#2A1B12',
  textMuted: '#8A7266',
  textDim: '#B09C90',

  success: '#12A150',
  successTint: 'rgba(18, 161, 80, 0.12)',
  danger: '#F0353D',
  dangerTint: 'rgba(240, 53, 61, 0.10)',
  warning: '#E08700',
  warningTint: 'rgba(224, 135, 0, 0.12)',

  purple: '#7B55D9',
  purpleTint: 'rgba(123, 85, 217, 0.10)',
  blue: '#2E9BFF',
  blueTint: 'rgba(46, 155, 255, 0.12)',

  teal: '#00B39B',
  tealTint: 'rgba(0, 179, 155, 0.12)',
  pink: '#FF4D8D',
  pinkTint: 'rgba(255, 77, 141, 0.12)',
  amber: '#FFB020',
  amberTint: 'rgba(255, 176, 32, 0.14)',

  ink: '#2A1B12',
  cream: '#FFF3E4',
  overlay: 'rgba(42, 27, 18, 0.42)',
  heroFrom: '#6D4AFF',
  heroTo: '#A855F7',
};

export type Colors = typeof darkColors;

// Kept as a static export for legacy call sites, always the dark palette — see
// useColors() below for the reactive, theme-aware version every screen should use.
export const colors: Colors = darkColors;

/** The current theme's palette — reactive, re-renders the calling component when the mode toggles. */
export function useColors(): Colors {
  const mode = useThemeStore((s) => s.mode);
  return mode === 'light' ? lightColors : darkColors;
}

/** True when the app is in the light (cream) theme — used for art that can't carry a tint. */
export function useIsLight(): boolean {
  return useThemeStore((s) => s.mode) === 'light';
}

export const spacing = {
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(12),
  lg: moderateScale(16),
  xl: moderateScale(24),
  xxl: moderateScale(32),
  xxxl: moderateScale(44),
};

/** Chunkier than before — everything is a soft pebble. */
export const radius = {
  xs: 8,
  sm: 14,
  md: 18,
  lg: 24,
  xl: 30,
  xxl: 40,
  pill: 999,
};

/**
 * One vibrant palette per round slot (24 total) — each hour renders as a
 * distinct, saturated card. `accent` is the bold colour (index chip, borders),
 * `background` is its tint for the card body, and `ink` is the dark text colour
 * that stays readable on that tint regardless of the app's theme.
 */
export const ROUND_CARD_PALETTES = [
  { accent: '#FF6B2C', background: '#FFEBDF', border: '#FFC3A3', ink: '#5C2508' },
  { accent: '#6D4AFF', background: '#EDE8FF', border: '#BFAEFF', ink: '#2A175C' },
  { accent: '#00B39B', background: '#DEF8F3', border: '#8ADCCE', ink: '#06463C' },
  { accent: '#FF4D8D', background: '#FFE4EE', border: '#FFA9C6', ink: '#5C1233' },
  { accent: '#2E9BFF', background: '#E2F0FF', border: '#9DCBF7', ink: '#0B3357' },
  { accent: '#FFB020', background: '#FFF2D6', border: '#FFD584', ink: '#5C3D00' },
  { accent: '#12A150', background: '#E2F6EA', border: '#93D4AE', ink: '#0B4A25' },
  { accent: '#A855F7', background: '#F3E6FF', border: '#D2AAF7', ink: '#41135C' },
  { accent: '#FF8A00', background: '#FFF0DC', border: '#FFC97E', ink: '#5C3200' },
  { accent: '#0EA5E9', background: '#DFF4FE', border: '#8FD5F2', ink: '#0A3A52' },
  { accent: '#E03131', background: '#FFE5E5', border: '#F5A5A5', ink: '#5C0B0B' },
  { accent: '#14B8A6', background: '#DEFAF6', border: '#8ADCD3', ink: '#06453E' },
  { accent: '#F97316', background: '#FFEDE0', border: '#FFC29B', ink: '#5C2708' },
  { accent: '#6366F1', background: '#E8EAFF', border: '#B3B8F7', ink: '#1B1E5C' },
  { accent: '#EC4899', background: '#FFE6F2', border: '#F7A8CC', ink: '#5C0E38' },
  { accent: '#84CC16', background: '#F0FBDC', border: '#C6E88E', ink: '#33470A' },
  { accent: '#8B5CF6', background: '#F0E9FF', border: '#C5AAF7', ink: '#33115C' },
  { accent: '#06B6D4', background: '#DEF7FC', border: '#8AD8E8', ink: '#06414A' },
  { accent: '#F43F5E', background: '#FFE4E9', border: '#F7A3B2', ink: '#5C0C1C' },
  { accent: '#2563EB', background: '#E3EDFF', border: '#A0BDF7', ink: '#0B2A5C' },
  { accent: '#D946EF', background: '#FBE5FF', border: '#EBA8F7', ink: '#4A0B5C' },
  { accent: '#65A30D', background: '#F1FADB', border: '#C3E58A', ink: '#2E470A' },
  { accent: '#EA580C', background: '#FFEADF', border: '#F7BB9B', ink: '#5C2108' },
  { accent: '#4F46E5', background: '#E7E6FF', border: '#AFACF7', ink: '#19165C' },
] as const;

export const typography = {
  display: { fontSize: moderateScale(34), fontWeight: '900' as const, letterSpacing: -0.9 },
  h1: { fontSize: moderateScale(27), fontWeight: '900' as const, letterSpacing: -0.5 },
  h2: { fontSize: moderateScale(21), fontWeight: '800' as const, letterSpacing: -0.3 },
  h3: { fontSize: moderateScale(16.5), fontWeight: '800' as const, letterSpacing: -0.1 },
  body: { fontSize: moderateScale(14.5), fontWeight: '500' as const },
  small: { fontSize: moderateScale(12.5), fontWeight: '500' as const },
  tiny: { fontSize: moderateScale(11) },
  /** All-caps eyebrow labels. */
  label: { fontSize: moderateScale(10.5), fontWeight: '800' as const, letterSpacing: 1.1 },
};

/** Soft, wide, warm shadows. */
export const shadow = {
  sm: Platform.select({
    android: { elevation: 2 },
    default: { shadowColor: '#8A6A50', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
  }),
  md: Platform.select({
    android: { elevation: 4 },
    default: { shadowColor: '#8A6A50', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.13, shadowRadius: 14 },
  }),
  lg: Platform.select({
    android: { elevation: 9 },
    default: { shadowColor: '#8A6A50', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.18, shadowRadius: 26 },
  }),
};

/** Coloured glow for hero surfaces — pass the glow colour. */
export function glow(color: string) {
  return Platform.select({
    android: { elevation: 8 },
    default: { shadowColor: color, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.34, shadowRadius: 20 },
  });
}

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
};

/**
 * The app's brand green, sampled from the "Pick 1-5 Hourly" promoter artwork.
 *
 *   grass   - #00A820, that artwork's dominant background green. A true grass
 *             green with no blue in it. It also carries white text better than
 *             the old emerald did: 3.1:1 contrast versus 2.3:1.
 *   emerald - #10B981, the previous brand green, kept here so the entire app
 *             can be switched back by changing ACTIVE_BRAND alone.
 */
const BRAND_PALETTES = {
  grass: { primary: '#00A820', primaryDark: '#00801A', rgb: '0, 168, 32' },
  emerald: { primary: '#10B981', primaryDark: '#059669', rgb: '16, 185, 129' },
} as const;

/** Flip this one word to change the whole app's brand green. */
const ACTIVE_BRAND: keyof typeof BRAND_PALETTES = 'grass';
const BRAND = BRAND_PALETTES[ACTIVE_BRAND];

const brandPrimary: string = BRAND.primary;
const brandPrimaryDark: string = BRAND.primaryDark;
/** rgba() tint of the active brand green. */
const brandTint = (alpha: number): string => `rgba(${BRAND.rgb}, ${alpha})`;

export const darkColors = {
  background: '#10171A',
  surface: '#1A2226',
  surfaceAlt: '#212B30',
  surfaceRaised: '#263136',
  border: '#2C3739',
  borderLight: '#3A464A',
  primary: brandPrimary,
  primaryDark: brandPrimaryDark,
  onPrimary: '#FFFFFF',
  text: '#F3F6F5',
  textMuted: '#98A6A0',
  textDim: '#67746E',
  success: brandPrimary,
  successTint: brandTint(0.14),
  danger: '#F87171',
  dangerTint: 'rgba(248, 113, 113, 0.14)',
  warning: '#FBBF24',
  warningTint: 'rgba(251, 191, 36, 0.14)',
  primaryTint: brandTint(0.12),
  purple: '#A78BFA',
  purpleTint: 'rgba(167, 139, 250, 0.14)',
  blue: '#60A5FA',
  blueTint: 'rgba(96, 165, 250, 0.14)',
  cream: '#F3F6F5',
  ink: '#0B1412',
  overlay: 'rgba(0, 0, 0, 0.55)',
};

export const lightColors = {
  background: '#F5F8F6',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF3EF',
  surfaceRaised: '#FFFFFF',
  border: '#DCE5DF',
  borderLight: '#E8EFEA',
  primary: brandPrimary,
  primaryDark: brandPrimaryDark,
  onPrimary: '#FFFFFF',
  text: '#0F241A',
  textMuted: '#57685F',
  textDim: '#8C9A92',
  success: brandPrimary,
  successTint: brandTint(0.10),
  danger: '#DC2626',
  dangerTint: 'rgba(220, 38, 38, 0.08)',
  warning: '#B45309',
  warningTint: 'rgba(180, 83, 9, 0.09)',
  primaryTint: brandTint(0.10),
  purple: '#7C3AED',
  purpleTint: 'rgba(124, 58, 237, 0.10)',
  blue: '#2563EB',
  blueTint: 'rgba(37, 99, 235, 0.10)',
  cream: '#F5F8F6',
  ink: '#0F241A',
  overlay: 'rgba(15, 36, 26, 0.4)',
};

export type Colors = typeof darkColors;

// Kept as a static export for now, always the dark palette — see useColors()
// below for the reactive, theme-aware version every screen should use.
export const colors: Colors = darkColors;

/** The current theme's palette — reactive, re-renders the calling component when the mode toggles. */
export function useColors(): Colors {
  const mode = useThemeStore((s) => s.mode);
  return mode === 'light' ? lightColors : darkColors;
}

/** True when the app is in the light theme — used by art/graphics that can't carry a tint. */
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

export const radius = {
  xs: 8,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  xxl: 32,
  pill: 999,
};

/**
 * One vibrant palette per round slot (24 total) — each hour renders as a
 * distinct, saturated card. `accent` is the bold color (index chip, borders),
 * `background` is its light tint for the card body, and `ink` is the dark
 * text color that stays readable on that light background regardless of the
 * app's dark/light theme.
 */
export const ROUND_CARD_PALETTES = [
  { accent: '#E8590C', background: '#FFE8D9', border: '#F3B08C', ink: '#5C2E08' },
  { accent: '#0CA678', background: '#E3F7EE', border: '#84D5B5', ink: '#0B4A35' },
  { accent: '#E64980', background: '#FFE3EC', border: '#F3A3BE', ink: '#5C1530' },
  { accent: '#1C7ED6', background: '#E5F1FF', border: '#98C5F2', ink: '#0B3357' },
  { accent: '#7048E8', background: '#F0EBFF', border: '#BBA6F0', ink: '#2B165C' },
  { accent: '#F08C00', background: '#FFF0D6', border: '#F3C77E', ink: '#5C3200' },
  { accent: '#0CA678', background: '#E6FBF4', border: '#7CD8BC', ink: '#0B4A35' },
  { accent: '#E03131', background: '#FFE3E3', border: '#F2A0A0', ink: '#5C0B0B' },
  { accent: '#66A80F', background: '#F0F8D9', border: '#B8D67F', ink: '#2E4A05' },
  { accent: '#9C36B5', background: '#F7E9FF', border: '#D3A0E8', ink: '#3F1150' },
  { accent: '#1098AD', background: '#E3F8FB', border: '#84CDD9', ink: '#0A3C46' },
  { accent: '#D6336C', background: '#FFE6F0', border: '#F2A0C0', ink: '#5C0E2E' },
  { accent: '#E6A800', background: '#FFF6D9', border: '#F0D066', ink: '#5C4200' },
  { accent: '#3B5BDB', background: '#E8EDFF', border: '#A3B2F0', ink: '#16225C' },
  { accent: '#2F9E44', background: '#E9F8EC', border: '#92D5A4', ink: '#0B4A1D' },
  { accent: '#E85D5D', background: '#FFE8E8', border: '#F2A8A8', ink: '#5C1414' },
  { accent: '#5F3DC4', background: '#EFE9FF', border: '#B9A6F0', ink: '#24105C' },
  { accent: '#0B7285', background: '#E3F8F8', border: '#82CED2', ink: '#0A3A42' },
  { accent: '#E8590C', background: '#FFF0E6', border: '#F3B58E', ink: '#5C2A06' },
  { accent: '#1971C2', background: '#E7F2FF', border: '#96C2F0', ink: '#0B2E52' },
  { accent: '#A61E4D', background: '#FFE7F0', border: '#EFA2C0', ink: '#4A0B22' },
  { accent: '#5C940D', background: '#F1F8DE', border: '#BCD489', ink: '#2A4205' },
  { accent: '#E67700', background: '#FFF1DC', border: '#F2C07C', ink: '#5C3000' },
  { accent: '#4263EB', background: '#EAEEFF', border: '#A6B3F0', ink: '#18235C' },
] as const;

export const typography = {
  h1: { fontSize: moderateScale(28), fontWeight: '800' as const, letterSpacing: -0.3 },
  h2: { fontSize: moderateScale(20), fontWeight: '700' as const, letterSpacing: -0.2 },
  h3: { fontSize: moderateScale(16), fontWeight: '700' as const },
  body: { fontSize: moderateScale(14), fontWeight: '400' as const },
  small: { fontSize: moderateScale(12), fontWeight: '400' as const },
  tiny: { fontSize: moderateScale(11), fontWeight: '500' as const },
  /** All-caps eyebrow labels. */
  label: { fontSize: moderateScale(10.5), fontWeight: '800' as const, letterSpacing: 1.1 },
};

/** Cross-platform shadow presets — elevation on Android, shadow* on iOS/web. */
export const shadow = {
  sm: Platform.select({
    android: { elevation: 2 },
    default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.18, shadowRadius: 3 },
  }),
  md: Platform.select({
    android: { elevation: 5 },
    default: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 10 },
  }),
  lg: Platform.select({
    android: { elevation: 10 },
    default: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.28, shadowRadius: 20 },
  }),
};

/** Coloured glow for hero surfaces — pass the glow colour. */
export function glow(color: string) {
  return Platform.select({
    android: { elevation: 8 },
    default: { shadowColor: color, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 18 },
  });
}

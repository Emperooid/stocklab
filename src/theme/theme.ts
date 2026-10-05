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

export const darkColors = {
  background: '#0B0F1E',
  surface: '#151A2E',
  surfaceAlt: '#1D2440',
  surfaceRaised: '#232B4D',
  border: '#2B3357',
  borderLight: '#39426B',
  primary: '#7C6CFF',
  primaryDark: '#6A57F0',
  onPrimary: '#FFFFFF',
  text: '#F7F8FE',
  textMuted: '#A8B2CD',
  textDim: '#6F7A9B',
  success: '#34D99B',
  successTint: 'rgba(52, 217, 155, 0.16)',
  danger: '#FF5F7E',
  dangerTint: 'rgba(255, 95, 126, 0.16)',
  warning: '#FFB224',
  warningTint: 'rgba(255, 178, 36, 0.16)',
  primaryTint: 'rgba(124, 108, 255, 0.18)',
  purple: '#B892FF',
  purpleTint: 'rgba(184, 146, 255, 0.16)',
  blue: '#5EB6FF',
  blueTint: 'rgba(94, 182, 255, 0.16)',
  overlay: 'rgba(0, 0, 0, 0.55)',
};

export const lightColors = {
  background: '#F6F7FD',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF0FB',
  surfaceRaised: '#FFFFFF',
  border: '#E2E6F2',
  borderLight: '#ECEFF8',
  primary: '#6C5CFF',
  primaryDark: '#5A49E8',
  onPrimary: '#FFFFFF',
  text: '#151A2E',
  textMuted: '#5B6682',
  textDim: '#8B94AD',
  success: '#0CA678',
  successTint: 'rgba(12, 166, 120, 0.10)',
  danger: '#E54863',
  dangerTint: 'rgba(229, 72, 99, 0.10)',
  warning: '#B77900',
  warningTint: 'rgba(183, 121, 0, 0.10)',
  primaryTint: 'rgba(108, 92, 255, 0.10)',
  purple: '#7B55D9',
  purpleTint: 'rgba(123, 85, 217, 0.10)',
  blue: '#287CD1',
  blueTint: 'rgba(40, 124, 209, 0.10)',
  overlay: 'rgba(21, 26, 46, 0.4)',
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

export const spacing = {
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(12),
  lg: moderateScale(16),
  xl: moderateScale(24),
  xxl: moderateScale(32),
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
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

import { Dimensions, Platform } from 'react-native';
import { useThemeStore } from '../store/themeStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// iPhone 11/13 mini width — the baseline every scaled value is authored against.
const BASE_WIDTH = 375;

/** Scales a size linearly with screen width. */
export function scale(size: number): number {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
}

/**
 * Scales a size toward the linear value by `factor` (0 = no scaling, 1 = full linear scaling).
 *
 * CONFIRMED live: this fed a value like 16.403200000000002 (spacing.lg on a
 * 402pt-wide screen) into a `gap` style property, and crashed under the New
 * Architecture with "Exception in HostFunction: Loss of precision during
 * arithmetic conversion: (long long) 16.4032...". Fabric validates `gap`
 * more strictly than the long-established padding/margin properties, which
 * silently tolerate a fractional CGFloat — throwing instead of rounding a
 * non-integer flexbox gap. Rounded here, once, rather than at every
 * individual call site, since spacing/typography/every moderateScale() user
 * across the app was equally exposed to this on any screen width other
 * than the 375pt baseline.
 */
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
  background: '#080D1C',
  surface: '#10182B',
  surfaceAlt: '#17233D',
  surfaceRaised: '#202F50',
  border: '#263A5B',
  borderLight: '#3A5278',
  primary: '#4F8CFF',
  primaryDark: '#3478F6',
  onPrimary: '#FFFFFF',
  text: '#F5F8FF',
  textMuted: '#A8B6D0',
  textDim: '#7181A0',
  success: '#2DD4BF',
  successTint: 'rgba(45, 212, 191, 0.14)',
  danger: '#F87171',
  dangerTint: 'rgba(248, 113, 113, 0.14)',
  warning: '#FBBF24',
  warningTint: 'rgba(251, 191, 36, 0.14)',
  primaryTint: 'rgba(79, 140, 255, 0.14)',
  accent: '#A78BFA',
  accentTint: 'rgba(167, 139, 250, 0.16)',
  purple: '#C4B5FD',
  purpleTint: 'rgba(196, 181, 253, 0.14)',
  blue: '#60A5FA',
  blueTint: 'rgba(96, 165, 250, 0.14)',
  overlay: 'rgba(0, 0, 0, 0.55)',
};

export const lightColors = {
  background: '#F4F7FF',
  surface: '#FFFFFF',
  surfaceAlt: '#EDF2FC',
  surfaceRaised: '#FFFFFF',
  border: '#D9E2F2',
  borderLight: '#E8EEF9',
  primary: '#3478F6',
  primaryDark: '#245FCD',
  onPrimary: '#FFFFFF',
  text: '#111B32',
  textMuted: '#5B6B88',
  textDim: '#8997B0',
  success: '#0F9F91',
  successTint: 'rgba(15, 159, 145, 0.10)',
  danger: '#DC2626',
  dangerTint: 'rgba(220, 38, 38, 0.08)',
  warning: '#B45309',
  warningTint: 'rgba(180, 83, 9, 0.09)',
  primaryTint: 'rgba(52, 120, 246, 0.10)',
  accent: '#7C5CE6',
  accentTint: 'rgba(124, 92, 230, 0.11)',
  purple: '#6D4BD1',
  purpleTint: 'rgba(109, 75, 209, 0.10)',
  blue: '#2563EB',
  blueTint: 'rgba(37, 99, 235, 0.10)',
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

export const spacing = {
  xs: moderateScale(4),
  sm: moderateScale(8),
  md: moderateScale(12),
  lg: moderateScale(16),
  xl: moderateScale(24),
  xxl: moderateScale(32),
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

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

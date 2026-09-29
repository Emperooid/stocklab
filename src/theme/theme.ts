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
  // A softer slate rather than near-black — reduces the "heavy" feel of
  // the previous #0B0F0D/#121815 pairing without losing dark-mode contrast.
  background: '#10171A',
  surface: '#1A2226',
  surfaceAlt: '#212B30',
  surfaceRaised: '#263136',
  border: '#2C3739',
  borderLight: '#3A464A',
  // Deep enough emerald to keep WHITE legible on top of it — the lighter
  // #34D399 tried before this reads too washed-out with white text, which
  // is why onPrimary was dark instead. Matches the light theme's existing
  // primary, so both modes now use white-on-green consistently.
  primary: '#10B981',
  primaryDark: '#059669',
  onPrimary: '#FFFFFF',
  text: '#F3F6F5',
  textMuted: '#98A6A0',
  textDim: '#67746E',
  success: '#10B981',
  successTint: 'rgba(16, 185, 129, 0.14)',
  danger: '#F87171',
  dangerTint: 'rgba(248, 113, 113, 0.14)',
  warning: '#FBBF24',
  warningTint: 'rgba(251, 191, 36, 0.14)',
  primaryTint: 'rgba(16, 185, 129, 0.12)',
  purple: '#A78BFA',
  purpleTint: 'rgba(167, 139, 250, 0.14)',
  blue: '#60A5FA',
  blueTint: 'rgba(96, 165, 250, 0.14)',
  overlay: 'rgba(0, 0, 0, 0.55)',
};

export const lightColors = {
  background: '#F5F8F6',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF3EF',
  surfaceRaised: '#FFFFFF',
  border: '#DCE5DF',
  borderLight: '#E8EFEA',
  primary: '#10B981',
  primaryDark: '#059669',
  onPrimary: '#FFFFFF',
  text: '#0F241A',
  textMuted: '#57685F',
  textDim: '#8C9A92',
  success: '#10B981',
  successTint: 'rgba(16, 185, 129, 0.10)',
  danger: '#DC2626',
  dangerTint: 'rgba(220, 38, 38, 0.08)',
  warning: '#B45309',
  warningTint: 'rgba(180, 83, 9, 0.09)',
  primaryTint: 'rgba(16, 185, 129, 0.10)',
  purple: '#7C3AED',
  purpleTint: 'rgba(124, 58, 237, 0.10)',
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

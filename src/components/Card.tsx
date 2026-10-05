import { useMemo } from 'react';
import { StyleProp, StyleSheet, View, ViewProps, ViewStyle } from 'react-native';
import { withAlpha } from '../lib/color';
import { Colors, radius, shadow, spacing, useColors } from '../theme/theme';

export type CardTone =
  | 'surface'
  | 'alt'
  | 'primary'
  | 'accent'
  | 'teal'
  | 'pink'
  | 'amber'
  | 'success'
  | 'danger'
  | 'info'
  | 'hero';

interface CardProps extends ViewProps {
  /** Tinted body colour — the quickest way to make a card feel like a sticker. */
  tone?: CardTone;
  /** Soft rounded pebble (default) or a hard-shadow sticker with an ink outline. */
  variant?: 'soft' | 'sticker';
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

function toneColors(colors: Colors): Record<CardTone, { bg: string; border: string }> {
  return {
    surface: { bg: colors.surface, border: colors.border },
    alt: { bg: colors.surfaceAlt, border: colors.border },
    primary: { bg: colors.primaryTint, border: withAlpha(colors.primary, 0.28) },
    accent: { bg: colors.accentTint, border: withAlpha(colors.accent, 0.28) },
    teal: { bg: colors.tealTint, border: withAlpha(colors.teal, 0.28) },
    pink: { bg: colors.pinkTint, border: withAlpha(colors.pink, 0.28) },
    amber: { bg: colors.amberTint, border: withAlpha(colors.amber, 0.32) },
    success: { bg: colors.successTint, border: withAlpha(colors.success, 0.28) },
    danger: { bg: colors.dangerTint, border: withAlpha(colors.danger, 0.28) },
    info: { bg: colors.blueTint, border: withAlpha(colors.blue, 0.28) },
    hero: { bg: colors.primary, border: colors.primaryDark },
  };
}

/**
 * The app's base surface. Soft cards are rounded pebbles with a hairline tinted
 * border; sticker cards add a hard offset shadow and a bold outline for hero
 * moments.
 */
export function Card({ style, children, tone = 'surface', variant = 'soft', padded = true, ...rest }: CardProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { bg, border } = toneColors(colors)[tone];

  if (variant === 'sticker') {
    const depth = 5;
    return (
      <View style={[styles.stickerWrap, { paddingBottom: depth, paddingRight: depth }, style]} {...rest}>
        <View pointerEvents="none" style={[styles.stickerBase, { top: depth, left: depth, backgroundColor: withAlpha(colors.ink, 0.9) }]} />
        <View style={[styles.card, padded && styles.padded, { backgroundColor: bg, borderColor: border, borderWidth: 2 }]}>
          {children}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, padded && styles.padded, { backgroundColor: bg, borderColor: border }, style]} {...rest}>
      {children}
    </View>
  );
}

function createStyles(_colors: Colors) {
  return StyleSheet.create({
    card: {
      borderRadius: radius.xl,
      borderWidth: 1,
      ...shadow.md,
    },
    padded: { padding: spacing.lg },
    stickerWrap: { position: 'relative' },
    stickerBase: { position: 'absolute', right: 0, bottom: 0, borderRadius: radius.xl, opacity: 0.14 },
  });
}

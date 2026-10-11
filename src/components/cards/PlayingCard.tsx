import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, radius, useColors, glow } from '../../theme/theme';
import { shade } from '../../lib/colorMath';
import { formatMoney } from '../../lib/format';

/** Portrait ratio of a playing card (5 : 7). */
export const CARD_RATIO = 1.4;

/**
 * hidden   — someone else's card: the figure is a secret, shown as "?"
 * picked   — YOUR card, still unanswered: you know the figure, so it is shown
 * revealed — both figures are public after the reveal
 */
type CardState = 'hidden' | 'picked' | 'revealed';

interface PlayingCardProps {
  amount: number;
  /** Card width in points; height is derived. */
  size?: number;
  /** Face up with the figure revealed to everyone. */
  revealed?: boolean;
  /** The figure to show when `revealed`. */
  figure?: number;
  /**
   * YOUR hidden pick. Shows the number (only you can see it) instead of a "?".
   * Ignored when `revealed` is set.
   */
  picked?: number;
  selected?: boolean;
  dimmed?: boolean;
  onPress?: () => void;
  /** Caption under the card, e.g. "Figure 1". */
  caption?: string;
  /**
   * Overrides the state chip. On the reveal BOTH cards are face-up, but they
   * mean different things: the originator STORED a figure, the answering player
   * REVEALED their guess. Same face, different role.
   */
  chipLabel?: string;
  chipIcon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}

/**
 * A single card, drawn to read like a real one: gradient stock, a hairline
 * inner frame, corner pips and a centre medallion. The stake is always printed
 * across the bottom, and the figure appears in the middle — as "?" when it's
 * somebody else's secret, or as the number once it's yours or revealed.
 */
export function PlayingCard({
  amount,
  size = 92,
  revealed = false,
  figure,
  picked,
  selected = false,
  dimmed = false,
  onPress,
  caption,
  chipLabel,
  chipIcon,
  style,
}: PlayingCardProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const height = size * CARD_RATIO;

  // Figures are 1-5, so a 0 (or a missing one) means "not known" — e.g. cards
  // created before the hidden figure was remembered locally. Treat it as hidden
  // rather than printing a bogus 0 on the card face.
  const known = (n?: number) => (typeof n === 'number' && n > 0 ? n : undefined);
  const state: CardState = revealed ? 'revealed' : known(picked) != null ? 'picked' : 'hidden';
  const shown = state === 'revealed' ? known(figure) : known(picked);
  const faceUp = state !== 'hidden';
  // Corner pips and the status chip need room; below this the card is a chip.
  const roomy = size >= 72;

  const tone = state === 'revealed' ? colors.primary : state === 'picked' ? colors.blue : colors.primary;
  const chip =
    chipLabel != null
      ? { label: chipLabel, icon: chipIcon ?? ('eye' as keyof typeof Ionicons.glyphMap) }
      : state === 'revealed'
        ? { label: 'REVEALED', icon: 'eye' as const }
        : state === 'picked'
          ? { label: 'YOUR PICK', icon: 'lock-closed' as const }
          : { label: 'HIDDEN', icon: 'help' as const };

  // Small cards can't fit "₦1,000.00" — drop the decimals rather than truncate.
  const stakeLabel = roomy ? formatMoney(amount) : `₦${Math.round(amount).toLocaleString()}`;

  const pipText = <Text style={[styles.pipNum, { fontSize: size * 0.155, color: tone }]}>{shown ?? '?'}</Text>;

  const body = (
    <View
      style={[
        styles.card,
        { width: size, height, paddingBottom: size * (roomy ? 0.26 : 0.2) },
        selected && styles.cardSelected,
        dimmed && styles.cardDimmed,
      ]}
    >
      <LinearGradient
        colors={faceUp ? [colors.cream, shade(colors.cream, -0.08)] : [colors.surfaceRaised, shade(colors.surface, -0.05)]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* hairline frame, inset like a printed card border */}
      <View
        pointerEvents="none"
        style={[styles.innerFrame, { borderRadius: Math.max(6, radius.lg - 5), borderColor: tone + (faceUp ? '2E' : '26') }]}
      />

      {roomy && (
        <>
          <View style={[styles.pip, styles.pipTL]}>
            {pipText}
            <View style={[styles.pipDot, { backgroundColor: tone }]} />
          </View>
          <View style={[styles.pip, styles.pipBR, { bottom: size * 0.21 + 12 }]}>
            <Text style={[styles.pipNum, { fontSize: size * 0.155, color: tone, transform: [{ rotate: '180deg' }] }]}>
              {shown ?? '?'}
            </Text>
            <View style={[styles.pipDot, { backgroundColor: tone }]} />
          </View>
        </>
      )}

      <View style={styles.center}>
        <View
          style={[
            styles.medallion,
            { width: size * 0.54, height: size * 0.54, borderRadius: size * 0.27 },
            faceUp
              ? { backgroundColor: colors.surface, borderColor: tone, borderWidth: 2.5 }
              : { backgroundColor: colors.primaryTint, borderColor: colors.primary, borderWidth: 2 },
          ]}
        >
          {faceUp ? (
            <Text style={[styles.figure, { fontSize: size * 0.34, color: tone }]}>{shown ?? '—'}</Text>
          ) : (
            <Text style={[styles.figure, { fontSize: size * 0.32, color: colors.primary }]}>?</Text>
          )}
        </View>

        {roomy && (
          <View
            style={[
              styles.chip,
              { borderColor: tone + '55', backgroundColor: faceUp ? colors.surface : colors.primaryTint },
            ]}
          >
            <Ionicons name={chip.icon} size={Math.max(9, size * 0.078)} color={tone} />
            <Text style={[styles.chipText, { color: tone, fontSize: Math.max(8, size * 0.08) }]}>{chip.label}</Text>
          </View>
        )}
      </View>

      <View style={[styles.amountBar, { backgroundColor: faceUp ? colors.ink : colors.overlay }]}>
        <Text
          style={[styles.amountText, { fontSize: Math.max(9, size * 0.13), color: faceUp ? colors.cream : colors.primary }]}
          numberOfLines={1}
        >
          {stakeLabel}
        </Text>
      </View>
    </View>
  );

  const wrapped = onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => [pressed && { transform: [{ scale: 0.97 }] }]}>
      {body}
    </Pressable>
  ) : (
    body
  );

  if (!caption) return <View style={style}>{wrapped}</View>;

  return (
    <View style={[styles.withCaption, style]}>
      {wrapped}
      <Text style={styles.caption} numberOfLines={1}>
        {caption}
      </Text>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    card: {
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      borderWidth: 2,
      borderColor: colors.primary,
      backgroundColor: colors.surface,
      ...glow(colors.primary),
    },
    cardSelected: { borderColor: colors.blue, borderWidth: 3 },
    cardDimmed: { opacity: 0.45 },

    innerFrame: { position: 'absolute', top: 6, left: 6, right: 6, bottom: 6, borderWidth: 1 },

    center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    medallion: { alignItems: 'center', justifyContent: 'center' },
    figure: { fontWeight: '900', includeFontPadding: false },

    pip: { position: 'absolute', alignItems: 'center', gap: 2 },
    pipTL: { top: 8, left: 9 },
    // The stake bar spans the bottom, so the lower pip is lifted just clear of it.
    pipBR: { right: 9 },
    pipNum: { fontWeight: '900', includeFontPadding: false },
    pipDot: { width: 4, height: 4, borderRadius: 2, opacity: 0.7 },

    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderRadius: radius.pill,
      paddingHorizontal: 7,
      paddingVertical: 3,
      marginTop: 8,
    },
    chipText: { fontWeight: '900', letterSpacing: 0.6 },

    amountBar: {
      position: 'absolute',
      left: 6,
      right: 6,
      bottom: 6,
      borderRadius: radius.sm,
      paddingVertical: 5,
      alignItems: 'center',
    },
    amountText: { fontWeight: '900' },

    withCaption: { alignItems: 'center' },
    caption: { marginTop: 8, color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  });
}

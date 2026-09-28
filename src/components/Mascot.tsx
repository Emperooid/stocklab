import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, radius, spacing, typography, useColors } from '../theme/theme';

/** Warm coin-gold, not a semantic theme token — this is the mascot's own
 * fixed identity color, meant to read as "a coin" in both light and dark
 * mode, not something that should shift with the app's green accent. */
const COIN_GOLD = '#F4B740';
const COIN_GOLD_DARK = '#8A6115';

/**
 * A small, friendly recurring character for the pre-login flow (intro
 * slides, welcome screen, sign up, log in) — a talking coin with a short,
 * plain-language line of guidance next to it. Product goal: this app's
 * primary audience is small shop owners, many with limited smartphone
 * experience, so every one of these screens should feel like a person
 * showing them what to do next rather than a form asking them for input.
 */
export function Mascot({ message, size = 56 }: { message: string; size?: number }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      <View style={[styles.face, { width: size, height: size, borderRadius: size / 2 }]}>
        <View style={styles.eyesRow}>
          <View style={styles.eye} />
          <View style={styles.eye} />
        </View>
        <View style={styles.smile} />
      </View>
      <View style={styles.bubble}>
        <Text style={styles.bubbleText}>{message}</Text>
      </View>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
    face: {
      backgroundColor: COIN_GOLD,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: COIN_GOLD_DARK,
    },
    eyesRow: { flexDirection: 'row', gap: 8, marginBottom: 3 },
    eye: { width: 5, height: 5, borderRadius: 3, backgroundColor: COIN_GOLD_DARK },
    smile: {
      width: 16,
      height: 8,
      borderBottomLeftRadius: 8,
      borderBottomRightRadius: 8,
      borderWidth: 2,
      borderTopWidth: 0,
      borderColor: COIN_GOLD_DARK,
    },
    bubble: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.lg,
      borderTopLeftRadius: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      marginTop: spacing.xs,
    },
    bubbleText: { ...typography.body, color: colors.text, lineHeight: 20 },
  });
}

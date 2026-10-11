import { useMemo } from 'react';
import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { Colors, radius, useColors } from '../../theme/theme';

interface CardPanelProps {
  children: React.ReactNode;
  /** Small all-caps overline above the title. */
  eyebrow?: string;
  title?: string;
  /** Tinted background instead of the standard surface. */
  tone?: 'table' | 'deep' | 'gold' | 'magenta' | 'cyan';
  style?: StyleProp<ViewStyle>;
}

function getTones(colors: Colors): Record<NonNullable<CardPanelProps['tone']>, { bg: string; border: string }> {
  return {
    table: { bg: colors.surface, border: colors.border },
    deep: { bg: colors.surfaceAlt, border: colors.borderLight },
    // "gold" is a panel variant name (winnings/prize panels), not a literal
    // reference to the brand color — it should read as gold/amber, not green.
    gold: { bg: colors.warningTint, border: colors.warning },
    magenta: { bg: colors.purpleTint, border: colors.purple },
    cyan: { bg: colors.blueTint, border: colors.blue },
  };
}

/** Rounded panel — the card game's answer to <Card>. */
export function CardPanel({ children, eyebrow, title, tone = 'table', style }: CardPanelProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const t = getTones(colors)[tone];
  return (
    <View style={[styles.panel, { backgroundColor: t.bg, borderColor: t.border }, style]}>
      {!!eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
      {!!title && <Text style={styles.title}>{title}</Text>}
      {children}
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    panel: { borderRadius: radius.xl, borderWidth: 1, padding: 16 },
    eyebrow: { color: colors.textDim, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.1 },
    title: { color: colors.text, fontSize: 17, fontWeight: '900', marginTop: 2, marginBottom: 4 },
  });
}

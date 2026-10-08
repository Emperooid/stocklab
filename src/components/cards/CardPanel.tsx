import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { cardGame, cardRadius } from '../../theme/cardsTheme';

interface CardPanelProps {
  children: React.ReactNode;
  /** Small all-caps overline above the title. */
  eyebrow?: string;
  title?: string;
  /** Tinted background instead of the standard table surface. */
  tone?: 'table' | 'deep' | 'gold' | 'magenta' | 'cyan';
  style?: StyleProp<ViewStyle>;
}

const TONES: Record<NonNullable<CardPanelProps['tone']>, { bg: string; border: string }> = {
  table: { bg: cardGame.table, border: cardGame.rim },
  deep: { bg: cardGame.tableDeep, border: cardGame.rimSoft },
  gold: { bg: 'rgba(247,183,51,0.14)', border: 'rgba(247,183,51,0.42)' },
  magenta: { bg: 'rgba(255,61,139,0.14)', border: 'rgba(255,61,139,0.42)' },
  cyan: { bg: 'rgba(74,222,222,0.12)', border: 'rgba(74,222,222,0.4)' },
};

/** Rounded felt panel — the card game's answer to <Card>. */
export function CardPanel({ children, eyebrow, title, tone = 'table', style }: CardPanelProps) {
  const t = TONES[tone];
  return (
    <View style={[styles.panel, { backgroundColor: t.bg, borderColor: t.border }, style]}>
      {!!eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
      {!!title && <Text style={styles.title}>{title}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { borderRadius: cardRadius.panel, borderWidth: 1, padding: 16 },
  eyebrow: { color: cardGame.textDim, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: cardGame.text, fontSize: 17, fontWeight: '900', marginTop: 2, marginBottom: 4 },
});

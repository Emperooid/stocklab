import { Image, Pressable, StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { AppIcon } from '../AppIcon';
import { CARD_ART } from '../../theme/icons';
import { cardGame, cardRadius, goldGlow } from '../../theme/cardsTheme';
import { formatMoney } from '../../lib/format';

/** Portrait ratio of the card artwork (100 x 140 units). */
export const CARD_RATIO = 1.4;

interface PlayingCardProps {
  amount: number;
  /** Card width in points; height is derived. */
  size?: number;
  /** Face up, showing the figure. */
  revealed?: boolean;
  figure?: number;
  selected?: boolean;
  dimmed?: boolean;
  onPress?: () => void;
  /** Caption under the card, e.g. "Figure 1". */
  caption?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * One card. Face down it's the navy artwork with the stake printed across the
 * bottom; face up it flips to cream and shows the figure.
 */
export function PlayingCard({
  amount,
  size = 92,
  revealed = false,
  figure,
  selected = false,
  dimmed = false,
  onPress,
  caption,
  style,
}: PlayingCardProps) {
  const height = size * CARD_RATIO;

  const body = (
    <View
      style={[
        styles.card,
        { width: size, height },
        revealed ? styles.cardUp : styles.cardDown,
        selected && styles.cardSelected,
        dimmed && styles.cardDimmed,
      ]}
    >
      {revealed ? (
        <>
          <Text style={[styles.figure, { fontSize: size * 0.46 }]}>{figure ?? '—'}</Text>
          <View style={styles.captionRow}>
            <AppIcon name="check" size={11} color={cardGame.goldDeep} />
          </View>
        </>
      ) : (
        <Image source={CARD_ART.back} style={StyleSheet.absoluteFill} resizeMode="stretch" />
      )}

      <View style={[styles.amountBar, revealed && styles.amountBarUp]}>
        <Text style={[styles.amountText, { fontSize: size * 0.135 }, revealed && styles.amountTextUp]} numberOfLines={1}>
          {formatMoney(amount)}
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

const styles = StyleSheet.create({
  card: {
    borderRadius: cardRadius.card,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cardDown: { backgroundColor: cardGame.table, borderWidth: 2, borderColor: cardGame.gold, ...goldGlow(0.22) },
  cardUp: { backgroundColor: cardGame.cream, borderWidth: 2, borderColor: cardGame.gold },
  cardSelected: { borderColor: cardGame.cyan, borderWidth: 3, ...goldGlow(0.3) },
  cardDimmed: { opacity: 0.45 },
  figure: { color: cardGame.goldDeep, fontWeight: '900', includeFontPadding: false },
  captionRow: { position: 'absolute', top: 8, right: 8 },
  amountBar: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 6,
    borderRadius: cardRadius.chip,
    paddingVertical: 5,
    alignItems: 'center',
    backgroundColor: 'rgba(21,14,54,0.82)',
  },
  amountBarUp: { backgroundColor: cardGame.ink },
  amountText: { color: cardGame.gold, fontWeight: '900' },
  amountTextUp: { color: cardGame.cream },
  withCaption: { alignItems: 'center' },
  caption: { marginTop: 8, color: cardGame.textMuted, fontSize: 12, fontWeight: '800' },
});

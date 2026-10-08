import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../AppIcon';
import { cardGame, cardRadius } from '../../theme/cardsTheme';

interface CardFlowHeaderProps {
  title: string;
  /** Small overline above the title, e.g. "STEP 2 OF 3". */
  step?: string;
  onBack?: () => void;
  /** Replaces the back button — e.g. a close button on a result screen. */
  closeIcon?: 'chevron-left' | 'close';
  /** Small gold text action on the right. */
  actionLabel?: string;
  onAction?: () => void;
}

/** Navy header used by the card game's pushed flow screens. */
export function CardFlowHeader({
  title,
  step,
  onBack,
  closeIcon = 'chevron-left',
  actionLabel,
  onAction,
}: CardFlowHeaderProps) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onBack}
        hitSlop={10}
        accessibilityLabel="Go back"
        style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}
      >
        <AppIcon name={closeIcon} size={19} color={cardGame.gold} />
      </Pressable>

      <View style={{ flex: 1, minWidth: 0 }}>
        {!!step && <Text style={styles.step}>{step}</Text>}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      {!!actionLabel && !!onAction && (
        <Pressable onPress={onAction} hitSlop={8} style={styles.action}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  back: {
    width: 42,
    height: 42,
    borderRadius: cardRadius.chip,
    borderWidth: 1.5,
    borderColor: cardGame.rim,
    backgroundColor: cardGame.tableDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  step: { color: cardGame.textDim, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: cardGame.text, fontSize: 20, fontWeight: '900', marginTop: 1 },
  action: { paddingVertical: 6, paddingHorizontal: 4 },
  actionText: { color: cardGame.gold, fontSize: 13, fontWeight: '900' },
});

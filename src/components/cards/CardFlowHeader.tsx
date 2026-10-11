import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, radius, useColors } from '../../theme/theme';

interface CardFlowHeaderProps {
  title: string;
  /** Small overline above the title, e.g. "STEP 2 OF 3". */
  step?: string;
  onBack?: () => void;
  /** Replaces the back button — e.g. a close button on a result screen. */
  closeIcon?: 'chevron-left' | 'close';
  /** Small accent text action on the right. */
  actionLabel?: string;
  onAction?: () => void;
}

const CLOSE_ICONS: Record<NonNullable<CardFlowHeaderProps['closeIcon']>, keyof typeof Ionicons.glyphMap> = {
  'chevron-left': 'chevron-back',
  close: 'close',
};

/** Header used by the card game's pushed flow screens. */
export function CardFlowHeader({
  title,
  step,
  onBack,
  closeIcon = 'chevron-left',
  actionLabel,
  onAction,
}: CardFlowHeaderProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      <Pressable
        onPress={onBack}
        hitSlop={10}
        accessibilityLabel="Go back"
        style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}
      >
        <Ionicons name={CLOSE_ICONS[closeIcon]} size={19} color={colors.primary} />
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

function createStyles(colors: Colors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    back: {
      width: 42,
      height: 42,
      borderRadius: radius.sm,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    step: { color: colors.textDim, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.1 },
    title: { color: colors.text, fontSize: 20, fontWeight: '900', marginTop: 1 },
    action: { paddingVertical: 6, paddingHorizontal: 4 },
    actionText: { color: colors.primary, fontSize: 13, fontWeight: '900' },
  });
}

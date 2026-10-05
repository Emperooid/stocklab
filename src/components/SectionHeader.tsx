import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { AppIcon } from './AppIcon';
import { spacing, typography, useColors } from '../theme/theme';

interface SectionHeaderProps {
  title: string;
  /** Small overline above the title. */
  eyebrow?: string;
  actionLabel?: string;
  onAction?: () => void;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function SectionHeader({ title, eyebrow, actionLabel, onAction, right, style }: SectionHeaderProps) {
  const colors = useColors();
  return (
    <View style={[styles.row, style]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        {!!eyebrow && <Text style={[styles.eyebrow, { color: colors.textDim }]}>{eyebrow}</Text>}
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
      </View>
      {right}
      {!!actionLabel && !!onAction && (
        <Pressable onPress={onAction} hitSlop={8} style={styles.action}>
          <Text style={[styles.actionText, { color: colors.primary }]}>{actionLabel}</Text>
          <AppIcon name="chevron-right" size={13} color={colors.primary} style={{ marginLeft: 1 }} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xl, marginBottom: spacing.md },
  eyebrow: { ...typography.label, marginBottom: 2 },
  title: { ...typography.h2 },
  action: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingLeft: spacing.sm },
  actionText: { ...typography.small, fontWeight: '800' },
});

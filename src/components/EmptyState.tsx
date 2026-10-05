import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Illustration, IllustrationName } from './AppIcon';
import { IconBubble } from './IconBubble';
import { IconName } from '../theme/icons';
import { spacing, typography, useColors } from '../theme/theme';

interface EmptyStateProps {
  /** Picture icon shown in the bubble. */
  icon?: IconName;
  /** Larger artwork instead of the icon bubble. */
  illustration?: IllustrationName;
  title: string;
  message?: string;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function EmptyState({ icon = 'compass', illustration, title, message, children, style }: EmptyStateProps) {
  const colors = useColors();
  return (
    <View style={[styles.wrap, style]}>
      {illustration ? (
        <Illustration name={illustration} size={132} style={{ marginBottom: spacing.md }} />
      ) : (
        <IconBubble name={icon} size={76} iconSize={36} color={colors.primary} style={{ marginBottom: spacing.md }} />
      )}
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {!!message && <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  title: { ...typography.h3, textAlign: 'center' },
  message: { ...typography.small, textAlign: 'center', marginTop: spacing.xs, maxWidth: 280, lineHeight: 19 },
});

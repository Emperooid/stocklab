import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/theme';

export type BadgeTone = 'success' | 'danger' | 'warning' | 'primary' | 'neutral' | 'info';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
}

const TONE_STYLES: Record<BadgeTone, { bg: string; fg: string }> = {
  success: { bg: colors.successTint, fg: colors.success },
  danger: { bg: colors.dangerTint, fg: colors.danger },
  warning: { bg: colors.warningTint, fg: colors.warning },
  primary: { bg: colors.primaryTint, fg: colors.primary },
  info: { bg: colors.blueTint, fg: colors.blue },
  neutral: { bg: colors.surfaceAlt, fg: colors.textMuted },
};

export function Badge({ label, tone = 'neutral' }: BadgeProps) {
  const { bg, fg } = TONE_STYLES[tone];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  text: { ...typography.tiny, fontWeight: '700' },
});

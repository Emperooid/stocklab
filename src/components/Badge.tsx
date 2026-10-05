import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { IconName } from '../theme/icons';
import { withAlpha } from '../lib/color';
import { Colors, radius, spacing, typography, useColors } from '../theme/theme';

export type BadgeTone = 'success' | 'danger' | 'warning' | 'primary' | 'neutral' | 'info' | 'accent' | 'teal' | 'pink';

interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: IconName;
  size?: 'md' | 'sm';
}

function toneStyles(colors: Colors): Record<BadgeTone, { bg: string; fg: string; border: string }> {
  return {
    success: { bg: colors.successTint, fg: colors.success, border: withAlpha(colors.success, 0.26) },
    danger: { bg: colors.dangerTint, fg: colors.danger, border: withAlpha(colors.danger, 0.26) },
    warning: { bg: colors.warningTint, fg: colors.warning, border: withAlpha(colors.warning, 0.3) },
    primary: { bg: colors.primaryTint, fg: colors.primary, border: withAlpha(colors.primary, 0.26) },
    info: { bg: colors.blueTint, fg: colors.blue, border: withAlpha(colors.blue, 0.26) },
    accent: { bg: colors.accentTint, fg: colors.accent, border: withAlpha(colors.accent, 0.26) },
    teal: { bg: colors.tealTint, fg: colors.teal, border: withAlpha(colors.teal, 0.26) },
    pink: { bg: colors.pinkTint, fg: colors.pink, border: withAlpha(colors.pink, 0.26) },
    neutral: { bg: colors.surfaceAlt, fg: colors.textMuted, border: colors.border },
  };
}

export function Badge({ label, tone = 'neutral', icon, size = 'md' }: BadgeProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { bg, fg, border } = toneStyles(colors)[tone];
  const compact = size === 'sm';
  return (
    <View style={[styles.badge, compact && styles.badgeSm, { backgroundColor: bg, borderColor: border }]}>
      {!!icon && <AppIcon name={icon} size={compact ? 11 : 13} color={fg} style={{ marginRight: 4 }} />}
      <Text style={[styles.text, compact && styles.textSm, { color: fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function createStyles(_colors: Colors) {
  return StyleSheet.create({
    badge: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 5,
      borderRadius: radius.pill,
      borderWidth: 1,
    },
    badgeSm: { paddingHorizontal: spacing.sm, paddingVertical: 2 },
    text: { ...typography.tiny, fontWeight: '800', letterSpacing: 0.2 },
    textSm: { fontSize: typography.tiny.fontSize - 0.5 },
  });
}

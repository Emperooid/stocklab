import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { useNow } from '../hooks/useNow';
import { formatCountdown, getNextBoundary } from '../lib/schedule';
import { Colors, radius, spacing, typography, useColors } from '../theme/theme';
import { withAlpha } from '../lib/color';

/**
 * Countdown to the next round boundary, drawn as a warm "ticker" strip with a
 * picture clock rather than a flat badge.
 */
export function CountdownBadge() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const now = useNow(1000);
  const next = getNextBoundary(now);

  if (!next) {
    return (
      <View style={[styles.wrap, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        <View style={[styles.iconWrap, { backgroundColor: withAlpha(colors.textMuted, 0.16) }]}>
          <AppIcon name="moon" size={20} color={colors.textMuted} />
        </View>
        <Text style={[styles.note, { color: colors.textMuted }]}>No more rounds today — see you tomorrow!</Text>
      </View>
    );
  }

  const remaining = next.at.getTime() - now.getTime();
  const verb = next.kind === 'open' ? 'opens' : 'settles';

  return (
    <View style={[styles.wrap, { backgroundColor: colors.amberTint, borderColor: withAlpha(colors.amber, 0.34) }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.amber }]}>
        <AppIcon name="clock" size={20} color="#FFFFFF" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.overline, { color: colors.textMuted }]}>
          ROUND {next.slot.index} {verb.toUpperCase()} IN
        </Text>
        <Text style={[styles.countdown, { color: colors.text }]}>{formatCountdown(remaining)}</Text>
      </View>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    wrap: {
      borderRadius: radius.lg,
      borderWidth: 1,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    iconWrap: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    overline: { ...typography.label, fontSize: typography.label.fontSize - 0.5 },
    note: { ...typography.body, fontWeight: '700' },
    countdown: { ...typography.h2, fontVariant: ['tabular-nums'], marginTop: 1 },
  });
}

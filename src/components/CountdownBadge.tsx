import { StyleSheet, Text, View } from 'react-native';
import { useNow } from '../hooks/useNow';
import { formatCountdown, getNextBoundary } from '../lib/schedule';
import { colors, radius, spacing, typography } from '../theme/theme';

export function CountdownBadge() {
  const now = useNow(1000);
  const next = getNextBoundary(now);

  if (!next) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.label}>No more rounds today</Text>
      </View>
    );
  }

  const remaining = next.at.getTime() - now.getTime();
  const verb = next.kind === 'open' ? 'opens' : 'settles';

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        Round {next.slot.index} {verb} in
      </Text>
      <Text style={styles.countdown}>{formatCountdown(remaining)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { ...typography.small, color: colors.textMuted },
  countdown: { ...typography.h3, color: colors.primary, fontVariant: ['tabular-nums'] },
});

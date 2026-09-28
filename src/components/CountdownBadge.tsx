import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNow } from '../hooks/useNow';
import { formatCountdown, getNextBoundary } from '../lib/schedule';
import { Colors, radius, spacing, typography, useColors } from '../theme/theme';

export function CountdownBadge() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const now = useNow(1000);
  const next = getNextBoundary(now);

  if (!next) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.label}>All auctions are closed for today</Text>
      </View>
    );
  }

  const remaining = next.at.getTime() - now.getTime();
  const verb = next.kind === 'open' ? 'opens' : 'closes';

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        Auction {verb} in
      </Text>
      <Text style={styles.countdown}>{formatCountdown(remaining)}</Text>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
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
}

import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, radius, spacing, typography, useColors } from '../theme/theme';
import { useAutoPlayStore } from '../store/autoPlayStore';
import { valueColor } from './PredictionControl';

/**
 * Read-only per-round Auto Play summary — shows whatever figure is
 * currently saved for this round, or that it's off. No switch, no figure
 * picker here anymore: Auto Play is a recurring per-round setting (set once,
 * it plays every day until changed), so editing it belongs in one place —
 * AutoPlaySetupModal — not scattered across an interactive control on every
 * round's card that only ever reflected today's view of a not-really-daily
 * setting.
 */
export function RoundAutoPlayControl({ roundId }: { roundId: string }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const loaded = useAutoPlayStore((s) => s.loaded);
  const config = useAutoPlayStore((s) => s.getSlotConfig(roundId));

  if (!loaded) return null;

  if (!config.enabled) {
    return (
      <View style={styles.row}>
        <Ionicons name="flash-outline" size={14} color={colors.textDim} />
        <Text style={styles.offText}>Automatic bidding is off for this auction</Text>
      </View>
    );
  }

  const color = valueColor(colors, config.figure);
  return (
    <View style={styles.row}>
      <Ionicons name="flash" size={14} color={colors.primary} />
      <Text style={styles.onText} numberOfLines={1}>
        Automatic bidding — bids in recurring auctions
      </Text>
      <View style={[styles.figureBadge, { borderColor: color, backgroundColor: color }]}>
        <Text style={[styles.figureBadgeText, { color: colors.onPrimary }]}>{config.figure}</Text>
      </View>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
    offText: { ...typography.small, color: colors.textDim },
    onText: { ...typography.small, color: colors.text, fontWeight: '600', flex: 1, minWidth: 0 },
    figureBadge: {
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    figureBadgeText: { ...typography.small, fontWeight: '800' },
  });
}

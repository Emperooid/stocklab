import { useMemo } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Colors, radius, spacing, typography, useColors } from '../theme/theme';
import { useAutoPlayStore } from '../store/autoPlayStore';

/**
 * Per-round Auto Play row — a toggle, and nothing else.
 *
 * It used to carry its own 1-5 figure picker directly beneath this. On a round
 * card that put two identical-looking rows of 1-5 one above the other: the
 * auto-play figure, then the round's real figure. Picking a number for the
 * round meant reading past a row that looked exactly like the answer, so the
 * picker is gone from here.
 *
 * The auto-play figure is still set from the Auto Play panel at the top of the
 * Predict screen, so nothing is lost — the round card keeps only its switch.
 *
 * Disabled once the round's already been played, since Auto Play for it is moot
 * at that point. Renders nothing until `slots` has loaded from the server (A2),
 * to avoid a flash of the default {enabled: false} before the real value loads.
 */
export function RoundAutoPlayControl({
  roundId,
  disabled,
  vibrant,
}: {
  roundId: string;
  disabled: boolean;
  /** Sits on the saturated round-card gradient instead of the app's normal surface. */
  vibrant?: boolean;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const loaded = useAutoPlayStore((s) => s.loaded);
  const config = useAutoPlayStore((s) => s.getSlotConfig(roundId));
  const setSlotEnabled = useAutoPlayStore((s) => s.setSlotEnabled);

  if (!loaded) return null;

  return (
    <View style={vibrant ? styles.vWrap : styles.wrap}>
      <View style={styles.topRow}>
        <Text style={[styles.label, { color: vibrant ? '#FFFFFF' : colors.text }]} numberOfLines={1}>
          Auto Play
        </Text>
        <Switch
          value={config.enabled}
          onValueChange={(v) => setSlotEnabled(roundId, v).catch(() => {})}
          disabled={disabled}
          trackColor={{
            false: vibrant ? 'rgba(255,255,255,0.3)' : colors.border,
            true: vibrant ? '#0E9F57' : colors.primary,
          }}
          thumbColor={vibrant ? '#FFFFFF' : colors.text}
        />
      </View>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    wrap: { marginBottom: spacing.lg },
    vWrap: {
      backgroundColor: 'rgba(255,255,255,0.16)',
      borderRadius: radius.md,
      padding: spacing.sm + 2,
      marginBottom: spacing.lg,
    },
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    label: { ...typography.body, fontWeight: '700' },
  });
}

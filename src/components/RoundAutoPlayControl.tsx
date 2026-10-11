import { useMemo } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Colors, radius, spacing, typography, useColors } from '../theme/theme';
import { useAutoPlayStore } from '../store/autoPlayStore';

/**
 * Per-round Auto Play row — a toggle, and the figure it is armed with.
 *
 * It used to carry its own 1-5 figure picker beneath this. On a round card that
 * put two identical-looking rows of 1-5 one above the other: the auto-play
 * figure, then the round's real figure. Picking a number for the round meant
 * reading past a row that looked exactly like the answer, so the picker is gone.
 * The figure is now shown next to the label, read-only, so the state stays
 * visible without offering a second choice; setting it lives in the "Figure per
 * Round" panel at the top of the Predict screen.
 *
 * Disabled once the round's already been played, since Auto Play for it is moot
 * at that point. Renders nothing until `slots` has loaded from the server (A2),
 * to avoid a flash of the default {enabled: false, figure: 3} before the real
 * value arrives.
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

  const chipTextColor = vibrant ? '#FFFFFF' : colors.primary;

  return (
    <View style={vibrant ? styles.vWrap : styles.wrap}>
      <View style={styles.topRow}>
        <View style={styles.labelGroup}>
          <Text style={[styles.label, { color: vibrant ? '#FFFFFF' : colors.text }]} numberOfLines={1}>
            Auto Play
          </Text>
          <View
            style={[vibrant ? styles.vFigureChip : styles.figureChip, !config.enabled && styles.figureChipOff]}
          >
            <Text style={[styles.figureChipText, { color: chipTextColor }]} numberOfLines={1}>
              {config.figure}
            </Text>
          </View>
        </View>
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
    topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    // flex + minWidth so a long label truncates instead of pushing the switch off.
    labelGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flex: 1, minWidth: 0 },
    label: { ...typography.body, fontWeight: '700', flexShrink: 1 },

    figureChip: {
      minWidth: 26,
      height: 24,
      paddingHorizontal: 7,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primaryTint,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    vFigureChip: {
      minWidth: 26,
      height: 24,
      paddingHorizontal: 7,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.26)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.5)',
    },
    // Armed-but-off should read as inactive without hiding which figure is set.
    figureChipOff: { opacity: 0.45 },
    figureChipText: { fontSize: 13, fontWeight: '900' },
  });
}

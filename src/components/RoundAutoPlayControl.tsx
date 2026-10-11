import { useMemo } from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Colors, radius, spacing, typography, useColors } from '../theme/theme';
import { useAutoPlayStore } from '../store/autoPlayStore';

const FIGURES = [1, 2, 3, 4, 5];
const INK = '#1B1540';

/**
 * Per-round Auto Play row — toggle on top, then a direct 1-5 figure picker
 * below (tap a number to pick it, no dropdown). Disabled once the round's
 * already been played, since Auto Play for it is moot at that point. Renders
 * nothing until `slots` has loaded from the server (A2), to avoid a flash of
 * the default {enabled: false, figure: 3} before the real saved value loads.
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
  const setSlotFigure = useAutoPlayStore((s) => s.setSlotFigure);

  if (!loaded) return null;

  const isInteractive = !disabled;
  const labelColor = vibrant ? '#FFFFFF' : colors.text;
  const wrapStyle = vibrant ? styles.vWrap : styles.wrap;

  return (
    <View style={wrapStyle}>
      <View style={styles.topRow}>
        <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>
          Auto Play
        </Text>
        <Switch
          value={config.enabled}
          onValueChange={(v) => setSlotEnabled(roundId, v).catch(() => {})}
          disabled={!isInteractive}
          trackColor={{ false: vibrant ? 'rgba(255,255,255,0.3)' : colors.border, true: vibrant ? '#0E9F57' : colors.primary }}
          thumbColor={vibrant ? '#FFFFFF' : colors.text}
        />
      </View>

      <Text style={[styles.figureLabel, { color: vibrant ? 'rgba(255,255,255,0.8)' : colors.textMuted }]}>
        FIGURE TO AUTO-PLAY
      </Text>
      <View style={styles.tilesRow}>
        {FIGURES.map((v) => {
          const selected = v === config.figure;
          return (
            <TouchableOpacity
              key={v}
              disabled={!isInteractive}
              onPress={() => setSlotFigure(roundId, v).catch(() => {})}
              style={[
                vibrant ? styles.vTile : styles.tile,
                selected && (vibrant ? styles.vTileSelected : styles.tileSelected),
                !isInteractive && { opacity: 0.5 },
              ]}
            >
              <Text
                style={[
                  vibrant ? styles.vTileText : styles.tileText,
                  selected && { color: vibrant ? INK : colors.onPrimary },
                ]}
              >
                {v}
              </Text>
            </TouchableOpacity>
          );
        })}
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
    figureLabel: { ...typography.tiny, fontWeight: '800', letterSpacing: 0.5, marginTop: spacing.sm, marginBottom: spacing.xs },
    tilesRow: { flexDirection: 'row', gap: spacing.xs },
    tile: {
      flex: 1,
      height: 36,
      borderRadius: radius.sm,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tileSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    tileText: { ...typography.body, color: colors.text, fontWeight: '700' },
    vTile: {
      flex: 1,
      height: 36,
      borderRadius: radius.sm,
      borderWidth: 1.5,
      borderColor: 'rgba(255,255,255,0.4)',
      backgroundColor: 'rgba(255,255,255,0.14)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    vTileSelected: { backgroundColor: '#FFFFFF', borderColor: '#FFFFFF' },
    vTileText: { ...typography.body, color: '#FFFFFF', fontWeight: '700' },
  });
}

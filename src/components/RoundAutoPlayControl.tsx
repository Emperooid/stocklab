import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { IconBubble } from './IconBubble';
import { withAlpha } from '../lib/color';
import { Colors, radius, shadow, spacing, typography, useColors } from '../theme/theme';
import { useAutoPlayStore } from '../store/autoPlayStore';

const FIGURES = [1, 2, 3, 4, 5];

/**
 * Full-width per-round Auto Play row — toggle + figure picker, sitting below a
 * round's header. Renders nothing until `slots` has loaded from the server so
 * there's no flash of the default {enabled: false, figure: 3}.
 */
export function RoundAutoPlayControl({ roundId, disabled }: { roundId: string; disabled: boolean }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const loaded = useAutoPlayStore((s) => s.loaded);
  const config = useAutoPlayStore((s) => s.getSlotConfig(roundId));
  const setSlotEnabled = useAutoPlayStore((s) => s.setSlotEnabled);
  const setSlotFigure = useAutoPlayStore((s) => s.setSlotFigure);
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!loaded) return null;

  const isInteractive = !disabled;

  return (
    <View style={[styles.row, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      <View style={styles.side}>
        <IconBubble
          name="bolt"
          size={36}
          iconSize={18}
          color={config.enabled ? colors.primary : colors.textDim}
          background={config.enabled ? withAlpha(colors.primary, 0.16) : colors.surface}
        />
        <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
          Auto Play
        </Text>
        <Switch
          value={config.enabled}
          onValueChange={(v) => setSlotEnabled(roundId, v).catch(() => {})}
          disabled={!isInteractive}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={'#FFFFFF'}
        />
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.side}>
        <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
          Figure
        </Text>
        <TouchableOpacity
          disabled={!isInteractive}
          onPress={() => setPickerOpen(true)}
          style={[
            styles.figureBox,
            {
              backgroundColor: colors.surface,
              borderColor: isInteractive ? colors.primary : colors.border,
            },
            !isInteractive && { opacity: 0.6 },
          ]}
        >
          <Text style={[styles.figureValue, { color: colors.text }]}>{config.figure}</Text>
          <AppIcon name="chevron-down" size={13} color={isInteractive ? colors.text : colors.textDim} />
        </TouchableOpacity>
      </View>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={() => setPickerOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: colors.surface }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.sheetTitle, { color: colors.textMuted }]}>AUTO PLAY FIGURE</Text>
            <View style={styles.sheetGrid}>
              {FIGURES.map((v) => {
                const active = v === config.figure;
                return (
                  <TouchableOpacity
                    key={v}
                    style={[
                      styles.sheetTile,
                      {
                        backgroundColor: active ? colors.primary : colors.surfaceAlt,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                    onPress={() => {
                      setSlotFigure(roundId, v).catch(() => {});
                      setPickerOpen(false);
                    }}
                  >
                    <Text style={[styles.sheetTileText, { color: active ? '#FFFFFF' : colors.text }]}>{v}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radius.md,
      borderWidth: 1,
      padding: spacing.sm + 2,
      marginBottom: spacing.lg,
    },
    // minWidth: 0 overrides RN's default flex-shrink floor, which is what let a
    // long label push the figure box past the screen edge.
    side: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    divider: { width: 1, height: 32, marginHorizontal: spacing.sm },
    label: { ...typography.small, fontWeight: '800', flexShrink: 1 },
    figureBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      borderRadius: radius.sm,
      borderWidth: 2,
      paddingHorizontal: spacing.md,
      height: 38,
      flexShrink: 0,
    },
    figureValue: { ...typography.body, fontWeight: '800' },
    backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    sheet: { borderRadius: radius.xl, padding: spacing.lg, width: 280, ...shadow.lg },
    sheetTitle: { ...typography.label, marginBottom: spacing.md },
    sheetGrid: { flexDirection: 'row', gap: spacing.sm },
    sheetTile: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: radius.sm,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sheetTileText: { ...typography.h3 },
  });
}

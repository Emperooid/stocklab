import { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, radius, spacing, typography, useColors } from '../theme/theme';
import { useAutoPlayStore } from '../store/autoPlayStore';

const FIGURES = [1, 2, 3, 4, 5];

/**
 * Full-width per-round Auto Play row — toggle + figure picker, sitting
 * below a round's header (per the agreed design: "Auto Play" + switch on
 * the left, "Auto Play Figure" dropdown on the right, divided by a
 * vertical rule). Disabled once the round's already been played, since
 * Auto Play for it is moot at that point. Renders nothing until `slots` has
 * loaded from the server (A2), to avoid a flash of the default {enabled:
 * false, figure: 3} before the real saved value loads.
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
    <View style={styles.row}>
      <View style={styles.side}>
        <Text style={styles.label} numberOfLines={1}>
          Auto Play
        </Text>
        <Switch
          value={config.enabled}
          onValueChange={(v) => setSlotEnabled(roundId, v).catch(() => {})}
          disabled={!isInteractive}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.text}
        />
      </View>

      <View style={styles.divider} />

      <View style={styles.side}>
        <Text style={styles.label} numberOfLines={1}>
          Figure
        </Text>
        <TouchableOpacity
          disabled={!isInteractive}
          onPress={() => setPickerOpen(true)}
          style={[styles.figureBox, !isInteractive && styles.figureBoxDisabled]}
        >
          <Text style={styles.figureValue}>{config.figure}</Text>
          <Ionicons name="chevron-down" size={14} color={isInteractive ? colors.text : colors.textDim} />
        </TouchableOpacity>
      </View>

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.sheet}>
            <Text style={styles.sheetTitle}>Auto Play Figure</Text>
            {FIGURES.map((v) => (
              <TouchableOpacity
                key={v}
                style={styles.sheetRow}
                onPress={() => {
                  setSlotFigure(roundId, v).catch(() => {});
                  setPickerOpen(false);
                }}
              >
                <Text style={styles.sheetRowText}>{v}</Text>
                {v === config.figure && <Ionicons name="checkmark" size={18} color={colors.primary} />}
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg },
    // minWidth: 0 overrides RN's default flex-shrink floor (a flex child
    // otherwise refuses to shrink below its content's natural width), which
    // is what let a long label push the figure box past the screen edge
    // instead of the label just truncating.
    side: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    divider: { width: 1, height: 32, backgroundColor: colors.border, marginHorizontal: spacing.sm },
    label: { ...typography.body, color: colors.text, fontWeight: '700', flexShrink: 1 },
    figureBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.primary,
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: spacing.md,
      height: 40,
      flexShrink: 0,
    },
    figureBoxDisabled: { borderColor: colors.border, opacity: 0.6 },
    figureValue: { ...typography.body, color: colors.text, fontWeight: '700' },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    sheet: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, width: 220 },
    sheetTitle: { ...typography.small, color: colors.textMuted, fontWeight: '700', marginBottom: spacing.sm },
    sheetRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    sheetRowText: { ...typography.body, color: colors.text },
  });
}

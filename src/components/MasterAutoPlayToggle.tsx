import { useMemo } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Card } from './Card';
import { Colors, spacing, typography, useColors } from '../theme/theme';
import { useAutoPlayStore } from '../store/autoPlayStore';
import { ROUND_SLOTS } from '../lib/schedule';

/**
 * Master "turn every round's Auto Play on/off at once" toggle, via
 * UU_Universal — sits above the per-round RoundAutoPlayControl list.
 * Reflects ON only when every round is currently enabled: a plain Switch
 * has no honest way to show a partial/mixed state, so "all on" is the only
 * state that reads as ON here, matching a standard "select all" checkbox.
 */
export function MasterAutoPlayToggle() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const loaded = useAutoPlayStore((s) => s.loaded);
  const slots = useAutoPlayStore((s) => s.slots);
  const setAllEnabled = useAutoPlayStore((s) => s.setAllEnabled);

  if (!loaded) return null;

  const allEnabled = ROUND_SLOTS.every((slot) => slots[slot.id]?.enabled);

  return (
    <Card style={styles.card}>
      <View style={{ flex: 1, marginRight: spacing.md }}>
        <Text style={styles.title}>Auto Play — All Rounds</Text>
        <Text style={styles.subtitle}>Turn every round's Auto Play on or off at once.</Text>
      </View>
      <Switch
        value={allEnabled}
        onValueChange={(v) => setAllEnabled(v).catch(() => {})}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={colors.text}
      />
    </Card>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    card: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg },
    title: { ...typography.body, color: colors.text, fontWeight: '700' },
    subtitle: { ...typography.tiny, color: colors.textMuted, marginTop: 2, lineHeight: 15 },
  });
}

import { StyleSheet, Switch, Text, View } from 'react-native';
import { Card } from './Card';
import { IconBubble } from './IconBubble';
import { spacing, typography, useColors } from '../theme/theme';
import { useAutoPlayStore } from '../store/autoPlayStore';
import { ROUND_SLOTS } from '../lib/schedule';

/**
 * Master "turn every round's Auto Play on/off at once" toggle, via
 * UU_Universal — sits above the per-round RoundAutoPlayControl list.
 */
export function MasterAutoPlayToggle() {
  const colors = useColors();
  const loaded = useAutoPlayStore((s) => s.loaded);
  const slots = useAutoPlayStore((s) => s.slots);
  const setAllEnabled = useAutoPlayStore((s) => s.setAllEnabled);

  if (!loaded) return null;

  const allEnabled = ROUND_SLOTS.every((slot) => slots[slot.id]?.enabled);

  return (
    <Card tone="primary" style={styles.card}>
      <IconBubble name="bolt" size={46} iconSize={24} color={colors.primary} background={colors.surface} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.title, { color: colors.text }]}>Auto Play — all rounds</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Turn every round's Auto Play on or off at once.
        </Text>
      </View>
      <Switch
        value={allEnabled}
        onValueChange={(v) => setAllEnabled(v).catch(() => {})}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor={'#FFFFFF'}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  title: { ...typography.body, fontWeight: '800' },
  subtitle: { ...typography.tiny, marginTop: 2, lineHeight: 15 },
});

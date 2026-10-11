import { useMemo } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { Card } from './Card';
import { Colors, spacing, typography, useColors } from '../theme/theme';
import { useAutoPlayStore } from '../store/autoPlayStore';
import { getErrorMessage } from '../lib/validation';
import { ROUND_SLOTS } from '../lib/schedule';

/**
 * Master "turn every round's Auto Play on/off at once" toggle, via
 * UU_Universal — sits above the per-round RoundAutoPlayControl list.
 * Reflects ON only when every tracked round is enabled: a plain Switch has no
 * honest way to show a partial/mixed state, so "all on" is the only state that
 * reads as ON here, matching a standard "select all" checkbox. "Tracked" means
 * the rounds the backend returns an Auto Play record for — see the note on
 * `allEnabled` for why counting all 24 was wrong.
 */
export function MasterAutoPlayToggle() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const loaded = useAutoPlayStore((s) => s.loaded);
  const slots = useAutoPlayStore((s) => s.slots);
  const setAllEnabled = useAutoPlayStore((s) => s.setAllEnabled);

  if (!loaded) return null;

  // Count only the rounds the backend actually tracks. A2 returns one record per
  // round it can play — live, that is 8..23 (round 18 absent), and 0..7 have no
  // record at all because they settled before Auto Play was ever armed. Demanding
  // all 24 made this read OFF with every armed round genuinely on, which is the
  // whole of "Auto Play turns itself off after a refresh" — the settings were
  // saved and returned correctly the entire time; this switch was lying.
  const tracked = ROUND_SLOTS.filter((slot) => slots[slot.id] != null);
  const allEnabled = tracked.length > 0 && tracked.every((slot) => slots[slot.id]?.enabled);

  return (
    <Card style={styles.card}>
      <View style={{ flex: 1, marginRight: spacing.md }}>
        <Text style={styles.title}>Auto Play — All Rounds</Text>
        <Text style={styles.subtitle}>Turn every round's Auto Play on or off at once.</Text>
      </View>
      <Switch
        value={allEnabled}
        onValueChange={(v) =>
            setAllEnabled(v).catch((e) =>
              // This used to be swallowed, so a rejected A1/UU looked exactly like
              // a successful save until the next A2 quietly put the toggle back —
              // which reads as "Auto Play turns itself off", with no reason shown.
              Alert.alert('Could not save Auto Play', getErrorMessage(e, 'Please try again.'))
            )
          }
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

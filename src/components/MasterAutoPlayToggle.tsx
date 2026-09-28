import { useMemo } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { Card } from './Card';
import { Colors, spacing, typography, useColors } from '../theme/theme';
import { useAutoPlayStore } from '../store/autoPlayStore';
import { ROUND_SLOTS } from '../lib/schedule';
import { getErrorMessage } from '../lib/validation';

/**
 * Auto Play status + master kill switch — sits above the per-round
 * RoundAutoPlayControl list. Reflects ON as soon as ANY round is enabled,
 * not only when literally every round is (an earlier version required all
 * 24, which meant picking just a handful of rounds via the setup modal left
 * this looking permanently off — confusing, since "some rounds are active"
 * reads as Auto Play being on to anyone using it, not as it being off).
 *
 * Turning it ON opens the setup modal (onRequestSetup) instead of flipping
 * straight to "all rounds, whatever figure they last had" — enabling Auto
 * Play in bulk without picking figures first isn't a useful state to land
 * in. The switch itself doesn't optimistically flip on in that case; it
 * stays reflecting real state until the modal's own Save actually enables
 * something. Turning OFF pauses every round at once via UU — the fast way
 * to stop everything without opening the modal and clearing each one by
 * hand. The separate "Set up figures for specific rounds" link
 * (PredictScreen) opens the same modal on demand, for changing things later
 * without needing to toggle this switch off and on again.
 */
export function MasterAutoPlayToggle({ onRequestSetup }: { onRequestSetup: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const loaded = useAutoPlayStore((s) => s.loaded);
  const slots = useAutoPlayStore((s) => s.slots);
  const setAllEnabled = useAutoPlayStore((s) => s.setAllEnabled);

  if (!loaded) return null;

  const enabledCount = ROUND_SLOTS.filter((slot) => slots[slot.id]?.enabled).length;
  const someEnabled = enabledCount > 0;

  return (
    <Card style={styles.card}>
      <View style={{ flex: 1, marginRight: spacing.md }}>
        <Text style={styles.title}>Automatic Bidding</Text>
        <Text style={styles.subtitle}>
          {someEnabled
            ? `Active for ${enabledCount} of ${ROUND_SLOTS.length} auctions.`
            : 'Off — choose which auctions to bid on automatically.'}
        </Text>
      </View>
      <Switch
        value={someEnabled}
        onValueChange={(v) => {
          if (v) {
            onRequestSetup();
            return;
          }
          setAllEnabled(false).catch((e) => {
            // CONFIRMED: this used to fail silently (bare .catch(() => {})),
            // which meant the switch flipped optimistically, the save
            // failed, and the store's own rollback quietly reverted it with
            // zero indication why — reading as "Auto Play randomly turns
            // itself off." Now the user actually finds out.
            Alert.alert('Could not update automatic bidding', getErrorMessage(e, 'Please try again.'));
          });
        }}
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

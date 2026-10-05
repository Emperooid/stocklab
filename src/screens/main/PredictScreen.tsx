import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { CountdownBadge } from '../../components/CountdownBadge';
import { EmptyState } from '../../components/EmptyState';
import { IconBubble } from '../../components/IconBubble';
import { PredictionControl } from '../../components/PredictionControl';
import { RoundAutoPlayControl } from '../../components/RoundAutoPlayControl';
import { MasterAutoPlayToggle } from '../../components/MasterAutoPlayToggle';
import { Colors, radius, spacing, typography, useColors, ROUND_CARD_PALETTES } from '../../theme/theme';
import { withAlpha } from '../../lib/color';
import { useRoundsStore } from '../../store/roundsStore';
import { useAuthStore } from '../../store/authStore';
import { useAutoPlayStore } from '../../store/autoPlayStore';
import { useRoundsLiveRefresh } from '../../hooks/useRoundsLiveRefresh';
import { getSlotStatus } from '../../lib/schedule';
import { formatTime12h } from '../../lib/format';

export default function PredictScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { rounds, fetchRounds, submitPrediction } = useRoundsStore();
  const slotAmount = useAuthStore((s) => s.user?.slotAmount);
  const loadAutoPlayFromServer = useAutoPlayStore((s) => s.loadFromServer);
  const [refreshing, setRefreshing] = useState(false);
  const now = useRoundsLiveRefresh();

  useFocusEffect(
    useCallback(() => {
      fetchRounds().catch(() => {});
      loadAutoPlayFromServer().catch(() => {});
    }, [])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([fetchRounds(), loadAutoPlayFromServer().catch(() => {})]);
    setRefreshing(false);
  }

  // A round accepts a stock pick any time before it settles — not just
  // during its own hour — so this lists every unsettled round today, not
  // just whichever one happens to be "open" right now.
  const openRounds = rounds
    .filter((r) => getSlotStatus(r.slot, now) !== 'settled')
    .sort((a, b) => a.slot.index - b.slot.index);

  return (
    <Screen refreshing={refreshing} onRefresh={handleRefresh}>
      {/* ── Bold header band ─────────────────────────────────────────────── */}
      <View style={styles.heroHeader}>
        <IconBubble name="stock" size={56} iconSize={30} color={colors.teal} background={colors.surface} />
        <View style={styles.heroText}>
          <Text style={styles.heroEyebrow}>MAKE YOUR PICK</Text>
          <Text style={styles.title}>Stock</Text>
          <Text style={styles.heroSub}>Pick your figure for any round today.</Text>
        </View>
      </View>

      <View style={{ marginBottom: spacing.lg }}>
        <CountdownBadge />
      </View>

      <Card tone="info" style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <IconBubble name="bulb" size={36} iconSize={18} color={colors.blue} background={colors.surface} />
          <Text style={styles.infoTitle}>How scoring works</Text>
        </View>
        <Text style={styles.infoText}>
          Pick a number — each round is played with your fixed stake amount, which comes out of your wallet balance,
          separate from the rest. You can pick a stock for any round today in advance, not just the one currently
          open, but each round can only be played once — there's no changing it after you submit. Once a round
          settles, results are based on the average pick across all players that round — the closer your number
          was to the average, the higher your gain; the farther away, the bigger the loss.
        </Text>
      </Card>

      <MasterAutoPlayToggle />

      {openRounds.length === 0 && (
        <Card style={{ marginTop: spacing.lg }}>
          <EmptyState
            illustration="empty"
            title="No rounds left to pick a stock for today"
            message="Check back after the next operating day starts."
          />
        </Card>
      )}

      <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
        {openRounds.map((round) => {
          // slot.index is 0-based — see RoundsScreen for why `(index - 1) % len` crashed.
          const palette = ROUND_CARD_PALETTES[round.slot.index % ROUND_CARD_PALETTES.length];
          return (
            <Card key={round.slot.id} padded={false}>
              <View style={[styles.roundBand, { backgroundColor: palette.background, borderBottomColor: palette.border }]}>
                <View style={[styles.roundIndexCircle, { backgroundColor: palette.accent }]}>
                  <Text style={[styles.roundIndexText, { color: colors.cream }]}>{round.slot.index}</Text>
                </View>
                <View style={styles.roundHeaderText}>
                  <Text style={[styles.roundLabel, { color: palette.ink }]}>Round {round.slot.index}</Text>
                  <Text style={[styles.roundTime, { color: palette.ink }]}>
                    Opens {formatTime12h(round.slot.submitTime)} · Settles {formatTime12h(round.slot.settleTime)}
                  </Text>
                </View>
              </View>

              <View style={styles.roundBody}>
                <RoundAutoPlayControl roundId={round.slot.id} disabled={round.prediction != null} />

                <PredictionControl
                  roundId={round.slot.id}
                  currentValue={round.prediction?.value}
                  slotAmount={slotAmount}
                  onSubmit={(value, amount) => submitPrediction(round.slot.id, value, amount)}
                />
              </View>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    heroHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: withAlpha(colors.teal, 0.1),
      borderRadius: radius.xxl,
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    heroText: { flex: 1, minWidth: 0 },
    heroEyebrow: { ...typography.label, color: colors.teal },
    title: { ...typography.h1, color: colors.text, marginTop: 2 },
    heroSub: { ...typography.small, color: colors.textMuted, marginTop: 3 },
    infoCard: { marginTop: spacing.lg },
    infoHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
    infoTitle: { ...typography.h3, color: colors.text },
    infoText: { ...typography.small, color: colors.textMuted, lineHeight: 19 },
    roundBand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      padding: spacing.lg,
      borderBottomWidth: 1,
      borderTopLeftRadius: radius.xl - 1,
      borderTopRightRadius: radius.xl - 1,
    },
    roundIndexCircle: {
      width: 42,
      height: 42,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    roundIndexText: { ...typography.h3 },
    roundHeaderText: { flex: 1, minWidth: 0 },
    roundLabel: { ...typography.h3 },
    roundTime: { ...typography.small, marginTop: 2, opacity: 0.78 },
    roundBody: { padding: spacing.lg, paddingBottom: spacing.md },
  });
}

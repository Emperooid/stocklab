import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { CountdownBadge } from '../../components/CountdownBadge';
import { EmptyState } from '../../components/EmptyState';
import { PredictionControl } from '../../components/PredictionControl';
import { RoundAutoPlayControl } from '../../components/RoundAutoPlayControl';
import { MasterAutoPlayToggle } from '../../components/MasterAutoPlayToggle';
import { Colors, spacing, typography, useColors } from '../../theme/theme';
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
      <Text style={styles.title}>Stock</Text>

      <View style={{ marginBottom: spacing.lg }}>
        <CountdownBadge />
      </View>

      <Card style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Ionicons name="bulb-outline" size={18} color={colors.primary} />
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
            icon="hourglass-outline"
            title="No rounds left to pick a stock for today"
            message="Check back after the next operating day starts."
          />
        </Card>
      )}

      <View style={{ gap: spacing.md, marginTop: spacing.lg }}>
        {openRounds.map((round) => (
          <Card key={round.slot.id}>
            <View style={styles.roundHeader}>
              <View style={styles.roundIndexCircle}>
                <Text style={styles.roundIndexText}>{round.slot.index}</Text>
              </View>
              <View>
                <Text style={styles.roundLabel}>Round {round.slot.index}</Text>
                <Text style={styles.roundTime}>
                  Opens {formatTime12h(round.slot.submitTime)} · Settles {formatTime12h(round.slot.settleTime)}
                </Text>
              </View>
            </View>

            <RoundAutoPlayControl roundId={round.slot.id} disabled={round.prediction != null} />

            <PredictionControl
              roundId={round.slot.id}
              currentValue={round.prediction?.value}
              slotAmount={slotAmount}
              onSubmit={(value, amount) => submitPrediction(round.slot.id, value, amount)}
            />
          </Card>
        ))}
      </View>
    </Screen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    title: { ...typography.h2, color: colors.text, marginBottom: spacing.lg },
    roundHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
    roundIndexCircle: {
      width: 40,
      height: 40,
      borderRadius: 13,
      backgroundColor: colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    roundIndexText: { ...typography.h3, color: colors.primary },
    roundLabel: { ...typography.h3, color: colors.text },
    roundTime: { ...typography.small, color: colors.textMuted, marginTop: 2 },
    infoCard: { marginTop: spacing.lg, backgroundColor: colors.surfaceAlt },
    infoHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
    infoTitle: { ...typography.h3, color: colors.text },
    infoText: { ...typography.small, color: colors.textMuted, lineHeight: 18 },
  });
}

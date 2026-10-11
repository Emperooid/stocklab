import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { CountdownBadge } from '../../components/CountdownBadge';
import { EmptyState } from '../../components/EmptyState';
import { AnalogClock } from '../../components/AnalogClock';
import { PredictionControl } from '../../components/PredictionControl';
import { RoundAutoPlayControl } from '../../components/RoundAutoPlayControl';
import { MasterAutoPlayToggle } from '../../components/MasterAutoPlayToggle';
import { AutoPlayFigureOverview } from '../../components/AutoPlayFigureOverview';
import { Colors, radius, spacing, typography, useColors, ROUND_CARD_PALETTES } from '../../theme/theme';
import { useRoundsStore } from '../../store/roundsStore';
import { useAuthStore } from '../../store/authStore';
import { useAutoPlayStore } from '../../store/autoPlayStore';
import { useRoundsLiveRefresh } from '../../hooks/useRoundsLiveRefresh';
import { getSlotStatus } from '../../lib/schedule';
import { formatTime12h } from '../../lib/format';
import { shade } from '../../lib/colorMath';

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
      <AutoPlayFigureOverview rounds={openRounds} />

      {openRounds.length === 0 && (
        <Card style={{ marginTop: spacing.lg }}>
          <EmptyState
            icon="hourglass-outline"
            title="No rounds left to pick a stock for today"
            message="Check back after the next operating day starts."
          />
        </Card>
      )}

      <View style={{ gap: spacing.lg, marginTop: spacing.lg }}>
        {openRounds.map((round) => {
          const palette = ROUND_CARD_PALETTES[round.slot.index % ROUND_CARD_PALETTES.length];
          const [hh] = round.slot.submitTime.split(':').map(Number);
          const timeLabel = formatTime12h(round.slot.submitTime);
          const [timeDigits, timePeriod] = timeLabel.split(' ');
          return (
            <LinearGradient
              key={round.slot.id}
              colors={[shade(palette.accent, 0.12), palette.accent, shade(palette.accent, -0.14)]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.vibrantCard}
            >
              <View style={styles.vibrantHeaderRow}>
                <AnalogClock hour={hh} ringColor={palette.accent} />
                <View style={styles.timePill}>
                  <Text style={styles.timePillDigits}>{timeDigits}</Text>
                  <Text style={styles.timePillPeriod}>{timePeriod}</Text>
                </View>
              </View>

              <Text style={styles.vibrantHeadline}>
                Round {round.slot.index}{'\n'}
                <Text style={styles.vibrantHeadlineAccent}>pick your figure</Text>
              </Text>

              <RoundAutoPlayControl roundId={round.slot.id} disabled={round.prediction != null} vibrant />

              <PredictionControl
                roundId={round.slot.id}
                currentValue={round.prediction?.value}
                slotAmount={slotAmount}
                onSubmit={(value, amount) => submitPrediction(round.slot.id, value, amount)}
                vibrant
              />
            </LinearGradient>
          );
        })}
      </View>
    </Screen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    title: { ...typography.h2, color: colors.text, marginBottom: spacing.lg },
    infoCard: { marginTop: spacing.lg, backgroundColor: colors.surfaceAlt },
    infoHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
    infoTitle: { ...typography.h3, color: colors.text },
    infoText: { ...typography.small, color: colors.textMuted, lineHeight: 18 },

    vibrantCard: {
      borderRadius: radius.xl,
      padding: spacing.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 6,
    },
    vibrantHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
    timePill: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 4,
      backgroundColor: 'rgba(255,255,255,0.22)',
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    timePillDigits: { fontSize: 24, fontWeight: '900', color: '#FFFFFF' },
    timePillPeriod: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.85)' },
    vibrantHeadline: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', lineHeight: 30, marginBottom: spacing.lg },
    vibrantHeadlineAccent: { color: '#FFE86B' },
  });
}

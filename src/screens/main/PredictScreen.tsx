import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { CountdownBadge } from '../../components/CountdownBadge';
import { EmptyState } from '../../components/EmptyState';
import { colors, radius, shadow, spacing, typography } from '../../theme/theme';
import { useRoundsStore } from '../../store/roundsStore';
import { useRoundsLiveRefresh } from '../../hooks/useRoundsLiveRefresh';
import { getSlotStatus } from '../../lib/schedule';
import { formatTime12h } from '../../lib/format';

const VALUES = [1, 2, 3, 4, 5];

export default function PredictScreen() {
  const { rounds, fetchRounds, submitPrediction, isLoading } = useRoundsStore();
  const [selected, setSelected] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const now = useRoundsLiveRefresh();

  useFocusEffect(
    useCallback(() => {
      fetchRounds();
    }, [])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await fetchRounds();
    setRefreshing(false);
  }

  const openRound = rounds.find((r) => getSlotStatus(r.slot, now) === 'open');
  const alreadyPredicted = !!openRound?.prediction;

  async function handleSubmit() {
    if (!openRound || selected === null) return;
    setSubmitting(true);
    try {
      await submitPrediction(openRound.slot.id, selected);
      setSelected(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={handleRefresh}>
      <Text style={styles.title}>Predict</Text>

      <View style={{ marginBottom: spacing.lg }}>
        <CountdownBadge />
      </View>

      {!openRound && (
        <Card>
          <EmptyState
            icon="hourglass-outline"
            title="No round is open right now"
            message="Predictions open five times a day. Check the countdown above for the next window."
          />
        </Card>
      )}

      {openRound && (
        <Card>
          <View style={styles.roundHeader}>
            <View style={styles.roundIndexCircle}>
              <Text style={styles.roundIndexText}>{openRound.slot.index}</Text>
            </View>
            <View>
              <Text style={styles.roundLabel}>Round {openRound.slot.index}</Text>
              <Text style={styles.roundTime}>
                Submit by {formatTime12h(openRound.slot.submitTime)} · Settles {formatTime12h(openRound.slot.settleTime)}
              </Text>
            </View>
          </View>

          {alreadyPredicted ? (
            <View style={styles.submittedBox}>
              <View style={styles.submittedIconCircle}>
                <Ionicons name="checkmark" size={20} color={colors.onPrimary} />
              </View>
              <Text style={styles.submittedText}>
                You predicted <Text style={styles.submittedValue}>{openRound.prediction!.value}</Text> for this round.
                Results land once it settles.
              </Text>
            </View>
          ) : (
            <>
              <Text style={styles.pickLabel}>Pick a number from 1 to 5</Text>
              <View style={styles.valuesRow}>
                {VALUES.map((v) => {
                  const isSelected = selected === v;
                  return (
                    <TouchableOpacity
                      key={v}
                      style={[styles.valueBtn, isSelected && styles.valueBtnSelected]}
                      onPress={() => setSelected(v)}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.valueText, isSelected && styles.valueTextSelected]}>{v}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Button
                title="Submit Prediction"
                onPress={handleSubmit}
                loading={submitting || isLoading}
                disabled={selected === null}
                style={{ marginTop: spacing.xl }}
              />
            </>
          )}
        </Card>
      )}

      <Card style={styles.infoCard}>
        <View style={styles.infoHeader}>
          <Ionicons name="bulb-outline" size={18} color={colors.primary} />
          <Text style={styles.infoTitle}>How scoring works</Text>
        </View>
        <Text style={styles.infoText}>
          The Stock Value is the rounded average of every prediction submitted this round. The closer your number is
          to the Stock Value, the more you gain — the farther away, the more you lose, capped at 0.5% of your
          balance per round.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  pickLabel: { ...typography.small, color: colors.textMuted, marginBottom: spacing.md },
  valuesRow: { flexDirection: 'row', gap: spacing.sm },
  valueBtn: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueBtnSelected: { backgroundColor: colors.primary, borderColor: colors.primary, ...shadow.md },
  valueText: { ...typography.h2, color: colors.text },
  valueTextSelected: { color: colors.onPrimary },
  submittedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.successTint,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  submittedIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submittedText: { ...typography.small, color: colors.textMuted, flex: 1, lineHeight: 18 },
  submittedValue: { color: colors.primary, fontWeight: '800' },
  infoCard: { marginTop: spacing.lg, backgroundColor: colors.surfaceAlt },
  infoHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
  infoTitle: { ...typography.h3, color: colors.text },
  infoText: { ...typography.small, color: colors.textMuted, lineHeight: 18 },
});

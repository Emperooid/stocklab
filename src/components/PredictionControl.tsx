import { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { FormError } from './FormError';
import { Colors, radius, spacing, typography, useColors } from '../theme/theme';
import { getErrorMessage } from '../lib/validation';
import { formatMoney } from '../lib/format';

const VALUES = [1, 2, 3, 4, 5];

/** One distinct color per value (blue/green/red/amber/purple) instead of a single green for every selection — a real stock dashboard doesn't render every ticker the same color. Exported so AutoPlaySetupModal's figure chips use the same color language as this control. */
export function valueColor(colors: Colors, value: number): string {
  const palette = [colors.blue, colors.success, colors.danger, colors.warning, colors.purple];
  return palette[(value - 1) % palette.length];
}

/**
 * Pick-a-number-and-amount control for one round, shared by RoundsScreen
 * (inline, one per round card) and PredictScreen (one per unsettled round).
 *
 * CONFIRMED with the backend dev: a round is play-once — there's no update
 * or overwrite. Once submitted, the round is done; the client shouldn't
 * offer any way to change it. Previously this had a "Change Stock" escape
 * hatch, which no longer matches how the backend actually behaves — it was
 * removed rather than left as a button that would just fail or (worse)
 * create a duplicate entry.
 *
 * Per explicit product decision, the stake amount is no longer user-editable
 * either — it's a fixed, per-user amount from the profile (G24's
 * SlotAmount), shown read-only rather than as a free-text input.
 */
export function PredictionControl({
  roundId,
  currentValue,
  played,
  slotAmount,
  onSubmit,
}: {
  roundId: string;
  currentValue: number | undefined;
  /**
   * Explicit "this round is already played" signal, independent of knowing
   * the actual figure — set true when a round is confirmed played via G15
   * (Code "P") but currentValue is unknown (e.g. a fresh install, or a
   * different device than the one that submitted it). Without this, an
   * unknown currentValue reads identically to "never played," which would
   * let someone attempt a second submission on a round the backend already
   * considers done — it would just get rejected, but confusingly so.
   * Defaults to `currentValue != null` when omitted.
   */
  played?: boolean;
  slotAmount: number | undefined;
  onSubmit: (value: number, amount: number) => Promise<void>;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [selected, setSelected] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setError('');
    if (selected == null) {
      setError('Pick a number from 1 to 5.');
      return;
    }
    if (!slotAmount) {
      setError('Your bid amount is still loading. Please try again in a moment.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit(selected, slotAmount);
    } catch (e) {
      setError(getErrorMessage(e, 'Could not place your bid.'));
    } finally {
      setSaving(false);
    }
  }

  const hasPlayed = played ?? currentValue != null;
  if (hasPlayed) {
    return (
      <View style={styles.submittedRow}>
        <View
          style={[
            styles.submittedIconCircle,
            { backgroundColor: currentValue != null ? valueColor(colors, currentValue) : colors.textDim },
          ]}
        >
          <Ionicons name="checkmark" size={16} color={colors.onPrimary} />
        </View>
        {currentValue != null ? (
          <Text style={styles.submittedText}>
            Bid submitted — you bid{' '}
            <Text style={[styles.submittedValue, { color: valueColor(colors, currentValue) }]}>{currentValue}</Text>. This round is locked in;
            results land once it settles.
          </Text>
        ) : (
          <Text style={styles.submittedText}>
          Automatic bidding already placed a bid for this auction. Your bid is locked in until the auction closes.
          </Text>
        )}
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.predictLabel}>Place your bid for this auction</Text>
      <View style={styles.predictValuesRow}>
        {VALUES.map((v) => {
          const isSelected = selected === v;
          const color = valueColor(colors, v);
          return (
            <TouchableOpacity
              key={v}
              style={[
                styles.predictValueBtn,
                { borderColor: color }, // colored border at rest, not just once picked
                isSelected && { backgroundColor: color },
              ]}
              onPress={() => setSelected(v)}
            >
              <Text style={[styles.predictValueText, { color: isSelected ? colors.onPrimary : color }]}>{v}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.amountLabel}>Bid amount</Text>
      <View style={styles.amountRow}>
        <Text style={styles.amountValue}>{slotAmount != null ? formatMoney(slotAmount) : 'Loading…'}</Text>
      </View>
      <Text style={styles.onceNote}>You can’t change your bid after submitting.</Text>
      <Button
        key={roundId}
        title="Place Bid"
        size="sm"
        onPress={handleSubmit}
        loading={saving}
        disabled={selected == null || slotAmount == null}
        style={{ marginTop: spacing.sm }}
      />
      {!!error && <FormError message={error} />}
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    predictLabel: { ...typography.tiny, color: colors.textMuted, marginBottom: spacing.xs, fontWeight: '700' },
    predictValuesRow: { flexDirection: 'row', gap: spacing.sm },
    predictValueBtn: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    predictValueText: { ...typography.h3 },
    amountLabel: { ...typography.tiny, color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.xs, fontWeight: '700' },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: spacing.md,
      height: 44,
    },
    amountValue: { ...typography.h3, color: colors.text },
    onceNote: { ...typography.tiny, color: colors.textDim, marginTop: spacing.sm, lineHeight: 15 },
    submittedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.successTint,
      borderRadius: radius.md,
      padding: spacing.sm,
    },
    submittedIconCircle: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submittedText: { ...typography.small, color: colors.textMuted, flex: 1, lineHeight: 18 },
    submittedValue: { fontWeight: '800' },
  });
}

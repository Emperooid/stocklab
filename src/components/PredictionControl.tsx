import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { FormError } from './FormError';
import { AppIcon } from './AppIcon';
import { IconBubble } from './IconBubble';
import { Colors, radius, spacing, typography, useColors } from '../theme/theme';
import { withAlpha } from '../lib/color';
import { getErrorMessage } from '../lib/validation';
import { formatMoney } from '../lib/format';

const VALUES = [1, 2, 3, 4, 5];

/** One distinct colour per value instead of a single hue for every selection. */
function valueColor(colors: Colors, value: number): string {
  const palette = [colors.blue, colors.success, colors.danger, colors.amber, colors.purple];
  return palette[(value - 1) % palette.length];
}

/**
 * Pick-a-number-and-amount control for one round, shared by RoundsScreen
 * (inline, one per round card) and PredictScreen (one per unsettled round).
 *
 * A round is play-once — there's no update or overwrite. The stake amount is
 * not user-editable either: it's a fixed, per-user amount from the profile.
 */
export function PredictionControl({
  roundId,
  currentValue,
  slotAmount,
  onSubmit,
}: {
  roundId: string;
  currentValue: number | undefined;
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
      setError('Your play amount is still loading. Please try again in a moment.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit(selected, slotAmount);
    } catch (e) {
      setError(getErrorMessage(e, 'Could not submit your stock pick.'));
    } finally {
      setSaving(false);
    }
  }

  if (currentValue != null) {
    const tint = valueColor(colors, currentValue);
    return (
      <View style={[styles.submittedRow, { backgroundColor: withAlpha(tint, 0.12), borderColor: withAlpha(tint, 0.3) }]}>
        <View style={[styles.submittedBadge, { backgroundColor: tint }]}>
          <Text style={styles.submittedBadgeText}>{currentValue}</Text>
        </View>
        <Text style={[styles.submittedText, { color: colors.text }]}>
          Your pick is in — you chose <Text style={{ color: tint, fontWeight: '900' }}>{currentValue}</Text>. This round is
          locked; results land once it settles.
        </Text>
        <AppIcon name="lock" size={17} color={colors.textDim} />
      </View>
    );
  }

  return (
    <View>
      <Text style={[styles.predictLabel, { color: colors.textMuted }]}>PICK YOUR FIGURE</Text>
      <View style={styles.tilesRow}>
        {VALUES.map((v) => {
          const isSelected = selected === v;
          const color = valueColor(colors, v);
          return (
            <Pressable
              key={v}
              onPress={() => setSelected(v)}
              style={[
                styles.tile,
                {
                  backgroundColor: isSelected ? color : colors.surfaceAlt,
                  borderColor: isSelected ? color : colors.border,
                },
                isSelected && { transform: [{ translateY: -3 }] },
              ]}
            >
              <Text style={[styles.tileText, { color: isSelected ? '#FFFFFF' : color }]}>{v}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.amountRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
        <IconBubble name="coin" size={38} iconSize={20} background={colors.surface} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.amountLabel, { color: colors.textMuted }]}>AMOUNT TO PLAY WITH</Text>
          <Text style={[styles.amountValue, { color: colors.text }]}>
            {slotAmount != null ? formatMoney(slotAmount) : 'Loading…'}
          </Text>
        </View>
      </View>

      <View style={styles.onceNoteRow}>
        <AppIcon name="info" size={14} color={colors.textDim} />
        <Text style={[styles.onceNote, { color: colors.textDim }]}>
          You can only play this round once — there's no changing it after you submit.
        </Text>
      </View>

      <Button
        key={roundId}
        title="Lock it in"
        icon="check"
        size="sm"
        onPress={handleSubmit}
        loading={saving}
        disabled={selected == null || slotAmount == null}
      />
      {!!error && <FormError message={error} />}
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    predictLabel: { ...typography.label, marginBottom: spacing.sm },
    tilesRow: { flexDirection: 'row', gap: spacing.sm },
    tile: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: radius.md,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tileText: { ...typography.h1 },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderRadius: radius.md,
      borderWidth: 2,
      padding: spacing.sm + 2,
      marginTop: spacing.md,
    },
    amountLabel: { ...typography.label, fontSize: typography.label.fontSize - 1 },
    amountValue: { ...typography.h2, marginTop: 1 },
    onceNoteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: spacing.sm, marginBottom: spacing.md },
    onceNote: { ...typography.tiny, flex: 1, lineHeight: 15 },
    submittedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderRadius: radius.md,
      borderWidth: 1,
      padding: spacing.sm + 2,
    },
    submittedBadge: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    submittedBadgeText: { ...typography.h3, color: '#FFFFFF' },
    submittedText: { ...typography.small, flex: 1, lineHeight: 18 },
  });
}

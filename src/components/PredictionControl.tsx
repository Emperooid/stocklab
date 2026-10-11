import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from './Button';
import { FormError } from './FormError';
import { Colors, radius, spacing, typography, useColors } from '../theme/theme';
import { getErrorMessage } from '../lib/validation';
import { formatMoney } from '../lib/format';

const VALUES = [1, 2, 3, 4, 5];

/** One distinct color per value (blue/green/red/amber/purple) instead of a single green for every selection — a real stock dashboard doesn't render every ticker the same color. */
function valueColor(colors: Colors, value: number): string {
  const palette = [colors.blue, colors.success, colors.danger, colors.warning, colors.purple];
  return palette[(value - 1) % palette.length];
}

// Fixed, bright, theme-independent set for the vibrant round card — these
// sit on a saturated gradient background, so they stay the same five hues
// regardless of dark/light mode or the round's own accent color.
const VIBRANT_TILE_COLORS = ['#2E9BFF', '#12A150', '#E64980', '#F08C00', '#15AABF'];
const INK = '#1B1540';

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
  slotAmount,
  onSubmit,
  vibrant,
}: {
  roundId: string;
  currentValue: number | undefined;
  slotAmount: number | undefined;
  onSubmit: (value: number, amount: number) => Promise<void>;
  /** Renders the vibrant round-card style (sits on a LinearGradient) instead of the plain list-row style. */
  vibrant?: boolean;
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
    if (vibrant) {
      const tint = VIBRANT_TILE_COLORS[(currentValue - 1) % VIBRANT_TILE_COLORS.length];
      return (
        <View style={styles.vLockedRow}>
          <View style={[styles.vLockedBadge, { backgroundColor: '#FFFFFF' }]}>
            <Text style={[styles.vLockedBadgeText, { color: tint }]}>{currentValue}</Text>
          </View>
          <Text style={styles.vLockedText}>
            Your pick is in — you chose <Text style={styles.vLockedTextStrong}>{currentValue}</Text>. Results land once
            this round settles.
          </Text>
          <Ionicons name="lock-closed" size={16} color="rgba(255,255,255,0.85)" />
        </View>
      );
    }
    return (
      <View style={styles.submittedRow}>
        <View style={[styles.submittedIconCircle, { backgroundColor: valueColor(colors, currentValue) }]}>
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
        </View>
        <Text style={styles.submittedText}>
          Stock submitted — you picked <Text style={[styles.submittedValue, { color: valueColor(colors, currentValue) }]}>{currentValue}</Text>. This
          round is locked in; results land once it settles.
        </Text>
      </View>
    );
  }

  if (vibrant) {
    return (
      <View>
        <View style={styles.vTilesRow}>
          {VALUES.map((v) => {
            const isSelected = selected === v;
            const color = VIBRANT_TILE_COLORS[(v - 1) % VIBRANT_TILE_COLORS.length];
            return (
              <TouchableOpacity
                key={v}
                onPress={() => setSelected(v)}
                style={[
                  styles.vTile,
                  { borderColor: color, backgroundColor: isSelected ? color : '#FFFFFF' },
                  isSelected && { transform: [{ translateY: -3 }] },
                ]}
              >
                <Text style={[styles.vTileText, { color: isSelected ? '#FFFFFF' : INK }]}>{v}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.vAmountBanner}>
          <View style={styles.vCoinStack}>
            <View style={styles.vCoinBack} />
            <View style={styles.vCoinFront}>
              <Text style={styles.vCoinFrontText}>₦</Text>
            </View>
          </View>
          <View style={styles.vAmountDivider} />
          <View style={{ flex: 1 }}>
            <Text style={styles.vAmountLabel}>PLAY AMOUNT</Text>
            <Text style={styles.vAmountValue}>{slotAmount != null ? formatMoney(slotAmount) : 'Loading…'}</Text>
          </View>
        </View>

        <TouchableOpacity
          key={roundId}
          activeOpacity={0.85}
          onPress={handleSubmit}
          disabled={selected == null || slotAmount == null || saving}
          style={[styles.vPlayWrap, (selected == null || slotAmount == null) && { opacity: 0.55 }]}
        >
          <LinearGradient colors={['#34D985', '#0E9F57']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.vPlayButton}>
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="play" size={20} color="#FFFFFF" />
                <Text style={styles.vPlayText}>Play</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
        {!!error && <FormError message={error} />}
        <Text style={styles.vOnceNote}>You can only play this round once — there's no changing it after you submit.</Text>
      </View>
    );
  }

  return (
    <View>
      <Text style={styles.predictLabel}>Pick a stock for this round</Text>
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
              <Text style={[styles.predictValueText, { color: isSelected ? '#FFFFFF' : color }]}>{v}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.amountLabel}>Amount to play with</Text>
      <View style={styles.amountRow}>
        <Text style={styles.amountValue}>{slotAmount != null ? formatMoney(slotAmount) : 'Loading…'}</Text>
      </View>
      <Text style={styles.onceNote}>You can only play this round once — there's no changing it after you submit.</Text>
      <Button
        key={roundId}
        title="Submit Stock"
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

    // ── Vibrant round-card variant ──────────────────────────────────────
    vTilesRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
    vTile: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: 16,
      borderWidth: 3,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.18,
      shadowRadius: 4,
      elevation: 3,
    },
    vTileText: { fontSize: 24, fontWeight: '800' },
    vAmountBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    vCoinStack: { width: 42, height: 38, marginRight: 2 },
    vCoinBack: {
      position: 'absolute',
      left: 0,
      bottom: 0,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: '#E8A400',
      borderWidth: 2,
      borderColor: '#C98600',
    },
    vCoinFront: {
      position: 'absolute',
      right: 0,
      top: 0,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: '#FFC93D',
      borderWidth: 2,
      borderColor: '#C98600',
      alignItems: 'center',
      justifyContent: 'center',
    },
    vCoinFrontText: { color: '#8A5A00', fontWeight: '900', fontSize: 15 },
    vAmountDivider: { width: 1.5, height: 32, backgroundColor: 'rgba(255,255,255,0.3)' },
    vAmountLabel: { ...typography.tiny, color: 'rgba(255,255,255,0.8)', fontWeight: '800', letterSpacing: 0.5 },
    vAmountValue: { fontSize: 24, fontWeight: '900', color: '#FFE86B', marginTop: 2 },
    vPlayWrap: {
      borderRadius: radius.pill,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.3,
      shadowRadius: 10,
      elevation: 6,
    },
    vPlayButton: {
      height: 58,
      borderRadius: radius.pill,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    vPlayText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
    vOnceNote: { ...typography.tiny, color: 'rgba(255,255,255,0.75)', marginTop: spacing.sm, lineHeight: 15, textAlign: 'center' },
    vLockedRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: 'rgba(255,255,255,0.18)',
      borderRadius: radius.lg,
      padding: spacing.md,
    },
    vLockedBadge: { width: 32, height: 32, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    vLockedBadgeText: { fontSize: 16, fontWeight: '800' },
    vLockedText: { ...typography.small, color: '#FFFFFF', flex: 1, lineHeight: 18 },
    vLockedTextStrong: { fontWeight: '800', textDecorationLine: 'underline' },
  });
}

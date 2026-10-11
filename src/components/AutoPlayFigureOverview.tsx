import { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { Button } from './Button';
import { Colors, radius, spacing, typography, useColors } from '../theme/theme';
import { useAutoPlayStore } from '../store/autoPlayStore';
import { formatTime12h } from '../lib/format';
import { getErrorMessage } from '../lib/validation';
import { DailyRound } from '../types';

const FIGURES = [1, 2, 3, 4, 5];

/**
 * A compact, all-in-one-place list so a different Auto Play figure can be
 * set per round (1 for round 1, 3 for round 2, 5 for round 3, ...) without
 * scrolling through every round's own card to find its figure picker —
 * CONFIRMED user request, sits directly under the master on/off toggle.
 *
 * Collapsed by default — tap the header to open it. Picks are staged locally
 * (not sent as you tap) and only reach the server on "Save", one
 * setSlotFigure call per changed round — the same store action/backend call
 * the per-round picker already uses.
 */
export function AutoPlayFigureOverview({ rounds }: { rounds: DailyRound[] }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const loaded = useAutoPlayStore((s) => s.loaded);
  const slots = useAutoPlayStore((s) => s.slots);
  const setSlotFigure = useAutoPlayStore((s) => s.setSlotFigure);

  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [justSaved, setJustSaved] = useState(false);

  if (!loaded || rounds.length === 0) return null;

  const pendingCount = Object.keys(pending).length;

  async function handleSave() {
    setError('');
    setSaving(true);
    try {
      for (const [roundId, figure] of Object.entries(pending)) {
        await setSlotFigure(roundId, figure);
      }
      setPending({});
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2500);
    } catch (e) {
      setError(getErrorMessage(e, 'Could not save those figures.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={styles.card}>
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel="Auto set daily figure per round"
        accessibilityState={{ expanded }}
      >
        <View style={styles.headerIcon}>
          <Ionicons name="options-outline" size={18} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>Auto Set Daily Figure</Text>
          <Text style={styles.subtitle}>Set every round's Auto Play figure for the day, all in one place.</Text>
          <View style={styles.tapHint}>
            <Text style={styles.tapHintText}>{expanded ? 'Tap to close' : 'Tap to set'}</Text>
            <Ionicons name="arrow-forward" size={12} color={colors.primary} />
          </View>
        </View>
        <View style={styles.chevronCircle}>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.primary} />
        </View>
      </TouchableOpacity>

      {expanded && (
        <>
          <View style={styles.list}>
            {rounds.map((round) => {
              const config = slots[round.slot.id];
              const enabled = config?.enabled ?? false;
              const figure = pending[round.slot.id] ?? config?.figure ?? 3;
              return (
                <View key={round.slot.id} style={styles.row}>
                  <View style={styles.roundLabelWrap}>
                    <Text style={[styles.roundLabel, !enabled && { color: colors.textDim }]} numberOfLines={1}>
                      Round {round.slot.index}
                    </Text>
                    <Text style={styles.roundTime}>{formatTime12h(round.slot.submitTime)}</Text>
                  </View>
                  <View style={styles.chipsRow}>
                    {FIGURES.map((v) => {
                      const selected = v === figure;
                      return (
                        <TouchableOpacity
                          key={v}
                          disabled={!enabled}
                          onPress={() => setPending((p) => ({ ...p, [round.slot.id]: v }))}
                          style={[styles.chip, selected && styles.chipSelected, !enabled && styles.chipDisabled]}
                        >
                          <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{v}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>

          {!!error && <Text style={styles.errorText}>{error}</Text>}
          {justSaved && !error && (
            <View style={styles.savedRow}>
              <Ionicons name="checkmark-circle" size={15} color={colors.success} />
              <Text style={styles.savedText}>Saved</Text>
            </View>
          )}

          <Button
            title={pendingCount > 0 ? `Save (${pendingCount})` : 'Save'}
            size="sm"
            onPress={handleSave}
            loading={saving}
            disabled={pendingCount === 0}
            style={{ marginTop: spacing.md }}
          />
        </>
      )}
    </Card>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    card: { marginTop: spacing.lg },
    // Reads as a button rather than a label: tinted fill, primary border, its own
    // icon, and the chevron inset in a circle. Before it was a bare row with a
    // small grey chevron, so nothing suggested it could be tapped.
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      padding: spacing.sm + 2,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.primary,
      backgroundColor: colors.primaryTint,
    },
    headerIcon: {
      width: 34,
      height: 34,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    headerText: { flex: 1, minWidth: 0 },
    chevronCircle: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    title: { ...typography.body, color: colors.text, fontWeight: '800' },
    subtitle: { ...typography.tiny, color: colors.textMuted, marginTop: 2, lineHeight: 15 },
    tapHint: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 6 },
    tapHintText: { ...typography.tiny, color: colors.primary, fontWeight: '900' },
    list: { gap: spacing.sm, marginTop: spacing.md },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.xs,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: spacing.sm,
    },
    roundLabelWrap: { minWidth: 0, flexShrink: 1, marginRight: spacing.sm },
    roundLabel: { ...typography.small, color: colors.text, fontWeight: '700' },
    roundTime: { ...typography.tiny, color: colors.textDim, marginTop: 1 },
    chipsRow: { flexDirection: 'row', gap: 6 },
    chip: {
      width: 28,
      height: 28,
      borderRadius: radius.xs,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    chipDisabled: { opacity: 0.4 },
    chipText: { ...typography.tiny, color: colors.text, fontWeight: '800' },
    chipTextSelected: { color: colors.onPrimary },
    errorText: { ...typography.tiny, color: colors.danger, marginTop: spacing.sm },
    savedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
    savedText: { ...typography.tiny, color: colors.success, fontWeight: '700' },
  });
}

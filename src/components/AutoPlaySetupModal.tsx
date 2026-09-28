import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { Colors, radius, spacing, typography, useColors } from '../theme/theme';
import { useAutoPlayStore } from '../store/autoPlayStore';
import { valueColor } from './PredictionControl';
import { ROUND_SLOTS } from '../lib/schedule';
import { formatTime12h } from '../lib/format';
import { AutoPlaySlotConfig } from '../types';

const FIGURES = [1, 2, 3, 4, 5];
const DEFAULT_FIGURE = 3;

/**
 * One-screen Auto Play setup: every round in one scrollable list, each with
 * its own tappable 1-5 figure row (reusing PredictionControl's own colors,
 * so it reads as "the same picker you already use to play"). Tapping a
 * figure selects it and turns that round on; tapping the already-selected
 * figure again clears it back off — no separate switch needed, the pick
 * itself is the on/off signal. Nothing round-per-network-call: changes are
 * held in local draft state and only sent (one A1 call per changed round)
 * when Save is pressed, so setting up several rounds costs one deliberate
 * action instead of 24 separate live saves.
 *
 * Every round is always editable here, regardless of today's clock — Auto
 * Play settings are per-slot and recurring (set Round 12 once, it plays
 * every day at that hour until you change it), not a one-off action scoped
 * to today. Whether a specific day's instance of a round is currently open
 * or already closed is the backend's concern when it actually runs each
 * round, not something the client should gate setup on — an earlier version
 * of this locked out "already closed today" rounds, which just meant you
 * couldn't change tomorrow's figure for a round until its window reopened.
 */
export function AutoPlaySetupModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const slots = useAutoPlayStore((s) => s.slots);
  const setSlotConfig = useAutoPlayStore((s) => s.setSlotConfig);

  const [draft, setDraft] = useState<Record<string, AutoPlaySlotConfig>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Re-seeds the draft from real server state every time the modal opens,
  // so a previous unsaved edit (or a change made elsewhere) never lingers.
  useEffect(() => {
    if (visible) {
      setDraft(slots);
      setError('');
    }
  }, [visible]);

  const selectedCount = ROUND_SLOTS.filter((slot) => draft[slot.id]?.enabled).length;

  const changedRoundIds = useMemo(() => {
    const ids: string[] = [];
    for (const slot of ROUND_SLOTS) {
      const before = slots[slot.id] ?? { enabled: false, figure: DEFAULT_FIGURE };
      const after = draft[slot.id] ?? { enabled: false, figure: DEFAULT_FIGURE };
      if (before.enabled !== after.enabled || (after.enabled && before.figure !== after.figure)) {
        ids.push(slot.id);
      }
    }
    return ids;
  }, [draft, slots]);

  function tapFigure(roundId: string, figure: number) {
    setDraft((prev) => {
      const current = prev[roundId] ?? { enabled: false, figure: DEFAULT_FIGURE };
      const clearing = current.enabled && current.figure === figure;
      return { ...prev, [roundId]: clearing ? { enabled: false, figure } : { enabled: true, figure } };
    });
  }

  async function handleSave() {
    if (changedRoundIds.length === 0) {
      onClose();
      return;
    }
    setSaving(true);
    setError('');
    const results = await Promise.allSettled(
      changedRoundIds.map((roundId) => {
        const target = draft[roundId] ?? { enabled: false, figure: DEFAULT_FIGURE };
        return setSlotConfig(roundId, target);
      })
    );
    setSaving(false);
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      setError(      `${failed} of ${changedRoundIds.length} auctions couldn't be saved. Try again, or close and reopen to see what actually went through.`);
      return;
    }
    onClose();
    const savedCount = changedRoundIds.length;
    Alert.alert(
      'Automatic Bidding Saved',
      `${savedCount} auction${savedCount === 1 ? '' : 's'} updated. Automatic bidding will use your bids from here on.`
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: Math.round(spacing.lg + insets.bottom) }]}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.title}>Set Up Automatic Bidding</Text>
              <Text style={styles.subtitle} numberOfLines={3}>
                Set an automatic bid for any auction you want to enter. It will bid in recurring auctions until you
                change it here.
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.countPill}>
            <Ionicons name="flash" size={13} color={colors.primary} />
            <Text style={styles.countText}>{selectedCount} of {ROUND_SLOTS.length} auctions selected</Text>
          </View>

          <FlatList
            data={ROUND_SLOTS}
            keyExtractor={(slot) => slot.id}
            style={styles.list}
            contentContainerStyle={{ paddingBottom: spacing.md }}
            renderItem={({ item: slot }) => {
              const config = draft[slot.id] ?? { enabled: false, figure: DEFAULT_FIGURE };
              return (
                <View style={styles.roundRow}>
                  <View style={styles.roundLabelWrap}>
                    <Text style={styles.roundLabel} numberOfLines={1}>
                      Auction {slot.index}
                    </Text>
                    <Text style={styles.roundTime} numberOfLines={1}>
                      {formatTime12h(slot.submitTime)}
                    </Text>
                  </View>
                  <View style={styles.figuresRow}>
                    {FIGURES.map((figure) => {
                      const isSelected = config.enabled && config.figure === figure;
                      const color = valueColor(colors, figure);
                      return (
                        <TouchableOpacity
                          key={figure}
                          onPress={() => tapFigure(slot.id, figure)}
                          style={[
                            styles.chip,
                            { borderColor: color },
                            isSelected && { backgroundColor: color },
                          ]}
                        >
                          <Text style={[styles.chipText, { color: isSelected ? colors.onPrimary : color }]}>{figure}</Text>
                        </TouchableOpacity>
                      );
                    })}
                    {/* Explicit skip/clear — tapping the already-selected
                        number again does the same thing, but that's not
                        obvious on its own, so this gives selected rounds a
                        clear, visible way to opt back out. Only shown once
                        something's actually selected, so unselected rows
                        (the common case) stay uncluttered. */}
                    {config.enabled && (
                      <TouchableOpacity
                        onPress={() => setDraft((prev) => ({ ...prev, [slot.id]: { ...config, enabled: false } }))}
                        style={styles.clearChip}
                        accessibilityLabel={`Don't bid automatically in Auction ${slot.index}`}
                      >
                        <Ionicons name="close" size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            }}
          />

          {!!error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.footer}>
            {/* Button's `style` prop only reaches its inner Pressable, not the
                Animated.View wrapper that's the actual flex-row child here —
                passing flex:1/flex:2 straight to Button never actually sized
                it, which could collapse the Save button to almost nothing.
                Wrapping in a plain View with the flex value fixes that: the
                View reliably claims its share of the row, and the Button
                inside stretches to fill it. */}
            <View style={{ flex: 1 }}>
              <Button title="Cancel" variant="ghost" onPress={onClose} disabled={saving} />
            </View>
            <View style={{ flex: 2 }}>
              <Button
                title={changedRoundIds.length > 0 ? `Save ${changedRoundIds.length} Change${changedRoundIds.length === 1 ? '' : 's'}` : 'Done'}
                onPress={handleSave}
                loading={saving}
              />
            </View>
          </View>
          {saving && (
            <View style={styles.savingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.savingText}>Saving to your account…</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingTop: spacing.lg,
      paddingHorizontal: spacing.lg,
      height: '82%',
    },
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
    title: { ...typography.h2, color: colors.text },
    subtitle: { ...typography.small, color: colors.textMuted, marginTop: 4, lineHeight: 18 },
    countPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      alignSelf: 'flex-start',
      backgroundColor: colors.primaryTint,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
      marginTop: spacing.md,
    },
    countText: { ...typography.tiny, color: colors.primary, fontWeight: '700' },
    list: { marginTop: spacing.md, flex: 1 },
    roundRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    roundLabelWrap: { minWidth: 0, flexShrink: 1 },
    roundLabel: { ...typography.body, color: colors.text, fontWeight: '700' },
    roundTime: { ...typography.tiny, color: colors.textMuted, marginTop: 1 },
    figuresRow: { flexDirection: 'row', gap: spacing.xs, flexShrink: 0 },
    chip: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipText: { ...typography.small, fontWeight: '700' },
    clearChip: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
    },
    errorText: { ...typography.small, color: colors.danger, marginTop: spacing.sm },
    footer: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    savingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, justifyContent: 'center', marginTop: spacing.sm },
    savingText: { ...typography.tiny, color: colors.textMuted },
  });
}

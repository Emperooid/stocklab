import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { CountdownBadge } from '../../components/CountdownBadge';
import { EmptyState } from '../../components/EmptyState';
import { PredictionControl } from '../../components/PredictionControl';
import { TourTarget } from '../../components/TourTarget';
import { Colors, radius, spacing, typography, useColors } from '../../theme/theme';
import { useRoundsStore } from '../../store/roundsStore';
import { useAuthStore } from '../../store/authStore';
import { AutoPlayMode, useAutoPlayStore } from '../../store/autoPlayStore';
import { useRoundsLiveRefresh } from '../../hooks/useRoundsLiveRefresh';
import { getSlotStatus } from '../../lib/schedule';
import { formatMoney, formatTime12h } from '../../lib/format';

export default function PredictScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { rounds, fetchRounds, submitPrediction } = useRoundsStore();
  const slotAmount = useAuthStore((s) => s.user?.slotAmount);
  const [refreshing, setRefreshing] = useState(false);
  const now = useRoundsLiveRefresh();

  useFocusEffect(
    useCallback(() => {
      fetchRounds().catch(() => {});
    }, [])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await fetchRounds();
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

      <AutoPlaySection />

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

      {openRounds.length === 0 && (
        <Card style={{ marginTop: spacing.lg }}>
          <EmptyState
            icon="hourglass-outline"
            title="No rounds left to pick a stock for today"
            message="Check back after the next operating day starts."
          />
        </Card>
      )}

      <TourTarget id="predict-rounds" style={{ gap: spacing.md, marginTop: spacing.lg }}>
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

            <PredictionControl
              roundId={round.slot.id}
              currentValue={round.prediction?.value}
              slotAmount={slotAmount}
              onSubmit={(value, amount) => submitPrediction(round.slot.id, value, amount)}
            />
          </Card>
        ))}
      </TourTarget>
    </Screen>
  );
}

function AutoPlaySection() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { enabled, mode, configured, saving, error, configure, setEnabled, clearError } = useAutoPlayStore();
  // Per the same fixed-amount product decision as manual predictions —
  // Auto Play plays with the account's real SlotAmount (from G24), not a
  // user-typed value. The old free-text field defaulted to a meaningless
  // hardcoded MIN_SLOT_AMOUNT (100) that had nothing to do with this
  // account's actual configured amount (300).
  const slotAmount = useAuthStore((s) => s.user?.slotAmount);

  // Local draft, seeded from the last-saved store value — nothing is sent
  // to the server just from tapping a mode. Saving (or turning Auto Play on
  // for the first time) is what actually commits a draft via configure() (G26).
  const [draftMode, setDraftMode] = useState<AutoPlayMode>(mode);

  // useAutoPlayStore persists via AsyncStorage, which hydrates
  // asynchronously — this screen can mount and seed draftMode from `mode`
  // BEFORE that hydration finishes (unlike authStore, this store has no
  // hasHydrated flag to gate on). Without this, draftMode would freeze at
  // the pre-hydration default ('full') forever, permanently disagreeing
  // with the real saved mode once it loads — showing a spurious "Save
  // Changes" button even though Auto Play was already configured
  // correctly. Re-syncing whenever `mode` changes (hydration, or any
  // actual successful save) keeps draftMode honest without needing a
  // separate hydration guard.
  useEffect(() => {
    setDraftMode(mode);
  }, [mode]);

  const isDirty = draftMode !== mode;

  async function handleSave(nextEnabled: boolean) {
    clearError();
    if (!slotAmount) return;
    try {
      await configure(draftMode, slotAmount, nextEnabled);
    } catch {
      // error already captured in the store; nothing else to do here
    }
  }

  async function handleToggleSwitch(next: boolean) {
    clearError();
    // Turning it on for the very first time (or with unsaved mode/amount
    // changes pending) needs the full profile call, not just the toggle.
    if (!configured || (next && isDirty)) {
      await handleSave(next);
      return;
    }
    try {
      await setEnabled(next);
    } catch {
      // error already captured in the store
    }
  }

  return (
    <TourTarget id="predict-autoplay">
    <Card style={styles.autoPlayCard}>
      <View style={styles.autoPlayHeaderRow}>
        <View style={{ flex: 1, marginRight: spacing.md }}>
          <Text style={styles.autoPlayTitle}>Auto Play</Text>
          <Text style={styles.autoPlaySubtitle}>
            The server plays every round for you automatically — even while the app is closed.
          </Text>
        </View>
        <Switch
          value={enabled}
          onValueChange={handleToggleSwitch}
          disabled={saving}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={colors.text}
        />
      </View>

      {!!error && (
        <View style={styles.autoPlayErrorBanner}>
          <Ionicons name="alert-circle-outline" size={14} color={colors.danger} />
          <Text style={styles.autoPlayErrorText}>{error}</Text>
        </View>
      )}

      <Text style={styles.autoPlayLabel}>Rounds per day</Text>
      <View style={styles.autoPlayValuesRow}>
        {(['half', 'full'] as AutoPlayMode[]).map((m) => (
          <TouchableOpacity
            key={m}
            style={[styles.modeBtn, draftMode === m && styles.modeBtnSelected]}
            onPress={() => setDraftMode(m)}
          >
            <Text
              style={[styles.modeBtnText, draftMode === m && styles.modeBtnTextSelected]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {m === 'half' ? 'Half · 12 rounds' : 'Full · 24 rounds'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.autoPlayLabel}>Amount per round</Text>
      <View style={styles.amountRow}>
        <Text style={styles.amountValue}>{slotAmount != null ? formatMoney(slotAmount) : 'Loading…'}</Text>
      </View>

      {(isDirty || !configured) && (
        <Button
          title={enabled ? 'Save Changes' : 'Turn On Auto Play'}
          size="sm"
          loading={saving}
          disabled={slotAmount == null}
          onPress={() => handleSave(true)}
          style={{ marginTop: spacing.md }}
        />
      )}
    </Card>
    </TourTarget>
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
    amountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: spacing.md,
      height: 48,
    },
    amountValue: { ...typography.h3, color: colors.text },
    infoCard: { marginTop: spacing.lg, backgroundColor: colors.surfaceAlt },
    infoHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.xs },
    infoTitle: { ...typography.h3, color: colors.text },
    infoText: { ...typography.small, color: colors.textMuted, lineHeight: 18 },
    autoPlayCard: { marginTop: spacing.lg },
    autoPlayHeaderRow: { flexDirection: 'row', alignItems: 'center' },
    autoPlayTitle: { ...typography.h3, color: colors.text },
    autoPlaySubtitle: { ...typography.tiny, color: colors.textMuted, marginTop: 2, lineHeight: 15 },
    autoPlayErrorBanner: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.xs,
      backgroundColor: colors.dangerTint,
      borderRadius: radius.md,
      padding: spacing.sm,
      marginTop: spacing.md,
    },
    autoPlayErrorText: { ...typography.tiny, color: colors.danger, flex: 1, lineHeight: 15 },
    autoPlayLabel: { ...typography.small, color: colors.textMuted, marginTop: spacing.md, marginBottom: spacing.sm },
    autoPlayValuesRow: { flexDirection: 'row', gap: spacing.sm },
    modeBtn: {
      flex: 1,
      height: 44,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.sm,
    },
    modeBtnSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    modeBtnText: { ...typography.small, color: colors.text, fontWeight: '600' },
    modeBtnTextSelected: { color: colors.onPrimary },
  });
}

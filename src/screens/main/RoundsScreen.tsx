import { useCallback, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge, BadgeTone } from '../../components/Badge';
import { FormError } from '../../components/FormError';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuthStore } from '../../store/authStore';
import { useRoundsStore } from '../../store/roundsStore';
import { useWalletStore } from '../../store/walletStore';
import { useRoundsLiveRefresh } from '../../hooks/useRoundsLiveRefresh';
import { getSlotStatus, timeOnDate, formatCountdown } from '../../lib/schedule';
import { formatMoney, formatPercent, formatSigned, formatTime12h } from '../../lib/format';
import { getErrorMessage } from '../../lib/validation';
import { DailyRound, RoundStatus } from '../../types';
import { MainStackParamList } from '../../navigation/types';

export default function RoundsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin');
  const { rounds, fetchRounds, defaultStockValues, fetchDefaultStockValues, setDefaultStockValues } = useRoundsStore();
  const { balance, totalProfit, totalProfitPercent, refresh } = useWalletStore();
  const now = useRoundsLiveRefresh();
  const [refreshing, setRefreshing] = useState(false);
  const [defaultsModalVisible, setDefaultsModalVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchRounds();
      refresh();
      if (isAdmin) fetchDefaultStockValues();
    }, [isAdmin])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([fetchRounds(), refresh()]);
    setRefreshing(false);
  }

  const settled = rounds.filter((r) => r.result);
  const totalGains = settled.reduce((sum, r) => sum + Math.max(0, r.result?.valueGained ?? 0), 0);
  const totalLosses = settled.reduce((sum, r) => sum + Math.min(0, r.result?.valueGained ?? 0), 0);
  const netToday = totalGains + totalLosses;
  const isProfitPositive = totalProfit >= 0;

  return (
    <Screen refreshing={refreshing} onRefresh={handleRefresh}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerLabel}>Your Balance</Text>
          <Text style={styles.balance}>{formatMoney(balance)}</Text>
          <View style={styles.profitPill}>
            <Ionicons
              name={isProfitPositive ? 'trending-up' : 'trending-down'}
              size={11}
              color={isProfitPositive ? colors.success : colors.danger}
            />
            <Text style={[styles.profitPillText, { color: isProfitPositive ? colors.success : colors.danger }]}>
              {formatPercent(totalProfitPercent)}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('RoundHistory')} style={styles.historyLink}>
          <Text style={styles.historyLinkText}>History</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <Card style={styles.summaryCard}>
        <SummaryStat label="Settled" value={`${settled.length}/${rounds.length}`} />
        <View style={styles.summaryDivider} />
        <SummaryStat label="Gains Today" value={formatSigned(totalGains)} color={colors.success} />
        <View style={styles.summaryDivider} />
        <SummaryStat label="Losses Today" value={formatSigned(totalLosses)} color={colors.danger} />
        <View style={styles.summaryDivider} />
        <SummaryStat label="Net" value={formatSigned(netToday)} color={netToday >= 0 ? colors.success : colors.danger} />
      </Card>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Today's Rounds</Text>
        {isAdmin && (
          <TouchableOpacity onPress={() => setDefaultsModalVisible(true)} style={styles.defaultsLink}>
            <Ionicons name="options-outline" size={14} color={colors.primary} />
            <Text style={styles.historyLinkText}>Defaults</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={{ gap: spacing.md }}>
        {rounds.map((round) => (
          <RoundCard key={round.slot.id} round={round} now={now} isAdmin={isAdmin} />
        ))}
      </View>

      <Card style={styles.noteCard}>
        <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
        <Text style={styles.noteText}>
          Change % is based on how close your entered value (1-5) was to the Stock Value. Closer = higher gain,
          farther = small loss, capped at 0.5% of your balance per round.
        </Text>
      </Card>

      {isAdmin && (
        <DefaultValuesModal
          visible={defaultsModalVisible}
          initialValues={defaultStockValues}
          onClose={() => setDefaultsModalVisible(false)}
          onSave={setDefaultStockValues}
        />
      )}
    </Screen>
  );
}

function RoundCard({ round, now, isAdmin }: { round: DailyRound; now: Date; isAdmin: boolean }) {
  const setStockValue = useRoundsStore((s) => s.setStockValue);
  const status = getSlotStatus(round.slot, now);
  const { tone, label } = STATUS_META[status];
  const result = round.result;
  const gainPositive = (result?.valueGained ?? 0) >= 0;
  const isLocked = status === 'settled';

  const countdownTarget =
    status === 'upcoming' ? round.slot.submitTime : status === 'open' ? round.slot.settleTime : null;
  const countdownLabel = status === 'upcoming' ? 'Opens in' : 'Closes in';
  const countdownMs = countdownTarget ? timeOnDate(countdownTarget, now).getTime() - now.getTime() : 0;

  return (
    <Card style={styles.roundCard}>
      <View style={styles.roundHeaderRow}>
        <View style={styles.roundTitleWrap}>
          <View style={styles.roundIndexCircle}>
            <Text style={styles.roundIndexText}>{round.slot.index}</Text>
          </View>
          <View>
            <Text style={styles.roundTitle}>Round {round.slot.index}</Text>
            <Text style={styles.roundTime}>
              {formatTime12h(round.slot.submitTime)} - {formatTime12h(round.slot.settleTime)}
            </Text>
          </View>
        </View>
        <Badge label={label} tone={tone} />
      </View>

      {countdownTarget && (
        <View style={styles.countdownRow}>
          <Text style={styles.countdownLabel}>{countdownLabel}</Text>
          <Text style={styles.countdownValue}>{formatCountdown(countdownMs)}</Text>
        </View>
      )}

      {result ? (
        <View style={styles.resultRow}>
          <MiniStat label="Your Pick" value={String(result.userPrediction ?? '—')} />
          <MiniStat label="Stock Value" value={String(result.stockValue)} />
          <MiniStat label="Deviation" value={result.distance != null ? String(result.distance) : '—'} />
          <View style={styles.resultValueWrap}>
            <Text style={styles.miniStatLabel}>Value</Text>
            <View style={[styles.valuePill, { backgroundColor: gainPositive ? colors.successTint : colors.dangerTint }]}>
              <Text style={[styles.valuePillText, { color: gainPositive ? colors.success : colors.danger }]}>
                {formatSigned(result.valueGained ?? 0)}
              </Text>
            </View>
            <Text style={[styles.changeText, { color: gainPositive ? colors.success : colors.danger }]}>
              {formatPercent(result.changePercent ?? 0)}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.pendingRow}>
          <Ionicons
            name={round.prediction ? 'time-outline' : 'help-circle-outline'}
            size={16}
            color={colors.textDim}
          />
          <Text style={styles.pendingText}>
            {round.prediction
              ? `You picked ${round.prediction.value} · awaiting settlement`
              : status === 'open'
                ? 'Not predicted yet — head to the Predict tab'
                : status === 'upcoming'
                  ? 'Opens later today'
                  : 'No prediction was submitted'}
          </Text>
        </View>
      )}

      {!isLocked && isAdmin && (
        <StockValueControl
          roundId={round.slot.id}
          currentValue={round.stockValue}
          urgent={status === 'awaiting_result'}
          onSet={(value) => setStockValue(round.slot.id, value)}
        />
      )}

      {!isLocked && !isAdmin && round.stockValue != null && (
        <View style={styles.readOnlyStockValueRow}>
          <Ionicons name="pricetag-outline" size={14} color={colors.textMuted} />
          <Text style={styles.readOnlyStockValueText}>Stock Value set to {round.stockValue}</Text>
        </View>
      )}
    </Card>
  );
}

function StockValueControl({
  roundId,
  currentValue,
  urgent,
  onSet,
}: {
  roundId: string;
  currentValue: number | undefined;
  urgent: boolean;
  onSet: (value: number) => Promise<void>;
}) {
  const [text, setText] = useState(currentValue != null ? String(currentValue) : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setError('');
    const value = Number(text);
    if (!Number.isInteger(value) || value < 1 || value > 5) {
      setError('Enter a whole number from 1 to 5.');
      return;
    }
    setSaving(true);
    try {
      await onSet(value);
    } catch (e) {
      setError(getErrorMessage(e, 'Could not save the Stock Value.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.stockValueBox, urgent && styles.stockValueBoxUrgent]}>
      <Text style={[styles.stockValueLabel, urgent && { color: colors.warning }]}>
        {urgent ? 'Round closed — set Stock Value to settle it' : 'Stock Value'}
      </Text>
      <View style={styles.stockValueRow}>
        <TextInput
          key={roundId}
          style={styles.stockValueInput}
          value={text}
          onChangeText={setText}
          keyboardType="number-pad"
          maxLength={1}
          placeholder="1-5"
          placeholderTextColor={colors.textDim}
        />
        <Button
          title={currentValue != null ? 'Update Stock Value' : 'Set Stock Value'}
          size="sm"
          variant={urgent ? 'primary' : 'outline'}
          onPress={handleSave}
          loading={saving}
          style={{ flex: 1 }}
        />
      </View>
      {!!error && <FormError message={error} />}
    </View>
  );
}

function DefaultValuesModal({
  visible,
  initialValues,
  onClose,
  onSave,
}: {
  visible: boolean;
  initialValues: Record<string, number>;
  onClose: () => void;
  onSave: (values: Record<string, number>) => Promise<void>;
}) {
  const rounds = useRoundsStore((s) => s.rounds);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function seedIfNeeded() {
    if (Object.keys(values).length === 0 && rounds.length > 0) {
      const seeded: Record<string, string> = {};
      for (const r of rounds) {
        const v = initialValues[r.slot.id];
        seeded[r.slot.id] = v != null ? String(v) : '';
      }
      setValues(seeded);
    }
  }

  async function handleSave() {
    setError('');
    const parsed: Record<string, number> = {};
    for (const [roundId, text] of Object.entries(values)) {
      if (!text.trim()) continue;
      const n = Number(text);
      if (!Number.isInteger(n) || n < 1 || n > 5) {
        setError('Every default must be a whole number from 1 to 5 (or left blank).');
        return;
      }
      parsed[roundId] = n;
    }
    setSaving(true);
    try {
      await onSave(parsed);
      onClose();
    } catch (e) {
      setError(getErrorMessage(e, 'Could not save defaults.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onShow={seedIfNeeded} onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Default Stock Values</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={styles.modalSubtitle}>
            Applied automatically to each round unless you set one manually. Leave blank to require a manual value.
          </Text>

          <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
            {rounds.map((r) => (
              <View key={r.slot.id} style={styles.modalRow}>
                <Text style={styles.modalRowLabel}>
                  Round {r.slot.index} · {formatTime12h(r.slot.submitTime)}
                </Text>
                <TextInput
                  style={styles.modalInput}
                  value={values[r.slot.id] ?? ''}
                  onChangeText={(t) => setValues((prev) => ({ ...prev, [r.slot.id]: t }))}
                  keyboardType="number-pad"
                  maxLength={1}
                  placeholder="1-5"
                  placeholderTextColor={colors.textDim}
                />
              </View>
            ))}
          </ScrollView>

          {!!error && <FormError message={error} />}

          <Button title="Save Defaults" onPress={handleSave} loading={saving} style={{ marginTop: spacing.md }} />
        </View>
      </View>
    </Modal>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'flex-start' }}>
      <Text style={styles.miniStatLabel}>{label}</Text>
      <Text style={styles.miniStatValue}>{value}</Text>
    </View>
  );
}

function SummaryStat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

const STATUS_META: Record<RoundStatus, { label: string; tone: BadgeTone }> = {
  upcoming: { label: 'Upcoming', tone: 'neutral' },
  open: { label: 'Open', tone: 'primary' },
  awaiting_result: { label: 'Awaiting', tone: 'warning' },
  settled: { label: 'Settled', tone: 'info' },
};

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLabel: { ...typography.small, color: colors.textMuted },
  balance: { ...typography.h1, color: colors.text, marginTop: 2 },
  profitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  profitPillText: { ...typography.small, fontWeight: '700' },
  historyLink: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: spacing.xs },
  historyLinkText: { ...typography.small, color: colors.primary, fontWeight: '700' },
  summaryCard: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, backgroundColor: colors.surfaceAlt },
  summaryDivider: { width: 1, height: 32, backgroundColor: colors.border },
  summaryLabel: { ...typography.tiny, color: colors.textMuted },
  summaryValue: { ...typography.h3, color: colors.text, marginTop: 2 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.h3, color: colors.text },
  defaultsLink: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  roundCard: {},
  roundHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roundTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  roundIndexCircle: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundIndexText: { ...typography.h3, color: colors.onPrimary },
  roundTitle: { ...typography.h3, color: colors.text },
  roundTime: { ...typography.tiny, color: colors.textMuted, marginTop: 1 },
  countdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  countdownLabel: { ...typography.small, color: colors.textMuted },
  countdownValue: { ...typography.h3, color: colors.primary, fontVariant: ['tabular-nums'] },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  resultValueWrap: { alignItems: 'flex-end' },
  miniStatLabel: { ...typography.tiny, color: colors.textMuted },
  miniStatValue: { ...typography.h3, color: colors.text, marginTop: 2 },
  valuePill: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3, marginTop: 2 },
  valuePillText: { ...typography.small, fontWeight: '800' },
  changeText: { ...typography.tiny, fontWeight: '700', marginTop: 3 },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pendingText: { ...typography.small, color: colors.textDim, flex: 1 },
  stockValueBox: {
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stockValueBoxUrgent: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    borderTopWidth: 0,
    backgroundColor: colors.warningTint,
    borderRadius: radius.md,
  },
  stockValueLabel: { ...typography.tiny, color: colors.textMuted, marginBottom: spacing.xs, fontWeight: '700' },
  stockValueRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  stockValueInput: {
    width: 56,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    textAlign: 'center',
    ...typography.h3,
  },
  readOnlyStockValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  readOnlyStockValueText: { ...typography.tiny, color: colors.textMuted },
  noteCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
  },
  noteText: { ...typography.small, color: colors.textMuted, lineHeight: 18, flex: 1 },
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { ...typography.h3, color: colors.text },
  modalSubtitle: { ...typography.small, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.md, lineHeight: 18 },
  modalScroll: { maxHeight: 420 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm },
  modalRowLabel: { ...typography.body, color: colors.text },
  modalInput: {
    width: 60,
    height: 40,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    textAlign: 'center',
    ...typography.h3,
  },
});

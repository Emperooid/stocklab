import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Badge, BadgeTone } from '../../components/Badge';
import { PredictionControl } from '../../components/PredictionControl';
import { RoundAutoPlayControl } from '../../components/RoundAutoPlayControl';
import { Colors, layout, radius, spacing, typography, useColors } from '../../theme/theme';
import { computeTodayProfit, useRoundsStore } from '../../store/roundsStore';
import { useWalletStore } from '../../store/walletStore';
import { useAuthStore } from '../../store/authStore';
import { useRoundsLiveRefresh } from '../../hooks/useRoundsLiveRefresh';
import { getSlotStatus, slotSettleAt, formatCountdown } from '../../lib/schedule';
import { formatMoney, formatPercent, formatSigned, formatTime12h } from '../../lib/format';
import { DailyRound, RoundStatus } from '../../types';
import { MainStackParamList } from '../../navigation/types';

export default function RoundsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { rounds, fetchRounds } = useRoundsStore();
  const { balance, refresh } = useWalletStore();
  const now = useRoundsLiveRefresh();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchRounds().catch(() => {});
      refresh().catch(() => {});
    }, [])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([fetchRounds(), refresh()]);
    setRefreshing(false);
  }

  const settled = rounds.filter((r) => r.result);
  const totalGains = settled.reduce((sum, r) => sum + Math.max(0, r.result?.valueGained ?? 0), 0);
  const totalLosses = settled.reduce((sum, r) => sum + Math.min(0, r.result?.valueGained ?? 0), 0);
  const { profit: netToday, profitPercent: netTodayPercent } = computeTodayProfit(rounds);
  const isProfitPositive = netToday >= 0;

  return (
    <Screen refreshing={refreshing} onRefresh={handleRefresh}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerLabel}>Your Balance</Text>
          <Text style={styles.balance} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {formatMoney(balance)}
          </Text>
          <View style={styles.profitPill}>
            <Ionicons
              name={isProfitPositive ? 'trending-up' : 'trending-down'}
              size={11}
              color={isProfitPositive ? colors.success : colors.danger}
            />
            <Text style={[styles.profitPillText, { color: isProfitPositive ? colors.success : colors.danger }]}>
              {formatPercent(netTodayPercent)}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('RoundHistory')} style={styles.historyLink}>
          <Text style={styles.historyLinkText}>History</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <Card style={styles.summaryCard}>
        <SummaryStat label="Settled" value={`${settled.length}/${rounds.length}`} colors={colors} />
        <View style={styles.summaryDivider} />
        <SummaryStat label="Gains Today" value={formatSigned(totalGains)} color={colors.success} colors={colors} />
        <View style={styles.summaryDivider} />
        <SummaryStat label="Losses Today" value={formatSigned(totalLosses)} color={colors.danger} colors={colors} />
        <View style={styles.summaryDivider} />
        <SummaryStat label="Net" value={formatSigned(netToday)} color={netToday >= 0 ? colors.success : colors.danger} colors={colors} />
      </Card>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Today's Rounds</Text>
      </View>

      <View style={{ gap: spacing.md }}>
        {rounds.map((round) => (
          <RoundCard key={round.slot.id} round={round} now={now} />
        ))}
      </View>

      <Card style={styles.noteCard}>
        <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
        <Text style={styles.noteText}>
          Every round accepts a stock pick right up until its own close time — you don't have to wait for its hour
          to arrive, but you can only play each round once. Once a round settles, results are based on the
          average pick across all players that round — the closer your number was to the average, the higher
          your gain; the farther away, the bigger the loss.
        </Text>
      </Card>
    </Screen>
  );
}

function RoundCard({ round, now }: { round: DailyRound; now: Date }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const submitPrediction = useRoundsStore((s) => s.submitPrediction);
  const slotAmount = useAuthStore((s) => s.user?.slotAmount);
  const status = getSlotStatus(round.slot, now);
  const result = round.result;
  const gainPositive = result?.finalOutcome ? result.finalOutcome === 'gain' : (result?.valueGained ?? 0) >= 0;
  const isSettled = !!result;

  // A round accepts input from right now until ITS OWN close time — no
  // waiting for its nominal submit time to arrive. "Upcoming" is gone as a
  // locked state: a round not yet in its submit window is treated the same
  // as "Open" for input purposes. It locks the moment its close time hits.
  const isOpen = status === 'upcoming' || status === 'open';
  const { tone, label } = isOpen ? STATUS_META.open : STATUS_META[status];

  const countdownTarget = isOpen ? slotSettleAt(round.slot, now) : null;
  const countdownLabel = 'Closes in';
  const countdownMs = countdownTarget ? countdownTarget.getTime() - now.getTime() : 0;

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

      {result && (
        <View style={styles.resultRow}>
          <MiniStat label="Your Pick" value={String(result.userPrediction ?? '—')} colors={colors} />
          <MiniStat label="Avg Pick" value={result.average != null ? result.average.toFixed(2) : '—'} colors={colors} />
          <MiniStat label="Deviation" value={result.distance != null ? result.distance.toFixed(2) : '—'} colors={colors} />
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
      )}

      {!isSettled && !isOpen && (
        <View style={styles.pendingRow}>
          <Ionicons name={round.prediction ? 'time-outline' : 'help-circle-outline'} size={16} color={colors.textDim} />
          <Text style={styles.pendingText}>
            {round.prediction
              ? `You picked ${round.prediction.value} — waiting for the result`
              : 'Round closed — no stock was submitted'}
          </Text>
        </View>
      )}

      {isOpen && (
        <View style={styles.predictBox}>
          <RoundAutoPlayControl roundId={round.slot.id} disabled={round.prediction != null} />
          <PredictionControl
            roundId={round.slot.id}
            currentValue={round.prediction?.value}
            slotAmount={slotAmount}
            onSubmit={(value, amount) => submitPrediction(round.slot.id, value, amount)}
          />
        </View>
      )}
    </Card>
  );
}

function MiniStat({ label, value, colors }: { label: string; value: string; colors: Colors }) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={{ alignItems: 'flex-start', flexShrink: 1 }}>
      <Text style={styles.miniStatLabel}>{label}</Text>
      <Text style={styles.miniStatValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
    </View>
  );
}

function SummaryStat({ label, value, color, colors }: { label: string; value: string; color?: string; colors: Colors }) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={styles.summaryLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.summaryValue, color ? { color } : null]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
    </View>
  );
}

const STATUS_META: Record<RoundStatus, { label: string; tone: BadgeTone }> = {
  upcoming: { label: 'Upcoming', tone: 'neutral' },
  open: { label: 'Open', tone: 'primary' },
  awaiting_result: { label: 'Awaiting', tone: 'warning' },
  settled: { label: 'Settled', tone: 'info' },
};

function createStyles(colors: Colors) {
  return StyleSheet.create({
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
    summaryCard: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.lg,
      backgroundColor: colors.surfaceAlt,
      // Four columns + three dividers is tight on narrow phones (<360px) —
      // tighter horizontal padding buys the stat values more room before
      // adjustsFontSizeToFit has to kick in.
      paddingHorizontal: layout.isSmallDevice ? spacing.sm : spacing.lg,
    },
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
    predictBox: {
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    noteCard: {
      flexDirection: 'row',
      gap: spacing.sm,
      marginTop: spacing.xl,
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.lg,
    },
    noteText: { ...typography.small, color: colors.textMuted, lineHeight: 18, flex: 1 },
  });
}

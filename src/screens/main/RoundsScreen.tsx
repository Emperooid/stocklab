import { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Badge, BadgeTone } from '../../components/Badge';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useRoundsStore } from '../../store/roundsStore';
import { useWalletStore } from '../../store/walletStore';
import { useRoundsLiveRefresh } from '../../hooks/useRoundsLiveRefresh';
import { getSlotStatus } from '../../lib/schedule';
import { formatMoney, formatPercent, formatSigned, formatTime12h } from '../../lib/format';
import { DailyRound, RoundStatus } from '../../types';
import { MainStackParamList } from '../../navigation/types';

export default function RoundsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { rounds, fetchRounds } = useRoundsStore();
  const { balance, totalProfit, totalProfitPercent, refresh } = useWalletStore();
  const now = useRoundsLiveRefresh();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchRounds();
      refresh();
    }, [])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([fetchRounds(), refresh()]);
    setRefreshing(false);
  }

  const settled = rounds.filter((r) => r.result);
  const totalGain = settled.reduce((sum, r) => sum + (r.result?.valueGained ?? 0), 0);
  const totalChange = settled.reduce((sum, r) => sum + (r.result?.changePercent ?? 0), 0);
  const isProfitPositive = totalProfit >= 0;

  return (
    <Screen refreshing={refreshing} onRefresh={handleRefresh}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerLabel}>Your Balance</Text>
          <Text style={styles.balance}>{formatMoney(balance)}</Text>
          <Text style={[styles.profitValue, { color: isProfitPositive ? colors.success : colors.danger }]}>
            {formatSigned(totalProfit)} ({formatPercent(totalProfitPercent)})
          </Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('RoundHistory')} style={styles.historyLink}>
          <Text style={styles.historyLinkText}>History</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <Card style={styles.summaryCard}>
        <SummaryStat label="Settled" value={`${settled.length}/5`} />
        <View style={styles.summaryDivider} />
        <SummaryStat label="Gain" value={formatSigned(totalGain)} color={totalGain >= 0 ? colors.success : colors.danger} />
        <View style={styles.summaryDivider} />
        <SummaryStat label="Change" value={formatPercent(totalChange)} color={totalChange >= 0 ? colors.success : colors.danger} />
      </Card>

      <Text style={styles.sectionTitle}>Today's Rounds</Text>

      <View style={{ gap: spacing.md }}>
        {rounds.map((round) => (
          <RoundCard key={round.slot.id} round={round} now={now} />
        ))}
      </View>

      <Card style={styles.noteCard}>
        <Ionicons name="information-circle-outline" size={18} color={colors.textMuted} />
        <Text style={styles.noteText}>
          Change % is based on how close your entered value (1-5) was to the Stock Value. Closer = higher gain,
          farther = small loss, capped at 0.5% of your balance per round.
        </Text>
      </Card>
    </Screen>
  );
}

function RoundCard({ round, now }: { round: DailyRound; now: Date }) {
  const status = getSlotStatus(round.slot, now);
  const { tone, label } = STATUS_META[status];
  const result = round.result;
  const gainPositive = (result?.valueGained ?? 0) >= 0;

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
              {formatTime12h(round.slot.submitTime)} → {formatTime12h(round.slot.settleTime)}
            </Text>
          </View>
        </View>
        <Badge label={label} tone={tone} />
      </View>

      {result ? (
        <View style={styles.statGrid}>
          <StatTile label="Your pick" value={String(result.userPrediction ?? '—')} />
          <StatTile label="Stock value" value={String(result.stockValue)} />
          <StatTile
            label="Change"
            value={formatPercent(result.changePercent ?? 0)}
            color={gainPositive ? colors.success : colors.danger}
          />
          <StatTile
            label="Result"
            value={formatSigned(result.valueGained ?? 0)}
            color={gainPositive ? colors.success : colors.danger}
            bold
          />
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
    </Card>
  );
}

function StatTile({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statTileLabel}>{label}</Text>
      <Text style={[styles.statTileValue, bold && { fontWeight: '800' }, color ? { color } : null]}>{value}</Text>
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
  profitValue: { ...typography.small, marginTop: 4, fontWeight: '700' },
  historyLink: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: spacing.xs },
  historyLinkText: { ...typography.small, color: colors.primary, fontWeight: '700' },
  summaryCard: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg, backgroundColor: colors.surfaceAlt },
  summaryDivider: { width: 1, height: 32, backgroundColor: colors.border },
  summaryLabel: { ...typography.tiny, color: colors.textMuted },
  summaryValue: { ...typography.h3, color: colors.text, marginTop: 2 },
  sectionTitle: { ...typography.h3, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
  roundCard: {},
  roundHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roundTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  roundIndexCircle: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundIndexText: { ...typography.h3, color: colors.primary },
  roundTitle: { ...typography.h3, color: colors.text },
  roundTime: { ...typography.tiny, color: colors.textMuted, marginTop: 1 },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.md,
    marginHorizontal: -spacing.xs,
  },
  statTile: { width: '50%', paddingHorizontal: spacing.xs, paddingVertical: spacing.xs },
  statTileLabel: { ...typography.tiny, color: colors.textMuted },
  statTileValue: { ...typography.body, color: colors.text, fontWeight: '700', marginTop: 2 },
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
  noteCard: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xl,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
  },
  noteText: { ...typography.small, color: colors.textMuted, lineHeight: 18, flex: 1 },
});

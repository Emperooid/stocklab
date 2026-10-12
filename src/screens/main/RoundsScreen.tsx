import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { BadgeTone } from '../../components/Badge';
import { AnalogClock } from '../../components/AnalogClock';
import { PredictionControl } from '../../components/PredictionControl';
import { RoundAutoPlayControl } from '../../components/RoundAutoPlayControl';
import { Colors, layout, moderateScale, radius, ROUND_CARD_PALETTES, spacing, typography, useColors } from '../../theme/theme';
import { computeTodayProfit, useRoundsStore } from '../../store/roundsStore';
import { useWalletStore } from '../../store/walletStore';
import { useAuthStore } from '../../store/authStore';
import { useRoundsLiveRefresh } from '../../hooks/useRoundsLiveRefresh';
import { getSlotStatus, slotSettleAt, formatCountdown } from '../../lib/schedule';
import { formatMoney, formatPercent, formatSigned, formatTime12h } from '../../lib/format';
import { shade } from '../../lib/colorMath';
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
        <TouchableOpacity
          onPress={() => navigation.navigate('RoundHistory')}
          style={styles.historyLink}
          accessibilityRole="button"
          accessibilityLabel="All Results"
        >
          <Text style={styles.historyLinkText}>All Results</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <Card style={styles.summaryCard}>
        <SummaryStat label="Played" value={`${settled.length}/${rounds.length}`} colors={colors} />
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
  const palette = ROUND_CARD_PALETTES[round.slot.index % ROUND_CARD_PALETTES.length];

  // A round accepts input from right now until ITS OWN close time — no
  // waiting for its nominal submit time to arrive. "Upcoming" is gone as a
  // locked state: a round not yet in its submit window is treated the same
  // as "Open" for input purposes. It locks the moment its close time hits.
  const isOpen = status === 'upcoming' || status === 'open';
  const { label } = isOpen ? STATUS_META.open : STATUS_META[status];

  const countdownTarget = isOpen ? slotSettleAt(round.slot, now) : null;
  const countdownMs = countdownTarget ? countdownTarget.getTime() - now.getTime() : 0;

  const [hh] = round.slot.submitTime.split(':').map(Number);
  const timeLabel = formatTime12h(round.slot.submitTime);
  const [timeDigits, timePeriod] = timeLabel.split(' ');

  return (
    <LinearGradient
      colors={[shade(palette.accent, 0.12), palette.accent, shade(palette.accent, -0.14)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.roundCard}
    >
      <View style={styles.vibrantHeaderRow}>
        <AnalogClock hour={hh} ringColor={palette.accent} />
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <View style={styles.statusPill}>
            <Text style={styles.statusPillText}>{label}</Text>
          </View>
          <View style={styles.timePill}>
            <Text style={styles.timePillDigits}>{timeDigits}</Text>
            <Text style={styles.timePillPeriod}>{timePeriod}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.vibrantHeadline}>
        Round {round.slot.index}{'\n'}
        <Text style={styles.vibrantHeadlineAccent}>pick your figure</Text>
      </Text>

      {countdownTarget && (
        <View style={styles.vPanel}>
          <Text style={styles.vPanelLabel}>CLOSES IN</Text>
          <Text style={styles.countdownValue}>{formatCountdown(countdownMs)}</Text>
        </View>
      )}

      {result && (
        <View style={styles.vPanel}>
          <View style={styles.resultRow}>
            <MiniStat label="Entry figure" value={String(result.userPrediction ?? '—')} />
            <MiniStat label="Winning figure" value={result.average != null && result.average > 0 ? result.average.toFixed(2) : '—'} />
            <MiniStat label="Off by" value={result.distance != null ? result.distance.toFixed(2) : '—'} />
          </View>
          <View style={styles.resultValueRow}>
            <Text style={styles.vPanelLabel}>VALUE</Text>
            <View style={[styles.valuePill, { backgroundColor: gainPositive ? 'rgba(52,217,155,0.26)' : 'rgba(255,107,126,0.26)' }]}>
              <Text style={[styles.valuePillText, { color: gainPositive ? '#34D99B' : '#FF6B7E' }]}>
                {formatSigned(result.valueGained ?? 0)}
              </Text>
            </View>
            <Text style={[styles.changeText, { color: gainPositive ? '#34D99B' : '#FF6B7E' }]}>
              {formatPercent(result.changePercent ?? 0)}
            </Text>
          </View>
        </View>
      )}

      {!isSettled && !isOpen && (
        <View style={[styles.vPanel, styles.pendingRow]}>
          <Ionicons name={round.prediction ? 'time-outline' : 'help-circle-outline'} size={16} color="#FFFFFF" />
          <Text style={styles.pendingText}>
            {round.prediction
              ? `Entry figure ${round.prediction.value} — waiting for the result`
              : 'Round closed — no stock was submitted'}
          </Text>
        </View>
      )}

      {isOpen && (
        <>
          <RoundAutoPlayControl roundId={round.slot.id} disabled={round.prediction != null} vibrant />
          <PredictionControl
            roundId={round.slot.id}
            currentValue={round.prediction?.value}
            slotAmount={slotAmount}
            onSubmit={(value, amount) => submitPrediction(round.slot.id, value, amount)}
            vibrant
          />
        </>
      )}
    </LinearGradient>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: 'flex-start', flexShrink: 1 }}>
      <Text style={miniStatStyles.label}>{label}</Text>
      <Text style={miniStatStyles.value} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
    </View>
  );
}

const miniStatStyles = StyleSheet.create({
  label: { ...typography.tiny, color: 'rgba(255,255,255,0.75)' },
  value: { ...typography.h3, color: '#FFFFFF', marginTop: 2 },
});

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
    roundCard: {
      borderRadius: radius.xl,
      padding: spacing.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.2,
      shadowRadius: 16,
      elevation: 6,
    },
    vibrantHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
    statusPill: {
      backgroundColor: 'rgba(255,255,255,0.25)',
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm + 2,
      paddingVertical: 3,
    },
    statusPillText: { ...typography.tiny, color: '#FFFFFF', fontWeight: '800' },
    timePill: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 4,
      backgroundColor: 'rgba(255,255,255,0.22)',
      borderRadius: radius.pill,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
    },
    timePillDigits: { fontSize: 24, fontWeight: '900', color: '#FFFFFF' },
    timePillPeriod: { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.85)' },
    vibrantHeadline: { fontSize: moderateScale(21), fontWeight: '800', color: '#FFFFFF', lineHeight: 28, marginBottom: spacing.lg },
    vibrantHeadlineAccent: { color: '#FFE86B' },
    vPanel: {
      backgroundColor: 'rgba(255,255,255,0.16)',
      borderRadius: radius.lg,
      padding: spacing.md,
      marginBottom: spacing.lg,
    },
    vPanelLabel: { ...typography.tiny, color: 'rgba(255,255,255,0.75)', fontWeight: '800', letterSpacing: 0.5 },
    countdownValue: { ...typography.h2, color: '#FFFFFF', fontVariant: ['tabular-nums'], marginTop: 2 },
    resultRow: { flexDirection: 'row', justifyContent: 'space-between' },
    resultValueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
    valuePill: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
    valuePillText: { ...typography.small, fontWeight: '800' },
    changeText: { ...typography.small, fontWeight: '700' },
    pendingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 0 },
    pendingText: { ...typography.small, color: '#FFFFFF', flex: 1, lineHeight: 18 },
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

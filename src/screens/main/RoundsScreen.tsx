import { useCallback, useMemo, useState } from 'react';
import { ColorValue, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Badge, BadgeTone } from '../../components/Badge';
import { AppIcon } from '../../components/AppIcon';
import { IconBubble } from '../../components/IconBubble';
import { SectionHeader } from '../../components/SectionHeader';
import { StatTile } from '../../components/StatTile';
import { Button } from '../../components/Button';
import { PredictionControl } from '../../components/PredictionControl';
import { RoundAutoPlayControl } from '../../components/RoundAutoPlayControl';
import { withAlpha } from '../../lib/color';
import { Colors, layout, moderateScale, radius, ROUND_CARD_PALETTES, shadow, spacing, typography, useColors } from '../../theme/theme';
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
      <Card variant="sticker" tone="hero" style={styles.heroWrap}>
        <View pointerEvents="none" style={[styles.heroGlow, { backgroundColor: colors.accent, ...shadow.lg }]} />
        <View style={styles.heroTopRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.eyebrow, { color: withAlpha(colors.cream, 0.82) }]}>YOUR BALANCE</Text>
            <Text style={styles.balance} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
              {formatMoney(balance)}
            </Text>
            <View
              style={[
                styles.profitPill,
                { backgroundColor: withAlpha(isProfitPositive ? colors.success : colors.danger, 0.24) },
              ]}
            >
              <AppIcon name={isProfitPositive ? 'trend-up' : 'trend-down'} size={13} color={colors.cream} />
              <Text style={[styles.profitPillText, { color: colors.cream }]}>{formatPercent(netTodayPercent)}</Text>
              <Text style={[styles.profitPillText, { color: withAlpha(colors.cream, 0.78) }]}>today</Text>
            </View>
          </View>
          <IconBubble
            name="sparkle"
            size={54}
            iconSize={30}
            background={withAlpha(colors.cream, 0.2)}
            style={styles.heroBubble}
          />
        </View>
        <Button
          title="All results"
          icon="trophy"
          variant="cream"
          size="sm"
          onPress={() => navigation.navigate('RoundHistory')}
        />
      </Card>

      <SectionHeader title="Today at a glance" eyebrow="TODAY'S TALLY" />
      <View style={styles.tilesRow}>
        <StatTile
          icon="stock"
          label="Rounds settled"
          value={`${settled.length}/${rounds.length}`}
          color={colors.blue}
        />
        <StatTile icon="trend-up" label="Gains today" value={formatSigned(totalGains)} color={colors.success} />
      </View>
      <View style={styles.tilesRow}>
        <StatTile icon="trend-down" label="Losses today" value={formatSigned(totalLosses)} color={colors.danger} />
        <StatTile
          icon="coin"
          label="Net today"
          value={formatSigned(netToday)}
          color={netToday >= 0 ? colors.success : colors.danger}
        />
      </View>

      <SectionHeader title="Today's Rounds" eyebrow="ROUND BY ROUND" />
      <View style={{ gap: spacing.md }}>
        {rounds.map((round) => (
          <RoundCard key={round.slot.id} round={round} now={now} />
        ))}
      </View>

      <Card tone="info" style={styles.noteCard}>
        <IconBubble name="info" size={38} iconSize={19} color={colors.blue} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.noteTitle, { color: colors.text }]}>How payouts work</Text>
          <Text style={styles.noteText}>
            Every round accepts a stock pick right up until its own close time — you don't have to wait for its hour
            to arrive, but you can only play each round once. Once a round settles, results are based on the
            average pick across all players that round — the closer your number was to the average, the higher
            your gain; the farther away, the bigger the loss.
          </Text>
        </View>
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
  // slot.index is 0-based (it matches the hour), so index directly — the old
  // `(index - 1) % length` produced -1 for the midnight round, and palette[-1]
  // is undefined, which crashed the whole Rounds screen. (Pre-existing bug.)
  const palette = ROUND_CARD_PALETTES[round.slot.index % ROUND_CARD_PALETTES.length];
  const tint = (alpha: number): ColorValue => withAlpha(palette.accent, alpha);
  const rule = withAlpha(palette.ink, 0.14);

  // A round accepts input from right now until ITS OWN close time — no
  // waiting for its nominal submit time to arrive. "Upcoming" is gone as a
  // locked state: a round not yet in its submit window is treated the same
  // as "Open" for input purposes. It locks the moment its close time hits.
  const isOpen = status === 'upcoming' || status === 'open';
  const { tone, label } = isOpen ? STATUS_META.open : STATUS_META[status];
  const { tone: darkTone, label: darkLabel } = STATUS_META[status];

  const countdownTarget = isOpen ? slotSettleAt(round.slot, now) : null;
  const countdownLabel = 'Closes in';
  const countdownMs = countdownTarget ? countdownTarget.getTime() - now.getTime() : 0;

  return (
    <Card style={[styles.roundCard, { backgroundColor: palette.background, borderColor: palette.border }]}>
      <View style={styles.roundHeaderRow}>
        <View style={styles.roundTitleWrap}>
          <View style={[styles.roundIndexChip, { backgroundColor: palette.accent }]}>
            <Text style={styles.roundIndexText}>{String(round.slot.index).padStart(2, '0')}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[styles.roundTitle, { color: palette.ink }]} numberOfLines={1}>
              Round {round.slot.index}
            </Text>
            <View style={styles.roundTimeRow}>
              <AppIcon name="clock" size={12} color={palette.ink} opacity={0.66} />
              <Text style={[styles.roundTime, { color: palette.ink }]} numberOfLines={1}>
                {formatTime12h(round.slot.submitTime)} - {formatTime12h(round.slot.settleTime)}
              </Text>
            </View>
          </View>
        </View>
        <Badge label={darkLabel} tone={darkTone} size="sm" />
      </View>

      {countdownTarget && (
        <View style={[styles.countdownRow, { backgroundColor: tint(0.1), borderColor: rule }]}>
          <IconBubble
            name="bolt"
            size={32}
            iconSize={17}
            color={palette.accent}
            background={withAlpha('#FFFFFF', 0.7)}
          />
          <Text style={[styles.countdownLabel, { color: palette.ink }]}>{countdownLabel}</Text>
          <Text style={[styles.countdownValue, { color: palette.accent }]}>{formatCountdown(countdownMs)}</Text>
        </View>
      )}

      {result && (
        <View style={[styles.resultRow, { borderTopColor: rule }]}>
          <MiniStat label="Your Pick" value={String(result.userPrediction ?? '—')} colors={colors} ink={palette.ink} />
          <MiniStat label="Avg Pick" value={result.average != null ? result.average.toFixed(2) : '—'} colors={colors} ink={palette.ink} />
          <MiniStat label="Deviation" value={result.distance != null ? result.distance.toFixed(2) : '—'} colors={colors} ink={palette.ink} />
          <View style={styles.resultValueWrap}>
            <Text style={[styles.miniStatLabel, { color: palette.ink, opacity: 0.72 }]}>Value</Text>
            <View
              style={[
                styles.valuePill,
                { backgroundColor: withAlpha(gainPositive ? colors.success : colors.danger, 0.16) },
              ]}
            >
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
        <View style={[styles.pendingRow, { borderTopColor: rule }]}>
          <AppIcon name={round.prediction ? 'clock' : 'help'} size={16} color={palette.ink} opacity={0.8} />
          <Text style={[styles.pendingText, { color: palette.ink }]}>
            {round.prediction
              ? `You picked ${round.prediction.value} — waiting for the result`
              : 'Round closed — no stock was submitted'}
          </Text>
        </View>
      )}

      {isOpen && (
        <View style={[styles.predictBox, { borderTopColor: rule }]}>
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

function MiniStat({ label, value, colors, ink }: { label: string; value: string; colors: Colors; ink?: string }) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={{ alignItems: 'flex-start', flexShrink: 1 }}>
      <Text style={[styles.miniStatLabel, ink ? { color: ink, opacity: 0.72 } : null]}>{label}</Text>
      <Text style={[styles.miniStatValue, ink ? { color: ink } : null]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
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
    heroWrap: { paddingBottom: 0 },
    heroGlow: {
      position: 'absolute',
      width: 210,
      height: 210,
      borderRadius: 105,
      top: -90,
      right: -70,
      opacity: 0.5,
    },
    heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
    heroBubble: { borderRadius: 18 },
    eyebrow: { ...typography.label },
    balance: { ...typography.h1, color: colors.cream, marginTop: 3 },
    profitPill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      marginTop: spacing.sm,
    },
    profitPillText: { ...typography.small, fontWeight: '800' },
    tilesRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md },
    roundCard: { overflow: 'hidden', borderWidth: 1.5, padding: spacing.lg, borderRadius: radius.xl },
    roundHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    roundTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1, flex: 1 },
    roundIndexChip: {
      width: 42,
      height: 42,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    roundIndexText: { ...typography.h3, color: '#FFFFFF', fontVariant: ['tabular-nums'] },
    roundTitle: { ...typography.h3, fontSize: moderateScale(17) },
    roundTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
    roundTime: { ...typography.tiny, opacity: 0.72 },
    countdownRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      marginTop: spacing.md,
      borderRadius: radius.md,
      borderWidth: 1,
      padding: spacing.sm,
    },
    countdownLabel: { ...typography.small, fontWeight: '700', flex: 1, opacity: 0.72 },
    countdownValue: { ...typography.h3, fontVariant: ['tabular-nums'] },
    resultRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
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
    },
    pendingText: { ...typography.small, color: colors.textDim, flex: 1, fontWeight: '600' },
    predictBox: {
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
    },
    noteCard: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl, borderRadius: radius.xl },
    noteTitle: { ...typography.h3, marginBottom: 3 },
    noteText: { ...typography.small, color: colors.textMuted, lineHeight: 18 },
  });
}

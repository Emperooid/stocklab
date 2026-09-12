import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { CountdownBadge } from '../../components/CountdownBadge';
import { Colors, radius, spacing, typography, useColors } from '../../theme/theme';
import { Badge, BadgeTone } from '../../components/Badge';
import { useAuthStore } from '../../store/authStore';
import { useWalletStore } from '../../store/walletStore';
import { useInviteStore } from '../../store/inviteStore';
import { useAutoPlayStore } from '../../store/autoPlayStore';
import { computeTodayProfit, useRoundsStore } from '../../store/roundsStore';
import { useRoundsLiveRefresh } from '../../hooks/useRoundsLiveRefresh';
import { ROUND_SLOTS, getSlotStatus } from '../../lib/schedule';
import { formatMoney, formatPercent, formatSigned, formatTime12h } from '../../lib/format';
import { DailyRound, RoundStatus, WalletTransaction } from '../../types';
import { MainStackParamList, MainTabParamList } from '../../navigation/types';

const TX_ICON: Record<WalletTransaction['type'], keyof typeof Ionicons.glyphMap> = {
  deposit: 'arrow-down-circle',
  withdrawal: 'arrow-up-circle',
  round_stake: 'game-controller-outline',
  round_gain: 'trending-up',
  round_loss: 'trending-down',
};

const ROUND_STATUS_META: Record<RoundStatus, { label: string; tone: BadgeTone }> = {
  upcoming: { label: 'Upcoming', tone: 'neutral' },
  open: { label: 'Open', tone: 'primary' },
  awaiting_result: { label: 'Awaiting', tone: 'warning' },
  settled: { label: 'Settled', tone: 'info' },
};

export default function HomeScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const stackNavigation = navigation.getParent<NativeStackNavigationProp<MainStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const { balance, transactions, refresh } = useWalletStore();
  const { rounds, fetchRounds } = useRoundsStore();
  const inviteStats = useInviteStore((s) => s.stats);
  const fetchInviteStats = useInviteStore((s) => s.fetchStats);
  const autoPlaySlots = useAutoPlayStore((s) => s.slots);
  const autoPlayLoaded = useAutoPlayStore((s) => s.loaded);
  const loadAutoPlayFromServer = useAutoPlayStore((s) => s.loadFromServer);
  const now = useRoundsLiveRefresh();
  const [refreshing, setRefreshing] = useState(false);
  const { profit: totalProfit, profitPercent: totalProfitPercent } = computeTodayProfit(rounds);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => {});
      fetchRounds().catch(() => {});
      fetchInviteStats().catch(() => {});
      loadAutoPlayFromServer().catch(() => {});
    }, [])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([refresh(), fetchRounds(), fetchInviteStats().catch(() => {}), loadAutoPlayFromServer().catch(() => {})]);
    setRefreshing(false);
  }

  const hasNews = !!user?.alertMessage || !!user?.newsMessage;
  const openRound = rounds.find((r) => getSlotStatus(r.slot, now) === 'open' && !r.prediction);
  const settledToday = rounds.filter((r) => r.result).length;
  const latestResult = [...rounds].reverse().find((r) => r.result);
  const isProfitPositive = totalProfit >= 0;
  const upcomingRounds = rounds
    .filter((r) => getSlotStatus(r.slot, now) !== 'settled')
    .sort((a, b) => a.slot.index - b.slot.index)
    .slice(0, 3);
  const autoPlayEnabledCount = ROUND_SLOTS.filter((slot) => autoPlaySlots[slot.id]?.enabled).length;
  const recentTransactions = transactions.slice(0, 3);

  return (
    <Screen refreshing={refreshing} onRefresh={handleRefresh}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>WELCOME BACK</Text>
          <Text style={styles.greeting}>{user?.name?.split(' ')[0] ?? 'Trader'}</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.bellButton} onPress={() => stackNavigation?.navigate('News')}>
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
            {hasNews && <View style={styles.bellDot} />}
          </Pressable>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
        </View>
      </View>

      <Card style={styles.balanceCard}>
          <View style={styles.balanceTopRow}>
            <Text style={styles.balanceLabel}>Your Balance</Text>
            <View style={[styles.profitPill, { backgroundColor: isProfitPositive ? colors.successTint : colors.dangerTint }]}>
              <Ionicons
                name={isProfitPositive ? 'trending-up' : 'trending-down'}
                size={12}
                color={isProfitPositive ? colors.success : colors.danger}
              />
              <Text style={[styles.profitPillText, { color: isProfitPositive ? colors.success : colors.danger }]}>
                {formatPercent(totalProfitPercent)}
              </Text>
            </View>
          </View>
          <Text style={styles.balance} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {formatMoney(balance)}
        </Text>
          <Text style={[styles.profit, { color: isProfitPositive ? colors.success : colors.danger }]}>
            {formatSigned(totalProfit)} today
          </Text>
        </Card>

      <View style={styles.countdownWrap}>
        <CountdownBadge />
      </View>

      {latestResult && <LatestResultCard round={latestResult} />}

      {openRound ? (
        <Card style={styles.ctaCard}>
          <View style={styles.ctaIconCircle}>
            <Ionicons name="flash" size={22} color={colors.onPrimary} />
          </View>
          <View style={styles.ctaTextWrap}>
            <Text style={styles.ctaTitle}>Round {openRound.slot.index} is open</Text>
            <Text style={styles.ctaSubtitle}>Submit your stock pick before {openRound.slot.settleTime}.</Text>
          </View>
          <Button title="Pick Stock Now" onPress={() => navigation.navigate('Predict')} size="sm" style={{ marginTop: spacing.md }} />
        </Card>
      ) : (
        <Card style={styles.ctaCard}>
          <View style={[styles.ctaIconCircle, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name="calendar-outline" size={22} color={colors.textMuted} />
          </View>
          <View style={styles.ctaTextWrap}>
            <Text style={styles.ctaTitle}>No round open right now</Text>
            <Text style={styles.ctaSubtitle}>Check the Rounds tab for today's full schedule.</Text>
          </View>
          <Button title="View Rounds" variant="outline" size="sm" onPress={() => navigation.navigate('Rounds')} style={{ marginTop: spacing.md }} />
        </Card>
      )}

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Ionicons name="checkmark-done-circle-outline" size={20} color={colors.primary} style={{ marginBottom: 6 }} />
          <Text style={styles.statValue}>{settledToday}/{rounds.length}</Text>
          <Text style={styles.statLabel}>Rounds settled today</Text>
        </Card>
      </View>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Today's Rounds</Text>
        <TouchableOpacity style={styles.viewAllLink} onPress={() => navigation.navigate('Rounds')}>
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>
      <View style={{ gap: spacing.sm }}>
        {upcomingRounds.length === 0 ? (
          <Card style={styles.emptyMiniCard}>
            <Text style={styles.emptyMiniText}>No rounds left to pick a stock for today.</Text>
          </Card>
        ) : (
          upcomingRounds.map((round) => {
            const status = getSlotStatus(round.slot, now);
            const { label, tone } = ROUND_STATUS_META[status];
            return (
              <TouchableOpacity key={round.slot.id} activeOpacity={0.85} onPress={() => navigation.navigate('Predict')}>
                <Card style={styles.miniRoundCard}>
                  <View style={styles.miniRoundIndexCircle}>
                    <Text style={styles.miniRoundIndexText}>{round.slot.index}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.miniRoundTitle}>Round {round.slot.index}</Text>
                    <Text style={styles.miniRoundTime}>
                      {formatTime12h(round.slot.submitTime)} - {formatTime12h(round.slot.settleTime)}
                    </Text>
                  </View>
                  <Badge label={label} tone={tone} />
                </Card>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Predict')}>
        <Card style={styles.autoPlaySummaryCard}>
          <View style={styles.autoPlaySummaryIconCircle}>
            <Ionicons name="flash-outline" size={18} color={colors.onPrimary} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.autoPlaySummaryTitle} numberOfLines={1}>
              Auto Play
            </Text>
            <Text style={styles.autoPlaySummarySubtitle} numberOfLines={1}>
              {autoPlayLoaded ? `${autoPlayEnabledCount} of ${ROUND_SLOTS.length} rounds enabled` : 'Loading…'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Card>
      </TouchableOpacity>

      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        <TouchableOpacity style={styles.viewAllLink} onPress={() => navigation.navigate('Wallet')}>
          <Text style={styles.viewAllText}>View All</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </TouchableOpacity>
      </View>
      {recentTransactions.length === 0 ? (
        <Card style={styles.emptyMiniCard}>
          <Text style={styles.emptyMiniText}>No transactions yet.</Text>
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {recentTransactions.map((tx) => {
            const isPositive = tx.amount >= 0;
            return (
              <Card key={tx.id} style={styles.txCard}>
                <View style={[styles.txIconCircle, { backgroundColor: isPositive ? colors.successTint : colors.dangerTint }]}>
                  <Ionicons name={TX_ICON[tx.type]} size={16} color={isPositive ? colors.success : colors.danger} />
                </View>
                <Text style={styles.txDescription} numberOfLines={1}>
                  {tx.description}
                </Text>
                <Text style={[styles.txAmount, { color: isPositive ? colors.success : colors.danger }]}>
                  {formatSigned(tx.amount)}
                </Text>
              </Card>
            );
          })}
        </View>
      )}

      <TouchableOpacity activeOpacity={0.85} onPress={() => stackNavigation?.navigate('Invite')}>
        <Card style={styles.inviteCard}>
          <View style={styles.inviteHeaderRow}>
            <View style={styles.inviteIconCircle}>
              <Ionicons name="people-outline" size={18} color={colors.onPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.inviteTitle}>Invite Others and Earn Credits</Text>
              <Text style={styles.inviteSubtitle}>Invite your friends to CrowdStock and earn amazing rewards.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
          <View style={styles.inviteStatsRow}>
            <Text style={styles.inviteStatText}>{inviteStats?.successfulConversions ?? 0} People Onboarded</Text>
            <Text style={styles.inviteStatText}>{inviteStats?.credits ?? 0} Reward Credits</Text>
          </View>
        </Card>
      </TouchableOpacity>
    </Screen>
  );
}

function LatestResultCard({ round }: { round: DailyRound }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const result = round.result!;
  const gainPositive = result.finalOutcome ? result.finalOutcome === 'gain' : (result.valueGained ?? 0) >= 0;

  return (
    <Card style={[styles.resultCard, { borderColor: gainPositive ? colors.success : colors.danger }]}>
      <View style={styles.resultHeaderRow}>
        <Text style={styles.resultTitle}>Latest Result · Round {round.slot.index}</Text>
        <View style={[styles.resultPill, { backgroundColor: gainPositive ? colors.successTint : colors.dangerTint }]}>
          <Text style={[styles.resultPillText, { color: gainPositive ? colors.success : colors.danger }]}>
            {formatSigned(result.valueGained ?? 0)}
          </Text>
        </View>
      </View>
      <Text style={styles.resultSubtitle}>
        You picked {result.userPrediction ?? '—'} · Avg Pick {result.average != null ? result.average.toFixed(2) : '—'} ·
        Deviation {result.distance != null ? result.distance.toFixed(2) : '—'}
      </Text>
    </Card>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
    eyebrow: { ...typography.tiny, color: colors.textDim, letterSpacing: 1 },
    greeting: { ...typography.h2, color: colors.text, marginTop: 2 },
    avatar: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { ...typography.h3, color: colors.onPrimary },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    bellButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bellDot: {
      position: 'absolute',
      top: 8,
      right: 9,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.danger,
      borderWidth: 1.5,
      borderColor: colors.surfaceAlt,
    },
    balanceCard: { alignItems: 'flex-start' },
    balanceTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
    balanceLabel: { ...typography.small, color: colors.textMuted },
    profitPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
    profitPillText: { ...typography.tiny, fontWeight: '700' },
    balance: { ...typography.h1, color: colors.text, marginTop: spacing.xs },
    profit: { ...typography.small, marginTop: 4, fontWeight: '600' },
    countdownWrap: { marginTop: spacing.lg },
    resultCard: { marginTop: spacing.lg, borderWidth: 1.5 },
    resultHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    resultTitle: { ...typography.small, color: colors.textMuted, fontWeight: '700' },
    resultPill: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
    resultPillText: { ...typography.small, fontWeight: '800' },
    resultSubtitle: { ...typography.tiny, color: colors.textMuted, marginTop: spacing.xs },
    ctaCard: { marginTop: spacing.lg },
    ctaIconCircle: {
      width: 44,
      height: 44,
      borderRadius: 14,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    ctaTextWrap: {},
    ctaTitle: { ...typography.h3, color: colors.text },
    ctaSubtitle: { ...typography.small, color: colors.textMuted, marginTop: 4 },
    statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
    statCard: { flex: 1, alignItems: 'center' },
    statValue: { ...typography.h2, color: colors.primary },
    statLabel: { ...typography.tiny, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    sectionTitle: { ...typography.h3, color: colors.text },
    viewAllLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
    viewAllText: { ...typography.small, color: colors.primary, fontWeight: '700' },
    emptyMiniCard: { backgroundColor: colors.surfaceAlt },
    emptyMiniText: { ...typography.small, color: colors.textMuted },
    miniRoundCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    miniRoundIndexCircle: {
      width: 32,
      height: 32,
      borderRadius: 11,
      backgroundColor: colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    miniRoundIndexText: { ...typography.small, color: colors.primary, fontWeight: '700' },
    miniRoundTitle: { ...typography.body, color: colors.text, fontWeight: '600' },
    miniRoundTime: { ...typography.tiny, color: colors.textMuted, marginTop: 1 },
    autoPlaySummaryCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg, backgroundColor: colors.blueTint },
    autoPlaySummaryIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.blue,
      alignItems: 'center',
      justifyContent: 'center',
    },
    autoPlaySummaryTitle: { ...typography.body, color: colors.text, fontWeight: '700' },
    autoPlaySummarySubtitle: { ...typography.tiny, color: colors.textMuted, marginTop: 2 },
    txCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    txIconCircle: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    txDescription: { ...typography.small, color: colors.text, flex: 1 },
    txAmount: { ...typography.small, fontWeight: '700' },
    inviteCard: { marginTop: spacing.lg, backgroundColor: colors.successTint },
    inviteHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    inviteIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.success,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inviteTitle: { ...typography.body, color: colors.text, fontWeight: '700' },
    inviteSubtitle: { ...typography.tiny, color: colors.textMuted, marginTop: 2, lineHeight: 15 },
    inviteStatsRow: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.md },
    inviteStatText: { ...typography.small, color: colors.text, fontWeight: '600' },
  });
}

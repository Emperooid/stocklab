import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { CountdownBadge } from '../../components/CountdownBadge';
import { AppIcon } from '../../components/AppIcon';
import { IconBubble } from '../../components/IconBubble';
import { SectionHeader } from '../../components/SectionHeader';
import { StatTile } from '../../components/StatTile';
import { EmptyState } from '../../components/EmptyState';
import { Colors, glow, radius, spacing, typography, useColors } from '../../theme/theme';
import { Badge, BadgeTone } from '../../components/Badge';
import { IconName } from '../../theme/icons';
import { withAlpha } from '../../lib/color';
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
import { ROUND_CARD_PALETTES } from '../../theme/theme';

const TX_ICON: Record<WalletTransaction['type'], IconName> = {
  deposit: 'deposit',
  withdrawal: 'withdraw',
  round_stake: 'stock',
  round_gain: 'trend-up',
  round_loss: 'trend-down',
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
      {/* ── Warm greeting header ─────────────────────────────────────────── */}
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>WELCOME BACK</Text>
          <Text style={styles.greeting}>{user?.name?.split(' ')[0] ?? 'Trader'}</Text>
          <Text style={styles.greetingSub}>Let's find today's lucky figure.</Text>
        </View>
        <View style={styles.headerActions}>
          <Pressable style={styles.bellButton} onPress={() => stackNavigation?.navigate('News')}>
            <AppIcon name="bell-outline" size={20} color={colors.text} />
            {hasNews && <View style={styles.bellDot} />}
          </Pressable>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>
        </View>
      </View>

      {/* ── Hero: balance ────────────────────────────────────────────────── */}
      <View style={[styles.balanceCardShell, glow(colors.primary)]}>
        <Card tone="hero" style={styles.balanceCard}>
          <AppIcon name="sparkle" size={148} opacity={0.18} style={styles.heroArt} />
          <View style={styles.balanceTopRow}>
            <View style={styles.balanceLabelRow}>
              <IconBubble name="wallet" size={38} iconSize={20} background={withAlpha(colors.cream, 0.22)} />
              <Text style={styles.balanceLabel}>Your Balance</Text>
            </View>
            <View style={[styles.profitPill, { backgroundColor: colors.surface }]}>
              <AppIcon
                name={isProfitPositive ? 'trend-up' : 'trend-down'}
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
          <View style={styles.profitRow}>
            <View style={[styles.profitTrend, { backgroundColor: colors.surface }]}>
              <AppIcon
                name={isProfitPositive ? 'trend-up' : 'trend-down'}
                size={13}
                color={isProfitPositive ? colors.success : colors.danger}
              />
            </View>
            <Text style={styles.profit}>{formatSigned(totalProfit)} today</Text>
          </View>
        </Card>
      </View>

      <View style={styles.countdownWrap}>
        <CountdownBadge />
      </View>

      {latestResult && <LatestResultCard round={latestResult} />}

      {/* ── Open round call-to-action ────────────────────────────────────── */}
      {openRound ? (
        <Card tone="amber" style={styles.ctaCard}>
          <View style={styles.ctaHeaderRow}>
            <IconBubble name="bolt" size={48} iconSize={24} color={colors.amber} background={colors.surface} />
            <View style={styles.ctaTextWrap}>
              <Text style={styles.ctaTitle}>Round {openRound.slot.index} is open</Text>
              <Text style={styles.ctaSubtitle}>Submit your stock pick before {openRound.slot.settleTime}.</Text>
            </View>
          </View>
          <Button
            title="Pick Stock Now"
            icon="arrow-right"
            variant="accent"
            onPress={() => navigation.navigate('Predict')}
            size="sm"
            style={{ marginTop: spacing.md }}
          />
        </Card>
      ) : (
        <Card tone="alt" style={styles.ctaCard}>
          <View style={styles.ctaHeaderRow}>
            <IconBubble name="calendar" size={48} iconSize={24} color={colors.textMuted} background={colors.surface} />
            <View style={styles.ctaTextWrap}>
              <Text style={styles.ctaTitle}>No round open right now</Text>
              <Text style={styles.ctaSubtitle}>Check the Rounds tab for today's full schedule.</Text>
            </View>
          </View>
          <Button
            title="View Rounds"
            variant="outline"
            icon="arrow-right"
            size="sm"
            onPress={() => navigation.navigate('Rounds')}
            style={{ marginTop: spacing.md }}
          />
        </Card>
      )}

      {/* ── Today at a glance ────────────────────────────────────────────── */}
      <View style={styles.statsRow}>
        <StatTile
          icon="trophy"
          label="Rounds settled today"
          value={`${settledToday}/${rounds.length}`}
          color={colors.teal}
          hint={rounds.length > 0 ? `${rounds.length - settledToday} still to settle` : undefined}
        />
      </View>

      {/* ── Today's rounds ───────────────────────────────────────────────── */}
      <SectionHeader
        eyebrow="TODAY'S SCHEDULE"
        title="Today's Rounds"
        actionLabel="View All"
        onAction={() => navigation.navigate('Rounds')}
      />
      <View style={{ gap: spacing.sm }}>
        {upcomingRounds.length === 0 ? (
          <Card tone="alt">
            <EmptyState icon="calendar" title="No rounds left to pick a stock for today." />
          </Card>
        ) : (
          upcomingRounds.map((round) => {
            const status = getSlotStatus(round.slot, now);
            const { label, tone } = ROUND_STATUS_META[status];
            const palette = ROUND_CARD_PALETTES[(round.slot.index - 1) % ROUND_CARD_PALETTES.length];
            return (
              <TouchableOpacity key={round.slot.id} activeOpacity={0.85} onPress={() => navigation.navigate('Predict')}>
                <Card style={[styles.miniRoundCard, { backgroundColor: palette.background, borderColor: palette.border }]}>
                  <View style={[styles.miniRoundIndexCircle, { backgroundColor: palette.accent }]}>
                    <Text style={[styles.miniRoundIndexText, { color: colors.cream }]}>{round.slot.index}</Text>
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.miniRoundTitle, { color: palette.ink }]}>Round {round.slot.index}</Text>
                    <Text style={[styles.miniRoundTime, { color: palette.ink }]}>
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

      {/* ── Auto Play summary ────────────────────────────────────────────── */}
      <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('Predict')}>
        <Card tone="info" style={styles.autoPlaySummaryCard}>
          <IconBubble name="bolt" size={46} iconSize={23} color={colors.blue} background={colors.surface} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.autoPlaySummaryTitle} numberOfLines={1}>
              Auto Play
            </Text>
            <Text style={styles.autoPlaySummarySubtitle} numberOfLines={1}>
              {autoPlayLoaded ? `${autoPlayEnabledCount} of ${ROUND_SLOTS.length} rounds enabled` : 'Loading…'}
            </Text>
          </View>
          <AppIcon name="chevron-right" size={18} color={colors.textMuted} />
        </Card>
      </TouchableOpacity>

      {/* ── Recent activity ──────────────────────────────────────────────── */}
      <SectionHeader
        eyebrow="YOUR MOVES"
        title="Recent Activity"
        actionLabel="View All"
        onAction={() => navigation.navigate('Wallet')}
      />
      {recentTransactions.length === 0 ? (
        <Card tone="alt">
          <EmptyState icon="doc" title="No transactions yet." />
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {recentTransactions.map((tx) => {
            const isPositive = tx.amount >= 0;
            return (
              <Card key={tx.id} tone={isPositive ? 'success' : 'danger'} style={styles.txCard}>
                <IconBubble
                  name={TX_ICON[tx.type]}
                  size={42}
                  iconSize={21}
                  color={isPositive ? colors.success : colors.danger}
                  background={colors.surface}
                />
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

      {/* ── Invite ───────────────────────────────────────────────────────── */}
      <TouchableOpacity activeOpacity={0.85} onPress={() => stackNavigation?.navigate('Invite')}>
        <Card tone="pink" style={styles.inviteCard}>
          <View style={styles.inviteHeaderRow}>
            <IconBubble name="people" size={46} iconSize={24} color={colors.pink} background={colors.surface} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.inviteTitle}>Invite Others and Earn Credits</Text>
              <Text style={styles.inviteSubtitle}>Invite your friends to CrowdStock and earn amazing rewards.</Text>
            </View>
            <AppIcon name="chevron-right" size={18} color={colors.textMuted} />
          </View>
          <View style={styles.inviteStatsRow}>
            <View style={styles.inviteStatPill}>
              <AppIcon name="user-outline" size={13} color={colors.pink} />
              <Text style={styles.inviteStatText}>{inviteStats?.successfulConversions ?? 0} People Onboarded</Text>
            </View>
            <View style={styles.inviteStatPill}>
              <AppIcon name="gift-outline" size={13} color={colors.pink} />
              <Text style={styles.inviteStatText}>{inviteStats?.credits ?? 0} Reward Credits</Text>
            </View>
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
    <Card tone={gainPositive ? 'success' : 'danger'} style={styles.resultCard}>
      <View style={styles.resultHeaderRow}>
        <View style={styles.resultTitleRow}>
          <IconBubble
            name={gainPositive ? 'trend-up' : 'trend-down'}
            size={40}
            iconSize={20}
            color={gainPositive ? colors.success : colors.danger}
            background={colors.surface}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.resultTitle}>Latest Result · Round {round.slot.index}</Text>
            <Text style={styles.resultSubtitle}>
              You picked {result.userPrediction ?? '—'} · Avg Pick {result.average != null ? result.average.toFixed(2) : '—'} ·
              Deviation {result.distance != null ? result.distance.toFixed(2) : '—'}
            </Text>
          </View>
        </View>
        <View style={[styles.resultPill, { backgroundColor: colors.surface }]}>
          <Text style={[styles.resultPillText, { color: gainPositive ? colors.success : colors.danger }]}>
            {formatSigned(result.valueGained ?? 0)}
          </Text>
        </View>
      </View>
    </Card>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
    headerText: { flex: 1, minWidth: 0 },
    eyebrow: { ...typography.label, color: colors.textDim },
    greeting: { ...typography.h1, color: colors.text, marginTop: 2 },
    greetingSub: { ...typography.small, color: colors.textMuted, marginTop: 3 },
    avatar: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { ...typography.h3, color: colors.onPrimary },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    bellButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bellDot: {
      position: 'absolute',
      top: 9,
      right: 10,
      width: 9,
      height: 9,
      borderRadius: 5,
      backgroundColor: colors.pink,
      borderWidth: 1.5,
      borderColor: colors.surface,
    },
    balanceCardShell: { borderRadius: radius.xxl, backgroundColor: colors.primary },
    balanceCard: {
      alignItems: 'flex-start',
      borderRadius: radius.xxl,
      padding: spacing.xl,
      overflow: 'hidden',
    },
    heroArt: { position: 'absolute', right: -22, bottom: -26 },
    balanceTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: spacing.sm },
    balanceLabelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, minWidth: 0 },
    balanceLabel: { ...typography.small, color: 'rgba(255,255,255,0.82)', fontWeight: '700' },
    profitPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.pill },
    profitPillText: { ...typography.tiny, fontWeight: '800' },
    balance: { ...typography.display, color: colors.onPrimary, marginTop: spacing.md },
    profitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
    profitTrend: { width: 24, height: 24, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
    profit: { ...typography.body, fontWeight: '800', color: colors.onPrimary },
    countdownWrap: { marginTop: spacing.lg },
    resultCard: { marginTop: spacing.lg },
    resultHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    resultTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1, minWidth: 0 },
    resultTitle: { ...typography.small, color: colors.text, fontWeight: '800' },
    resultPill: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 5, flexShrink: 0 },
    resultPillText: { ...typography.small, fontWeight: '900' },
    resultSubtitle: { ...typography.tiny, color: colors.textMuted, marginTop: 3, lineHeight: 15 },
    ctaCard: { marginTop: spacing.lg },
    ctaHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    ctaTextWrap: { flex: 1, minWidth: 0 },
    ctaTitle: { ...typography.h3, color: colors.text },
    ctaSubtitle: { ...typography.small, color: colors.textMuted, marginTop: 3 },
    statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
    miniRoundCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    miniRoundIndexCircle: {
      width: 38,
      height: 38,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    miniRoundIndexText: { ...typography.h3 },
    miniRoundTitle: { ...typography.body, fontWeight: '800' },
    miniRoundTime: { ...typography.tiny, marginTop: 1, opacity: 0.72 },
    autoPlaySummaryCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
    autoPlaySummaryTitle: { ...typography.body, color: colors.text, fontWeight: '800' },
    autoPlaySummarySubtitle: { ...typography.tiny, color: colors.textMuted, marginTop: 2 },
    txCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    txDescription: { ...typography.body, color: colors.text, flex: 1, minWidth: 0, fontWeight: '600' },
    txAmount: { ...typography.body, fontWeight: '900' },
    inviteCard: { marginTop: spacing.lg },
    inviteHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    inviteTitle: { ...typography.body, color: colors.text, fontWeight: '800' },
    inviteSubtitle: { ...typography.tiny, color: colors.textMuted, marginTop: 2, lineHeight: 15 },
    inviteStatsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' },
    inviteStatPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: 6,
    },
    inviteStatText: { ...typography.tiny, color: colors.text, fontWeight: '800' },
  });
}

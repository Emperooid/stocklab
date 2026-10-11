import { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import { ROUND_CARD_PALETTES } from '../../theme/theme';

// The hero is the brand green, and red cannot work on it: `danger` is 1.15:1,
// and the darkest red that stays legible (3.82:1) reads as a shadow inside the
// green's own tone range rather than as a warning. White is the most legible
// option on this card at 3.17:1, so gain and loss are both white and the
// direction is carried by the arrow and the sign instead of by hue.
// (On the DARK result card plain `danger` is 6.55:1, so red stays there.)

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
  // A round takes a pick any time before it settles, not just during its own
  // hour — CONFIRMED user feedback that the old single-round CTA undersold
  // this ("it should be round 7 and others are open"), so surface the count
  // of every other round still pickable today, not just the current hour's.
  const otherPickableCount = rounds.filter(
    (r) => getSlotStatus(r.slot, now) !== 'settled' && !r.prediction && r.slot.id !== openRound?.slot.id
  ).length;
  // Two different numbers, and Home used to show only the first: a round only
  // counts as "settled" here once the backend has posted a result for THIS
  // phone, whereas "closed" is just clock time. Without both, "0/24" reads as a
  // bug at 3pm even though 15 rounds have already closed.
  const settledToday = rounds.filter((r) => r.result).length;
  const closedToday = rounds.filter((r) => getSlotStatus(r.slot, now) === 'settled').length;
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
            {/* Don't hue-code on the green hero: `success` IS colors.primary, so a
                profit used to render in the card's own background colour — invisible —
                and the loss red clashed with it. Solid chips instead: white for a gain,
                ink for a loss, both far past the contrast the tints managed. */}
            <View style={styles.profitPill}>
              <Ionicons
                name={isProfitPositive ? 'trending-up' : 'trending-down'}
                size={12}
                color={colors.onPrimary}
              />
              <Text style={[styles.profitPillText, { color: colors.onPrimary }]}>
                {formatPercent(totalProfitPercent)}
              </Text>
            </View>
          </View>
          <Text style={styles.balance} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {formatMoney(balance)}
        </Text>
          <View style={styles.profitChip}>
            <Ionicons
              name={isProfitPositive ? 'arrow-up' : 'arrow-down'}
              size={13}
              color={colors.onPrimary}
            />
            <Text style={styles.profit}>{formatSigned(totalProfit)} today</Text>
          </View>
        </Card>

      <Pressable
        onPress={() => navigation.navigate('Predict')}
        accessibilityLabel="Pick 1 to 5 hourly — win cash when your number is close to the crowd value"
        style={({ pressed }) => [styles.bannerWrap, pressed && { opacity: 0.9 }]}
      >
        <View style={styles.bannerClip}>
          <Image
            source={require('../../../assets/banner-pick-1-5-hourly.jpg')}
            style={styles.banner}
            resizeMode="cover"
          />
        </View>
      </Pressable>

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
          {otherPickableCount > 0 && (
            <View style={styles.moreRoundsBadge}>
              <Ionicons name="layers" size={14} color={colors.primary} />
              <Text style={styles.moreRoundsBadgeText}>
                +{otherPickableCount} more round{otherPickableCount === 1 ? '' : 's'} open today — pick ahead any time
              </Text>
            </View>
          )}
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
          {closedToday > 0 && (
            <Text style={styles.statHint}>
              {closedToday} round{closedToday === 1 ? '' : 's'} closed so far today
            </Text>
          )}
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
            const palette = ROUND_CARD_PALETTES[(round.slot.index - 1) % ROUND_CARD_PALETTES.length];
            return (
              <TouchableOpacity key={round.slot.id} activeOpacity={0.85} onPress={() => navigation.navigate('Predict')}>
                <Card style={styles.miniRoundCard}>
                  <View style={[styles.miniRoundIndexCircle, { backgroundColor: palette.accent }]}>
                    <Text style={[styles.miniRoundIndexText, { color: '#FFFFFF' }]}>{round.slot.index}</Text>
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
    balanceCard: {
      alignItems: 'flex-start',
      backgroundColor: colors.primary,
      borderColor: colors.primary,
      shadowColor: colors.primary,
    },
    balanceTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
    balanceLabel: { ...typography.small, color: 'rgba(255,255,255,0.78)' },
    profitPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
    profitPillText: { ...typography.tiny, fontWeight: '700' },
    balance: { ...typography.h1, color: colors.onPrimary, marginTop: spacing.xs },
    profitChip: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.sm },
    profit: { ...typography.small, fontWeight: '700', color: colors.onPrimary },
    bannerWrap: { marginTop: spacing.lg },
    // The radius lives on a clipping wrapper, not on the Image: borderRadius +
    // overflow on a raster <Image> is unreliable on iOS and Android, so the
    // artwork kept showing its own square edges. Clipping here guarantees the
    // corners, and radius.xl matches the balance card directly above it.
    bannerClip: {
      width: '100%',
      aspectRatio: 1.759,
      borderRadius: radius.xl,
      overflow: 'hidden',
    },
    banner: { width: '100%', height: '100%' },
    countdownWrap: { marginTop: spacing.lg },
    resultCard: { marginTop: spacing.lg, borderWidth: 1.5 },
    resultHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    resultTitle: { ...typography.small, color: colors.textMuted, fontWeight: '700' },
    resultPill: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 3 },
    resultPillText: { ...typography.small, fontWeight: '800' },
    resultSubtitle: { ...typography.tiny, color: colors.textMuted, marginTop: spacing.xs },
    ctaCard: { marginTop: spacing.lg, backgroundColor: colors.surfaceRaised },
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
    moreRoundsBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.primaryTint,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      marginTop: spacing.md,
    },
    moreRoundsBadgeText: { ...typography.small, color: colors.primary, fontWeight: '700', flex: 1 },
    statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
    statCard: { flex: 1, alignItems: 'center' },
    statValue: { ...typography.h2, color: colors.primary },
    statLabel: { ...typography.tiny, color: colors.textMuted, marginTop: 4, textAlign: 'center' },
    statHint: { ...typography.tiny, color: colors.textDim, marginTop: 4, textAlign: 'center' },
    sectionHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.xl,
      marginBottom: spacing.sm,
    },
    sectionTitle: { ...typography.h3, color: colors.text, letterSpacing: 0.1 },
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

import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { CountdownBadge } from '../../components/CountdownBadge';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useAuthStore } from '../../store/authStore';
import { useWalletStore } from '../../store/walletStore';
import { useRoundsStore } from '../../store/roundsStore';
import { useRoundsLiveRefresh } from '../../hooks/useRoundsLiveRefresh';
import { getSlotStatus } from '../../lib/schedule';
import { formatMoney, formatPercent, formatSigned } from '../../lib/format';
import { DailyRound } from '../../types';
import { MainTabParamList } from '../../navigation/types';

export default function HomeScreen() {
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const user = useAuthStore((s) => s.user);
  const { balance, totalProfit, totalProfitPercent, refresh } = useWalletStore();
  const { rounds, fetchRounds } = useRoundsStore();
  const now = useRoundsLiveRefresh();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refresh();
      fetchRounds();
    }, [])
  );

  async function handleRefresh() {
    setRefreshing(true);
    await Promise.all([refresh(), fetchRounds()]);
    setRefreshing(false);
  }

  const openRound = rounds.find((r) => getSlotStatus(r.slot, now) === 'open' && !r.prediction);
  const settledToday = rounds.filter((r) => r.result).length;
  const latestResult = [...rounds].reverse().find((r) => r.result);
  const isProfitPositive = totalProfit >= 0;

  return (
    <Screen refreshing={refreshing} onRefresh={handleRefresh}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.eyebrow}>WELCOME BACK</Text>
          <Text style={styles.greeting}>{user?.name?.split(' ')[0] ?? 'Trader'}</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
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
        <Text style={styles.balance}>{formatMoney(balance)}</Text>
        <Text style={[styles.profit, { color: isProfitPositive ? colors.success : colors.danger }]}>
          {formatSigned(totalProfit)} total profit
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
            <Text style={styles.ctaSubtitle}>Submit your prediction before {openRound.slot.settleTime}.</Text>
          </View>
          <Button title="Predict Now" onPress={() => navigation.navigate('Predict')} size="sm" style={{ marginTop: spacing.md }} />
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
        <Card style={styles.statCard}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} style={{ marginBottom: 6 }} />
          <Text style={styles.statValue}>0.5%</Text>
          <Text style={styles.statLabel}>Max risk per round</Text>
        </Card>
      </View>
    </Screen>
  );
}

function LatestResultCard({ round }: { round: DailyRound }) {
  const result = round.result!;
  const gainPositive = (result.valueGained ?? 0) >= 0;

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
        You picked {result.userPrediction ?? '—'} · Stock Value {result.stockValue} · Deviation {result.distance ?? '—'}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
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
});

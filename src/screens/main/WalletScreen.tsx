import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { DepositModal } from '../../components/DepositModal';
import { Colors, radius, spacing, typography, useColors } from '../../theme/theme';
import { useWalletStore } from '../../store/walletStore';
import { useRoundsStore } from '../../store/roundsStore';
import { api } from '../../api';
import { localDateKey } from '../../lib/schedule';
import { WalletPeriodTotals, WalletTransaction } from '../../types';
import { computeGainPercent, formatMoney, formatPercent, formatSigned } from '../../lib/format';
import { MainStackParamList } from '../../navigation/types';

/** What a round row can be joined to: the number played, and the crowd value. */
type RoundFigures = { picked?: number; crowd?: number };

const TX_ICON: Record<WalletTransaction['type'], keyof typeof Ionicons.glyphMap> = {
  deposit: 'arrow-down-circle',
  withdrawal: 'arrow-up-circle',
  round_stake: 'game-controller-outline',
  round_gain: 'trending-up',
  round_loss: 'trending-down',
};

/**
 * Deposits run through Flutterwave: DepositModal collects an amount, asks the
 * gateway to initialize a payment (theKey "PAY") and opens the hosted checkout
 * link it returns; the backend credits the wallet by webhook, and the modal
 * confirms via "UPS". The virtual-account (BB/VV) flow is retained in the API
 * and store for reference but is no longer what the deposit sheet uses.
 */
export default function WalletScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { balance, transactions, refresh, isLoading, dailyTotals, monthlyTotals, fetchTotals } = useWalletStore();

  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [totalsPeriod, setTotalsPeriod] = useState<'today' | 'month'>('today');

  // A transaction row only carries an amount, so the number played and the crowd
  // value have to be joined back on from the round's own record. Today's rounds
  // are already in the store; the rest of the month comes from G14, because the
  // wallet lists the month but the store only ever holds today.
  const rounds = useRoundsStore((s) => s.rounds);
  const [monthFigures, setMonthFigures] = useState<Record<string, RoundFigures>>({});

  useEffect(() => {
    const now = new Date();
    api.rounds
      .getHistory(now.getFullYear(), now.getMonth())
      .then((entries) => {
        const map: Record<string, RoundFigures> = {};
        for (const entry of entries) {
          for (const r of entry.rounds) {
            if (r.prediction?.value == null && r.result?.average == null) continue;
            map[`${entry.date}:${r.slot.index}`] = { picked: r.prediction?.value, crowd: r.result?.average };
          }
        }
        setMonthFigures(map);
      })
      .catch(() => {});
  }, []);

  const figures = useMemo(() => {
    const map: Record<string, RoundFigures> = { ...monthFigures };
    const todayKey = localDateKey(new Date());
    for (const r of rounds) {
      if (r.prediction?.value == null && r.result?.average == null) continue;
      map[`${todayKey}:${r.slot.index}`] = { picked: r.prediction?.value, crowd: r.result?.average };
    }
    return map;
  }, [monthFigures, rounds]);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => {});
      fetchTotals().catch(() => {});
    }, [])
  );

  return (
    <Screen scroll={false}>
      <Text style={styles.title}>Wallet</Text>

      <FlatList
        data={transactions}
        keyExtractor={(t) => t.id}
        refreshing={isLoading}
        onRefresh={refresh}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        ListHeaderComponent={
          <>
            <Card style={styles.balanceCard}>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balance} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                {formatMoney(balance)}
              </Text>

              <View style={styles.quickActions}>
                <QuickAction icon="arrow-down-circle" label="Deposit" active={false} onPress={() => setDepositModalOpen(true)} />
                <QuickAction icon="arrow-up-circle" label="Withdraw" active={false} onPress={() => navigation.navigate('Withdrawal')} />
              </View>
            </Card>

            <View style={styles.totalsHeaderRow}>
              <Text style={styles.totalsSectionTitle}>Your Totals</Text>
              <View style={styles.periodSwitch}>
                <PeriodTab label="Today" active={totalsPeriod === 'today'} onPress={() => setTotalsPeriod('today')} />
                <PeriodTab label="This Month" active={totalsPeriod === 'month'} onPress={() => setTotalsPeriod('month')} />
              </View>
            </View>
            <TotalsCard totals={totalsPeriod === 'today' ? dailyTotals : monthlyTotals} />

            <Text style={styles.sectionTitle}>Transaction History</Text>
          </>
        }
        ListEmptyComponent={
          <EmptyState icon="receipt-outline" title="No transactions yet" message="Deposits, withdrawals, and round results will show up here." />
        }
        renderItem={({ item }) => <TransactionRow tx={item} figures={figures} />}
      />

      <DepositModal visible={depositModalOpen} onClose={() => setDepositModalOpen(false)} />
    </Screen>
  );
}

function QuickAction({
  icon,
  label,
  active,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity style={[styles.quickActionBtn, active && styles.quickActionBtnActive]} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={icon} size={18} color={active ? colors.onPrimary : colors.primary} />
      <Text style={[styles.quickActionText, active && { color: colors.onPrimary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function PeriodTab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity style={[styles.periodTab, active && styles.periodTabActive]} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.periodTabText, active && { color: colors.onPrimary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

/**
 * Exact totals from G15C (daily) / G15B (monthly) — replaces the backend's
 * dead PercentGained/PercentLoss fields per Mr Yemi's direction (2026-09-08):
 * show real Deposit/Withdrawal/Play/Gain totals, with a percentage derived
 * client-side from Plays vs. Gains shown as a secondary line underneath.
 */
function TotalsCard({ totals }: { totals: WalletPeriodTotals }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const gainPercent = computeGainPercent(totals.gains, totals.plays);
  const isPositive = gainPercent >= 0;
  return (
    <Card style={styles.totalsCard}>
      <View style={styles.totalsGrid}>
        <TotalStat label="Deposits" value={totals.deposits} />
        <TotalStat label="Withdrawals" value={totals.withdrawals} />
        <TotalStat label="Plays" value={totals.plays} />
        <TotalStat label="Gains" value={totals.gains} tone={totals.gains >= 0 ? 'positive' : 'negative'} />
      </View>
      <View style={styles.gainPercentRow}>
        <Ionicons name={isPositive ? 'trending-up' : 'trending-down'} size={14} color={isPositive ? colors.success : colors.danger} />
        <Text style={[styles.gainPercentText, { color: isPositive ? colors.success : colors.danger }]}>
          {formatPercent(gainPercent)} return on plays
        </Text>
      </View>
    </Card>
  );
}

function TotalStat({ label, value, tone }: { label: string; value: number; tone?: 'positive' | 'negative' }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const color = tone === 'positive' ? colors.success : tone === 'negative' ? colors.danger : colors.text;
  return (
    <View style={styles.totalStat}>
      <Text style={styles.totalStatLabel}>{label}</Text>
      <Text style={[styles.totalStatValue, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {formatMoney(value)}
      </Text>
    </View>
  );
}

function TransactionRow({
  tx,
  figures,
}: {
  tx: WalletTransaction;
  figures: Record<string, RoundFigures>;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isPositive = tx.amount >= 0;

  // Match on the day AND the slot: round 9 exists on every day of the month.
  const created = new Date(tx.createdAt);
  const played =
    tx.roundIndex != null && !Number.isNaN(created.getTime())
      ? figures[`${localDateKey(created)}:${tx.roundIndex}`]
      : undefined;

  return (
    <Card style={styles.txCard}>
      <View style={[styles.txIconCircle, { backgroundColor: isPositive ? colors.successTint : colors.dangerTint }]}>
        <Ionicons name={TX_ICON[tx.type]} size={18} color={isPositive ? colors.success : colors.danger} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.txDescription} numberOfLines={2}>
          {tx.description}
        </Text>
        {tx.roundIndex != null && (
          <Text style={styles.txFigures}>
            Picked {played?.picked ?? '—'} · Crowd value{' '}
            {played?.crowd != null && played.crowd > 0 ? played.crowd.toFixed(2) : '—'}
          </Text>
        )}
        <View style={styles.txMetaRow}>
          <Text style={styles.txDate}>{new Date(tx.createdAt).toLocaleString()}</Text>
          {tx.status === 'pending' && <Badge label="Pending" tone="warning" />}
          {tx.status === 'failed' && <Badge label="Failed" tone="danger" />}
        </View>
      </View>
      <Text style={[styles.txAmount, { color: isPositive ? colors.success : colors.danger }]}>{formatSigned(tx.amount)}</Text>
    </Card>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    title: { ...typography.h2, color: colors.text, marginBottom: spacing.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
    balanceCard: { marginHorizontal: spacing.lg, backgroundColor: colors.primary, borderColor: colors.primary, shadowColor: colors.primary },
    balanceLabel: { ...typography.small, color: 'rgba(255,255,255,0.78)' },
    balance: { ...typography.h1, color: colors.onPrimary, marginTop: 4 },
    quickActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
    quickActionBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      height: 44,
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.borderLight,
      backgroundColor: colors.surface,
    },
    quickActionBtnActive: { backgroundColor: colors.primary },
    quickActionText: { ...typography.small, color: colors.primary, fontWeight: '700' },
    sectionTitle: { ...typography.h3, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md, paddingHorizontal: spacing.lg },
    totalsHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.xl,
      marginBottom: spacing.md,
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
    },
    totalsSectionTitle: { ...typography.h3, color: colors.text, flexShrink: 1 },
    periodSwitch: { flexDirection: 'row', backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, padding: 3 },
    periodTab: { paddingHorizontal: spacing.sm, paddingVertical: 5, borderRadius: radius.pill },
    periodTabActive: { backgroundColor: colors.primary },
    periodTabText: { ...typography.tiny, color: colors.textMuted, fontWeight: '700' },
    totalsCard: { marginHorizontal: spacing.lg },
    totalsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    totalStat: { width: '50%', paddingVertical: spacing.sm },
    totalStatLabel: { ...typography.tiny, color: colors.textMuted },
    totalStatValue: { ...typography.body, fontWeight: '700', marginTop: 2 },
    gainPercentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    gainPercentText: { ...typography.small, fontWeight: '600' },
    txCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.lg, marginBottom: spacing.sm },
    txIconCircle: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    // Sits between the row's title and its timestamp: the figures matter more
    // than when it happened.
    txFigures: { ...typography.small, color: colors.textMuted, marginTop: 2, fontWeight: '600' },
    txDescription: { ...typography.body, color: colors.text },
    txMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: spacing.sm },
    txDate: { ...typography.tiny, color: colors.textMuted },
    txAmount: { ...typography.h3 },
  });
}

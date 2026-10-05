import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { DepositModal } from '../../components/DepositModal';
import { AppIcon } from '../../components/AppIcon';
import { IconBubble } from '../../components/IconBubble';
import { ListItem } from '../../components/ListItem';
import { SectionHeader } from '../../components/SectionHeader';
import { SegmentedControl } from '../../components/SegmentedControl';
import { PageHeader } from '../../components/Decor';
import { withAlpha } from '../../lib/color';
import { Colors, glow, radius, shadow, spacing, typography, useColors } from '../../theme/theme';
import { IconName } from '../../theme/icons';
import { useWalletStore } from '../../store/walletStore';
import { WalletPeriodTotals, WalletTransaction } from '../../types';
import { computeGainPercent, formatMoney, formatPercent, formatSigned } from '../../lib/format';
import { MainStackParamList } from '../../navigation/types';

const TX_ICON: Record<WalletTransaction['type'], IconName> = {
  deposit: 'deposit',
  withdrawal: 'withdraw',
  round_stake: 'stock',
  round_gain: 'trend-up',
  round_loss: 'trend-down',
};

/** Which palette colour each transaction type's bubble uses (money in = teal, money out = accent). */
const TX_TINT: Record<WalletTransaction['type'], keyof Colors> = {
  deposit: 'teal',
  withdrawal: 'accent',
  round_stake: 'purple',
  round_gain: 'success',
  round_loss: 'danger',
};

const QUICK_ACTIONS: { key: 'deposit' | 'withdrawal'; icon: IconName; label: string }[] = [
  { key: 'deposit', icon: 'deposit', label: 'Deposit' },
  { key: 'withdrawal', icon: 'withdraw', label: 'Withdraw' },
];

/**
 * Deposits are virtual-account only: every user gets (or already has) a
 * dedicated account via BB_getBankAccountProfile/VV_generateVirtualAccount
 * — they transfer any amount to it themselves, and the balance updates once
 * the backend credits it. The previous card-checkout (PAY) path was removed
 * entirely per explicit product decision, not kept as a fallback — see
 * httpApi.ts's top-of-file doc for the full reasoning.
 */
export default function WalletScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { balance, transactions, refresh, isLoading, dailyTotals, monthlyTotals, fetchTotals } = useWalletStore();

  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [totalsPeriod, setTotalsPeriod] = useState<'today' | 'month'>('today');

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => {});
      fetchTotals().catch(() => {});
    }, [])
  );

  return (
    <Screen scroll={false}>
      <FlatList
        data={transactions}
        keyExtractor={(t) => t.id}
        refreshing={isLoading}
        onRefresh={refresh}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <PageHeader title="Wallet" subtitle="Your balance, totals and history" icon="wallet" color={colors.accent} />

            <View style={styles.heroShadow}>
              <View style={styles.heroCard}>
                <View pointerEvents="none" style={[styles.heroBlob, styles.heroBlobTop]} />
                <View pointerEvents="none" style={[styles.heroBlob, styles.heroBlobBottom]} />
                <AppIcon name="sparkle" size={20} style={styles.heroSparkle} />

                <View style={styles.heroTopRow}>
                  <Text style={styles.balanceLabel}>Available Balance</Text>
                  <View style={styles.heroArt}>
                    <AppIcon name="wallet" size={28} />
                  </View>
                </View>

                <Text style={styles.balance} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                  {formatMoney(balance)}
                </Text>
              </View>
            </View>

            <View style={styles.quickActions}>
              {QUICK_ACTIONS.map((action) => (
                <QuickAction
                  key={action.key}
                  icon={action.icon}
                  label={action.label}
                  active={false}
                  tint={action.key === 'deposit' ? colors.teal : colors.accent}
                  onPress={() => {
                    if (action.key === 'deposit') setDepositModalOpen(true);
                    else navigation.navigate('Withdrawal');
                  }}
                />
              ))}
            </View>

            <SectionHeader title="Your Totals" eyebrow="PERIOD TOTALS" />
            <SegmentedControl
              options={[
                { key: 'today', label: 'Today' },
                { key: 'month', label: 'This Month' },
              ]}
              value={totalsPeriod}
              onChange={setTotalsPeriod}
            />
            <TotalsCard totals={totalsPeriod === 'today' ? dailyTotals : monthlyTotals} />

            <SectionHeader title="Transaction History" eyebrow="RECENT ACTIVITY" />
          </>
        }
        ListEmptyComponent={
          <EmptyState
            illustration="empty"
            title="No transactions yet"
            message="Deposits, withdrawals, and round results will show up here."
          />
        }
        renderItem={({ item }) => <TransactionRow tx={item} />}
      />

      <DepositModal visible={depositModalOpen} onClose={() => setDepositModalOpen(false)} />
    </Screen>
  );
}

function QuickAction({
  icon,
  label,
  active,
  tint,
  onPress,
}: {
  icon: IconName;
  label: string;
  active: boolean;
  tint: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      style={({ pressed }) => [styles.quickActionBtn, active && styles.quickActionBtnActive, pressed && styles.pressed]}
      onPress={onPress}
    >
      <IconBubble name={icon} size={52} iconSize={26} color={tint} />
      <Text style={[styles.quickActionText, active && { color: colors.onPrimary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {label}
      </Text>
    </Pressable>
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
  const gainsUp = totals.gains >= 0;
  return (
    <Card tone="amber" style={styles.totalsCard}>
      <View style={styles.totalsGrid}>
        <TotalStat icon="deposit" tint={colors.teal} label="Deposits" value={totals.deposits} />
        <TotalStat icon="withdraw" tint={colors.accent} label="Withdrawals" value={totals.withdrawals} />
        <TotalStat icon="stock" tint={colors.primary} label="Plays" value={totals.plays} />
        <TotalStat
          icon={gainsUp ? 'trend-up' : 'trend-down'}
          tint={gainsUp ? colors.success : colors.danger}
          label="Gains"
          value={totals.gains}
          tone={gainsUp ? 'positive' : 'negative'}
        />
      </View>
      <View style={styles.gainPercentRow}>
        <AppIcon name={isPositive ? 'trend-up' : 'trend-down'} size={15} color={isPositive ? colors.success : colors.danger} />
        <Text style={[styles.gainPercentText, { color: isPositive ? colors.success : colors.danger }]}>
          {formatPercent(gainPercent)} return on plays
        </Text>
      </View>
    </Card>
  );
}

function TotalStat({
  label,
  value,
  tone,
  icon,
  tint,
}: {
  label: string;
  value: number;
  tone?: 'positive' | 'negative';
  icon: IconName;
  tint: string;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const color = tone === 'positive' ? colors.success : tone === 'negative' ? colors.danger : colors.text;
  return (
    <View style={styles.totalStat}>
      <IconBubble name={icon} size={36} iconSize={18} color={tint} />
      <View style={styles.totalStatText}>
        <Text style={styles.totalStatLabel}>{label}</Text>
        <Text style={[styles.totalStatValue, { color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {formatMoney(value)}
        </Text>
      </View>
    </View>
  );
}

function TransactionRow({ tx }: { tx: WalletTransaction }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isPositive = tx.amount >= 0;
  return (
    <ListItem
      style={styles.txCard}
      icon={TX_ICON[tx.type]}
      iconColor={colors[TX_TINT[tx.type]]}
      title={tx.description}
      subtitle={new Date(tx.createdAt).toLocaleString()}
      right={
        <View style={styles.txRight}>
          <Text
            style={[styles.txAmount, { color: isPositive ? colors.success : colors.danger }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {formatSigned(tx.amount)}
          </Text>
          {tx.status === 'pending' && <Badge label="Pending" tone="warning" size="sm" />}
          {tx.status === 'failed' && <Badge label="Failed" tone="danger" size="sm" />}
        </View>
      }
    />
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    listContent: { paddingBottom: spacing.xxl },

    heroShadow: { borderRadius: radius.xxl, ...glow(colors.primary) },
    heroCard: {
      borderRadius: radius.xxl,
      padding: spacing.xl,
      backgroundColor: colors.heroFrom,
      overflow: 'hidden',
    },
    heroBlob: { position: 'absolute', borderRadius: 999 },
    heroBlobTop: { width: 210, height: 210, top: -95, right: -70, backgroundColor: colors.heroTo, opacity: 0.9 },
    heroBlobBottom: { width: 140, height: 140, bottom: -75, left: -45, backgroundColor: colors.accent, opacity: 0.4 },
    heroSparkle: { position: 'absolute', top: spacing.lg, right: 82, opacity: 0.9 },
    heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
    heroArt: {
      width: 48,
      height: 48,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withAlpha(colors.cream, 0.24),
    },
    balanceLabel: { ...typography.label, color: withAlpha(colors.cream, 0.82), flexShrink: 1 },
    balance: { ...typography.display, color: colors.cream, marginTop: spacing.md },

    quickActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
    quickActionBtn: {
      flex: 1,
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.sm,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      ...shadow.md,
    },
    quickActionBtnActive: { backgroundColor: colors.primary },
    quickActionText: { ...typography.h3, color: colors.text },
    pressed: { opacity: 0.75 },

    totalsCard: { marginTop: spacing.md },
    totalsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
    totalStat: {
      width: '50%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.sm,
    },
    totalStatText: { flex: 1, minWidth: 0 },
    totalStatLabel: { ...typography.tiny, color: colors.textMuted },
    totalStatValue: { ...typography.body, fontWeight: '800', marginTop: 1 },
    gainPercentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginTop: spacing.sm,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    gainPercentText: { ...typography.small, fontWeight: '700' },

    txCard: {
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingVertical: spacing.sm + 2,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
      ...shadow.sm,
    },
    txRight: { alignItems: 'flex-end', gap: 3 },
    txAmount: { ...typography.h3 },
  });
}

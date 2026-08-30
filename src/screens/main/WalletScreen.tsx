import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { FormError } from '../../components/FormError';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { TourTarget } from '../../components/TourTarget';
import { Colors, radius, spacing, typography, useColors } from '../../theme/theme';
import { useWalletStore } from '../../store/walletStore';
import { WalletTransaction } from '../../types';
import { getErrorMessage, validateDepositAmount } from '../../lib/validation';
import { formatMoney, formatSigned } from '../../lib/format';
import { MainStackParamList } from '../../navigation/types';

type ActiveAction = 'deposit' | null;

const TX_ICON: Record<WalletTransaction['type'], keyof typeof Ionicons.glyphMap> = {
  deposit: 'arrow-down-circle',
  withdrawal: 'arrow-up-circle',
  round_stake: 'game-controller-outline',
  round_gain: 'trending-up',
  round_loss: 'trending-down',
};

export default function WalletScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { balance, transactions, pendingDeposit, refresh, createDepositReference, startPendingDeposit, dismissPendingDeposit, isLoading } =
    useWalletStore();

  const [activeAction, setActiveAction] = useState<ActiveAction>(null);

  // Deposit state
  const [depositAmount, setDepositAmount] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [depositError, setDepositError] = useState('');

  // Manual deposit-verification fallback state
  const [verifyExpanded, setVerifyExpanded] = useState(false);
  const [referenceInput, setReferenceInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifyResult, setVerifyResult] = useState<{ credited: boolean; message?: string } | null>(null);
  const verifyDepositByReference = useWalletStore((s) => s.verifyDepositByReference);

  useFocusEffect(
    useCallback(() => {
      refresh().catch(() => {});
    }, [])
  );

  function toggleAction(action: 'deposit') {
    setActiveAction((current) => (current === action ? null : action));
  }

  async function handleDeposit() {
    setDepositError('');
    const validationError = validateDepositAmount(depositAmount);
    if (validationError) {
      setDepositError(validationError);
      return;
    }
    setDepositing(true);
    try {
      const depositValue = Number(depositAmount);
      const { redirectUrl, reference } = await createDepositReference(depositValue);
      // Balance updates via a server-side webhook once payment completes —
      // RootNavigator's deep-link handler actively requeries this reference
      // (via GR) when the checkout redirects back, rather than only
      // passively waiting for G25 to reflect it.
      startPendingDeposit(depositValue, reference);
      await Linking.openURL(redirectUrl);
      setDepositAmount('');
      setActiveAction(null);
    } catch (e) {
      setDepositError(getErrorMessage(e, 'Could not start your deposit.'));
    } finally {
      setDepositing(false);
    }
  }

  async function handleVerifyDeposit() {
    setVerifyError('');
    setVerifyResult(null);
    const reference = referenceInput.trim();
    if (!reference) {
      setVerifyError('Paste the reference from your confirmation email.');
      return;
    }
    setVerifying(true);
    try {
      const result = await verifyDepositByReference(reference);
      setVerifyResult(result);
      if (result.credited) {
        setReferenceInput('');
      }
    } catch (e) {
      setVerifyError(getErrorMessage(e, 'Could not verify that reference. Please try again.'));
    } finally {
      setVerifying(false);
    }
  }

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

              <TourTarget id="wallet-actions" style={styles.quickActions}>
                <QuickAction
                  icon="arrow-down-circle"
                  label="Deposit"
                  active={activeAction === 'deposit'}
                  onPress={() => toggleAction('deposit')}
                />
                <QuickAction icon="arrow-up-circle" label="Withdraw" active={false} onPress={() => navigation.navigate('Withdrawal')} />
              </TourTarget>
            </Card>

            {pendingDeposit && (
              <Card style={styles.pendingCard}>
                <ActivityIndicator size="small" color={colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.pendingTitle}>Confirming {formatMoney(pendingDeposit.amount)} deposit</Text>
                  <Text style={styles.pendingBody}>
                    This can take a minute after you complete payment. We'll update your balance automatically.
                  </Text>
                </View>
                <TouchableOpacity onPress={dismissPendingDeposit} hitSlop={8}>
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </Card>
            )}

            <TouchableOpacity
              style={styles.verifyToggle}
              onPress={() => {
                setVerifyExpanded((v) => !v);
                setVerifyResult(null);
                setVerifyError('');
              }}
            >
              <Ionicons name="help-circle-outline" size={16} color={colors.primary} />
              <Text style={styles.verifyToggleText}>Deposit not showing? Verify with your reference</Text>
              <Ionicons name={verifyExpanded ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
            </TouchableOpacity>

            {verifyExpanded && (
              <Card style={styles.actionCard}>
                <Text style={styles.actionTitle}>Verify a deposit</Text>
                <Text style={styles.verifyDescription}>
                  Paste the transaction reference from the confirmation email you received after paying — we'll check
                  with the bank whether it's been credited yet.
                </Text>
                <Input
                  value={referenceInput}
                  onChangeText={setReferenceInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="e.g. SLGSER2026..."
                  style={{ marginTop: spacing.sm }}
                />
                {!!verifyError && <FormError message={verifyError} />}
                {verifyResult && (
                  <View style={[styles.verifyResultBanner, { backgroundColor: verifyResult.credited ? colors.successTint : colors.warningTint }]}>
                    <Ionicons
                      name={verifyResult.credited ? 'checkmark-circle-outline' : 'time-outline'}
                      size={16}
                      color={verifyResult.credited ? colors.success : colors.warning}
                    />
                    <Text style={[styles.verifyResultText, { color: verifyResult.credited ? colors.success : colors.warning }]}>
                      {verifyResult.credited
                        ? 'Your balance has been updated.'
                        : `Not credited yet. ${verifyResult.message ?? 'Please try again shortly, or contact support if this persists.'}`}
                    </Text>
                  </View>
                )}
                <Button title="Check Reference" onPress={handleVerifyDeposit} loading={verifying} style={{ marginTop: spacing.md }} />
              </Card>
            )}

            {activeAction === 'deposit' && (
              <Card style={styles.actionCard}>
                <Text style={styles.actionTitle}>Deposit funds</Text>
                <View style={styles.warnBanner}>
                  <Ionicons name="information-circle-outline" size={14} color={colors.warning} />
                  <Text style={styles.warnText}>
                    Opens a secure checkout page in your browser. Your balance updates automatically once payment
                    completes.
                  </Text>
                </View>
                <Input
                  value={depositAmount}
                  onChangeText={(t) => setDepositAmount(t.replace(/[^0-9]/g, ''))}
                  keyboardType="number-pad"
                  placeholder="Amount (₦)"
                  style={{ marginTop: spacing.sm }}
                />
                {!!depositError && <FormError message={depositError} />}
                <Button title="Continue to Checkout" onPress={handleDeposit} loading={depositing} style={{ marginTop: spacing.md }} />
              </Card>
            )}

            <Text style={styles.sectionTitle}>Transaction History</Text>
          </>
        }
        ListEmptyComponent={
          <EmptyState icon="receipt-outline" title="No transactions yet" message="Deposits, withdrawals, and round results will show up here." />
        }
        renderItem={({ item }) => <TransactionRow tx={item} />}
      />
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
      <Text style={[styles.quickActionText, active && { color: colors.onPrimary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function TransactionRow({ tx }: { tx: WalletTransaction }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isPositive = tx.amount >= 0;
  return (
    <Card style={styles.txCard}>
      <View style={[styles.txIconCircle, { backgroundColor: isPositive ? colors.successTint : colors.dangerTint }]}>
        <Ionicons name={TX_ICON[tx.type]} size={18} color={isPositive ? colors.success : colors.danger} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.txDescription} numberOfLines={2}>
          {tx.description}
        </Text>
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
    balanceCard: { marginHorizontal: spacing.lg },
    balanceLabel: { ...typography.small, color: colors.textMuted },
    balance: { ...typography.h1, color: colors.text, marginTop: 4 },
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
      borderColor: colors.primary,
      backgroundColor: 'transparent',
    },
    quickActionBtnActive: { backgroundColor: colors.primary },
    quickActionText: { ...typography.small, color: colors.primary, fontWeight: '700' },
    pendingCard: {
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.warningTint,
    },
    pendingTitle: { ...typography.small, color: colors.text, fontWeight: '700' },
    pendingBody: { ...typography.tiny, color: colors.textMuted, marginTop: 2, lineHeight: 15 },
    actionCard: { marginHorizontal: spacing.lg, marginTop: spacing.md },
    actionTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.sm },
    warnBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.warningTint,
      borderRadius: radius.md,
      padding: spacing.sm,
    },
    warnText: { ...typography.tiny, color: colors.warning, flex: 1, lineHeight: 15 },
    verifyToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      marginHorizontal: spacing.lg,
      marginTop: spacing.md,
    },
    verifyToggleText: { ...typography.tiny, color: colors.primary, fontWeight: '700', flex: 1 },
    verifyDescription: { ...typography.tiny, color: colors.textMuted, lineHeight: 15 },
    verifyResultBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      borderRadius: radius.md,
      padding: spacing.sm,
      marginTop: spacing.sm,
    },
    verifyResultText: { ...typography.tiny, flex: 1, lineHeight: 15 },
    sectionTitle: { ...typography.h3, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md, paddingHorizontal: spacing.lg },
    txCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.lg, marginBottom: spacing.sm },
    txIconCircle: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    txDescription: { ...typography.body, color: colors.text },
    txMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: spacing.sm },
    txDate: { ...typography.tiny, color: colors.textMuted },
    txAmount: { ...typography.h3 },
  });
}

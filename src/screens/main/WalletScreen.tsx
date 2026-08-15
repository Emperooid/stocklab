import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { FormError } from '../../components/FormError';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { PaystackCheckout } from '../../components/PaystackCheckout';
import { BankPickerModal } from '../../components/BankPickerModal';
import { colors, radius, spacing, typography } from '../../theme/theme';
import { useWalletStore } from '../../store/walletStore';
import { Bank, ResolvedBankAccount, WalletTransaction } from '../../types';
import { getErrorMessage, validateDepositAmount } from '../../lib/validation';
import { formatMoney, formatSigned } from '../../lib/format';
import { isPaystackConfigured } from '../../config/paystack';

type ActiveAction = 'deposit' | 'withdraw' | null;

const TX_ICON: Record<WalletTransaction['type'], keyof typeof Ionicons.glyphMap> = {
  deposit: 'arrow-down-circle',
  withdrawal: 'arrow-up-circle',
  round_gain: 'trending-up',
  round_loss: 'trending-down',
};

export default function WalletScreen() {
  const {
    balance,
    transactions,
    banks,
    refresh,
    createDepositReference,
    verifyDeposit,
    cancelDeposit,
    fetchBanks,
    resolveBankAccount,
    requestWithdrawal,
    isLoading,
  } = useWalletStore();

  const [activeAction, setActiveAction] = useState<ActiveAction>(null);

  // Deposit state
  const [amount, setAmount] = useState('');
  const [depositing, setDepositing] = useState(false);
  const [depositError, setDepositError] = useState('');
  const [checkout, setCheckout] = useState<{ reference: string; email: string; amount: number } | null>(null);

  // Withdrawal state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [bankPickerVisible, setBankPickerVisible] = useState(false);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [resolvedAccount, setResolvedAccount] = useState<ResolvedBankAccount | null>(null);
  const [resolving, setResolving] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');

  useFocusEffect(
    useCallback(() => {
      refresh();
      fetchBanks();
    }, [])
  );

  function toggleAction(action: 'deposit' | 'withdraw') {
    setActiveAction((current) => (current === action ? null : action));
  }

  async function handleStartDeposit() {
    setDepositError('');
    const validationError = validateDepositAmount(amount);
    if (validationError) {
      setDepositError(validationError);
      return;
    }
    setDepositing(true);
    try {
      const { reference, email } = await createDepositReference(Number(amount));
      setCheckout({ reference, email, amount: Number(amount) });
    } catch (e) {
      setDepositError(getErrorMessage(e, 'Could not start your deposit.'));
    } finally {
      setDepositing(false);
    }
  }

  async function handleDepositSuccess(reference: string) {
    setCheckout(null);
    try {
      await verifyDeposit(reference);
      setAmount('');
      setActiveAction(null);
    } catch (e) {
      setDepositError(getErrorMessage(e, 'We could not confirm your payment.'));
    }
  }

  async function handleDepositCancel() {
    if (checkout) await cancelDeposit(checkout.reference).catch(() => {});
    setCheckout(null);
  }

  function resetWithdrawForm() {
    setWithdrawAmount('');
    setSelectedBank(null);
    setAccountNumber('');
    setResolvedAccount(null);
    setWithdrawError('');
  }

  async function handleResolveAccount() {
    setWithdrawError('');
    if (!selectedBank) {
      setWithdrawError('Choose a bank first.');
      return;
    }
    if (accountNumber.length !== 10) {
      setWithdrawError('Enter a valid 10-digit account number.');
      return;
    }
    setResolving(true);
    try {
      const account = await resolveBankAccount(accountNumber, selectedBank.code);
      setResolvedAccount(account);
    } catch (e) {
      setResolvedAccount(null);
      setWithdrawError(getErrorMessage(e, 'Could not verify that account.'));
    } finally {
      setResolving(false);
    }
  }

  async function handleWithdraw() {
    setWithdrawError('');
    const validationError = validateDepositAmount(withdrawAmount);
    if (validationError) {
      setWithdrawError(validationError);
      return;
    }
    if (Number(withdrawAmount) > balance) {
      setWithdrawError('That amount is more than your available balance.');
      return;
    }
    if (!selectedBank || !resolvedAccount) {
      setWithdrawError('Verify a bank account first.');
      return;
    }
    setWithdrawing(true);
    try {
      await requestWithdrawal(Number(withdrawAmount), selectedBank, resolvedAccount);
      resetWithdrawForm();
      setActiveAction(null);
    } catch (e) {
      setWithdrawError(getErrorMessage(e, 'Could not process your withdrawal.'));
    } finally {
      setWithdrawing(false);
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
              <Text style={styles.balance}>{formatMoney(balance)}</Text>

              <View style={styles.quickActions}>
                <QuickAction
                  icon="arrow-down-circle"
                  label="Deposit"
                  active={activeAction === 'deposit'}
                  onPress={() => toggleAction('deposit')}
                />
                <QuickAction
                  icon="arrow-up-circle"
                  label="Withdraw"
                  active={activeAction === 'withdraw'}
                  onPress={() => toggleAction('withdraw')}
                />
              </View>
            </Card>

            {activeAction === 'deposit' && (
              <Card style={styles.actionCard}>
                <Text style={styles.actionTitle}>Deposit funds</Text>
                {!isPaystackConfigured() && (
                  <View style={styles.warnBanner}>
                    <Ionicons name="warning-outline" size={14} color={colors.warning} />
                    <Text style={styles.warnText}>
                      No Paystack public key set. Add EXPO_PUBLIC_PAYSTACK_PUBLIC_KEY to your .env file to charge real cards.
                    </Text>
                  </View>
                )}
                <Input
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="numeric"
                  placeholder="Amount (₦)"
                  style={{ marginTop: spacing.sm }}
                />
                {!!depositError && <FormError message={depositError} />}
                <Button title="Continue to Checkout" onPress={handleStartDeposit} loading={depositing} style={{ marginTop: spacing.md }} />
              </Card>
            )}

            {activeAction === 'withdraw' && (
              <Card style={styles.actionCard}>
                <Text style={styles.actionTitle}>Withdraw to bank</Text>

                <TouchableOpacity style={styles.bankSelect} onPress={() => setBankPickerVisible(true)}>
                  <Text style={selectedBank ? styles.bankSelectText : styles.bankSelectPlaceholder}>
                    {selectedBank ? selectedBank.name : 'Choose bank'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                </TouchableOpacity>

                <View style={styles.inlineRow}>
                  <Input
                    value={accountNumber}
                    onChangeText={(t) => {
                      setAccountNumber(t.replace(/[^0-9]/g, '').slice(0, 10));
                      setResolvedAccount(null);
                    }}
                    keyboardType="number-pad"
                    maxLength={10}
                    placeholder="10-digit account number"
                    style={{ flex: 1 }}
                  />
                  <Button title="Verify" variant="outline" size="sm" onPress={handleResolveAccount} loading={resolving} />
                </View>

                {resolvedAccount && (
                  <View style={styles.resolvedRow}>
                    <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                    <Text style={styles.resolvedText}>{resolvedAccount.accountName}</Text>
                  </View>
                )}

                <Input
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                  keyboardType="numeric"
                  placeholder="Amount (₦)"
                  style={{ marginTop: spacing.sm }}
                />

                {!!withdrawError && <FormError message={withdrawError} />}

                <Button
                  title="Withdraw"
                  onPress={handleWithdraw}
                  loading={withdrawing}
                  disabled={!resolvedAccount}
                  style={{ marginTop: spacing.md }}
                />
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

      {checkout && (
        <PaystackCheckout
          visible
          amount={checkout.amount}
          email={checkout.email}
          reference={checkout.reference}
          onSuccess={handleDepositSuccess}
          onCancel={handleDepositCancel}
        />
      )}

      <BankPickerModal
        visible={bankPickerVisible}
        banks={banks}
        onSelect={(bank) => {
          setSelectedBank(bank);
          setResolvedAccount(null);
          setBankPickerVisible(false);
        }}
        onClose={() => setBankPickerVisible(false)}
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
  return (
    <TouchableOpacity style={[styles.quickActionBtn, active && styles.quickActionBtnActive]} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={icon} size={18} color={active ? colors.onPrimary : colors.primary} />
      <Text style={[styles.quickActionText, active && { color: colors.onPrimary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function TransactionRow({ tx }: { tx: WalletTransaction }) {
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

const styles = StyleSheet.create({
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
  inlineRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, alignItems: 'flex-start' },
  bankSelect: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  bankSelectText: { ...typography.body, color: colors.text },
  bankSelectPlaceholder: { ...typography.body, color: colors.textDim },
  resolvedRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  resolvedText: { ...typography.small, color: colors.success, fontWeight: '600' },
  sectionTitle: { ...typography.h3, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md, paddingHorizontal: spacing.lg },
  txCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginHorizontal: spacing.lg, marginBottom: spacing.sm },
  txIconCircle: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txDescription: { ...typography.body, color: colors.text },
  txMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: spacing.sm },
  txDate: { ...typography.tiny, color: colors.textMuted },
  txAmount: { ...typography.h3 },
});

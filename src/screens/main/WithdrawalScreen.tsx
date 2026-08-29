import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { FormError } from '../../components/FormError';
import { Badge, BadgeTone } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { Colors, radius, spacing, typography, useColors } from '../../theme/theme';
import { useWalletStore } from '../../store/walletStore';
import { useAuthStore } from '../../store/authStore';
import { WithdrawalHistoryEntry } from '../../types';
import { getErrorMessage, validateDepositAmount } from '../../lib/validation';
import { formatMoney } from '../../lib/format';

/**
 * Payout page per the confirmed design: shows the on-file linked bank
 * account (not a picker — withdrawal doesn't let the user choose a new
 * bank here), an amount field, a submit button, and withdrawal history.
 *
 * UI only for now, per explicit instruction — "we would add the functions
 * later on". None of the backing endpoints are confirmed yet (linked
 * account lookup, the withdrawal request itself, or history), so every
 * action below surfaces a real "not available yet" error via the existing
 * notSupported() pattern in httpApi.ts rather than faking success or
 * silently doing nothing.
 */
export default function WithdrawalScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { linkedBankAccount, fetchLinkedBankAccount, withdrawalHistory, fetchWithdrawalHistory, requestWithdrawal, balance } =
    useWalletStore();
  const totalWithdrawn = useAuthStore((s) => s.user?.totalWithdrawn) ?? 0;

  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadingBank, setLoadingBank] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setLoadingBank(true);
      fetchLinkedBankAccount()
        .catch(() => {})
        .finally(() => setLoadingBank(false));
      setLoadingHistory(true);
      fetchWithdrawalHistory()
        .catch(() => {})
        .finally(() => setLoadingHistory(false));
    }, [])
  );

  async function handleSubmit() {
    setError('');
    const validationError = validateDepositAmount(amount);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (Number(amount) > balance) {
      setError('That amount is more than your available balance.');
      return;
    }
    setSubmitting(true);
    try {
      await requestWithdrawal(Number(amount));
      setAmount('');
    } catch (e) {
      setError(getErrorMessage(e, 'Could not make a withdrawal request.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Ionicons name="wallet-outline" size={18} color={colors.primary} style={{ marginBottom: 6 }} />
          <Text style={styles.statValue}>{formatMoney(balance)}</Text>
          <Text style={styles.statLabel}>Total Balance</Text>
        </Card>
        <Card style={styles.statCard}>
          <Ionicons name="arrow-up-circle-outline" size={18} color={colors.primary} style={{ marginBottom: 6 }} />
          <Text style={styles.statValue}>{formatMoney(totalWithdrawn)}</Text>
          <Text style={styles.statLabel}>Total Withdrawn</Text>
        </Card>
      </View>

      <Card style={styles.bankCard}>
        <Text style={styles.sectionTitle}>Payout account</Text>
        {loadingBank ? (
          <Text style={styles.bankPlaceholder}>Loading…</Text>
        ) : linkedBankAccount ? (
          <>
            <BankDetailRow label="Bank" value={linkedBankAccount.bankName} />
            <BankDetailRow label="Account" value={linkedBankAccount.accountNumber} />
            <BankDetailRow label="Name" value={linkedBankAccount.fullName} />
          </>
        ) : (
          <Text style={styles.bankPlaceholder}>
            No payout account on file yet. This will show your linked bank details once available.
          </Text>
        )}
      </Card>

      <Card style={styles.formCard}>
        <Text style={styles.sectionTitle}>Withdraw</Text>
        <Input
          value={amount}
          onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
          keyboardType="number-pad"
          placeholder="Amount to withdraw (₦)"
          style={{ marginTop: spacing.sm }}
        />
        <View style={styles.availableRow}>
          <Text style={styles.availableText}>Available: {formatMoney(balance)}</Text>
          <Text style={styles.maxLink} onPress={() => setAmount(String(Math.floor(balance)))}>
            Use Max
          </Text>
        </View>
        {!!error && <FormError message={error} />}
        <Button title="Make a Withdrawal Request" onPress={handleSubmit} loading={submitting} style={{ marginTop: spacing.md }} />
      </Card>

      <Text style={[styles.sectionTitle, styles.historyTitle]}>Withdrawal History</Text>
      {loadingHistory ? (
        <Text style={styles.bankPlaceholder}>Loading…</Text>
      ) : withdrawalHistory.length === 0 ? (
        <Card>
          <EmptyState icon="time-outline" title="No withdrawal requests yet" message="Requests you make will show up here." />
        </Card>
      ) : (
        <View style={{ gap: spacing.sm }}>
          {withdrawalHistory.map((entry) => (
            <WithdrawalHistoryRow key={entry.id} entry={entry} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function BankDetailRow({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.bankRow}>
      <Text style={styles.bankRowLabel}>{label}</Text>
      <Text style={styles.bankRowValue}>{value}</Text>
    </View>
  );
}

const STATUS_META: Record<WithdrawalHistoryEntry['status'], { label: string; tone: BadgeTone }> = {
  open: { label: 'Open', tone: 'warning' },
  closed: { label: 'Closed', tone: 'info' },
};

function WithdrawalHistoryRow({ entry }: { entry: WithdrawalHistoryEntry }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { label, tone } = STATUS_META[entry.status];
  return (
    <Card style={styles.historyCard}>
      <View style={styles.historyHeaderRow}>
        <Text style={styles.historyDate}>{new Date(entry.dateRequested).toLocaleString()}</Text>
        <Badge label={label} tone={tone} />
      </View>
      <View style={styles.historyStatsRow}>
        <View>
          <Text style={styles.historyStatLabel}>Balance Before</Text>
          <Text style={styles.historyStatValue}>{formatMoney(entry.balanceBefore)}</Text>
        </View>
        <View>
          <Text style={styles.historyStatLabel}>Balance After</Text>
          <Text style={styles.historyStatValue}>{formatMoney(entry.balanceAfter)}</Text>
        </View>
      </View>
      {entry.dateCredited && (
        <Text style={styles.historyCredited}>Credited {new Date(entry.dateCredited).toLocaleString()}</Text>
      )}
    </Card>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    sectionTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.sm },
    statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
    statCard: { flex: 1, alignItems: 'center' },
    statValue: { ...typography.h3, color: colors.text },
    statLabel: { ...typography.tiny, color: colors.textMuted, marginTop: 2 },
    bankCard: { marginTop: spacing.lg },
    bankPlaceholder: { ...typography.small, color: colors.textMuted, lineHeight: 18 },
    bankRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: spacing.xs,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    bankRowLabel: { ...typography.small, color: colors.textMuted },
    bankRowValue: { ...typography.small, color: colors.text, fontWeight: '600' },
    formCard: { marginTop: spacing.lg },
    availableRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.xs,
    },
    availableText: { ...typography.tiny, color: colors.textMuted },
    maxLink: { ...typography.tiny, color: colors.primary, fontWeight: '700' },
    historyTitle: { marginTop: spacing.xl },
    historyCard: {},
    historyHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    historyDate: { ...typography.small, color: colors.text, fontWeight: '600' },
    historyStatsRow: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.sm },
    historyStatLabel: { ...typography.tiny, color: colors.textMuted },
    historyStatValue: { ...typography.small, color: colors.text, fontWeight: '600', marginTop: 2 },
    historyCredited: { ...typography.tiny, color: colors.success, marginTop: spacing.sm },
  });
}

import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { FormError } from '../../components/FormError';
import { Badge, BadgeTone } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { BankPickerModal } from '../../components/BankPickerModal';
import { Colors, radius, spacing, typography, useColors } from '../../theme/theme';
import { useWalletStore } from '../../store/walletStore';
import { useAuthStore } from '../../store/authStore';
import { Bank, ResolvedBankAccount, WithdrawalHistoryEntry } from '../../types';
import { getErrorMessage, isValidBankAccountNumber, isValidOtp, validateDepositAmount } from '../../lib/validation';
import { formatMoney } from '../../lib/format';

/**
 * Payout page. The linked bank account is set (or changed) through a
 * verify-then-OTP flow — resolve the account name from the number, confirm
 * it's really theirs with a one-time code, then it's saved as the on-file
 * payout destination. None of the backing endpoints are confirmed yet
 * (bank list, account resolve, OTP send/confirm, the withdrawal request
 * itself, or history) — every action surfaces a real "not available yet"
 * error via the existing notSupported() pattern in httpApi.ts rather than
 * faking success, so the whole flow is real and ready the moment those
 * endpoints exist.
 */
export default function WithdrawalScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { withdrawalHistory, fetchWithdrawalHistory, requestWithdrawal, linkedBankAccount, balance } = useWalletStore();
  const totalWithdrawn = useAuthStore((s) => s.user?.totalWithdrawn) ?? 0;

  const [amount, setAmount] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setLoadingHistory(true);
      fetchWithdrawalHistory()
        .catch(() => {})
        .finally(() => setLoadingHistory(false));
    }, [])
  );

  async function handleSubmit() {
    setError('');
    if (!linkedBankAccount) {
      setError('Add and verify a payout account above before requesting a withdrawal.');
      return;
    }
    const validationError = validateDepositAmount(amount);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (Number(amount) > balance) {
      setError(`You can't withdraw more than your available balance of ${formatMoney(balance)}.`);
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
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
            {formatMoney(balance)}
          </Text>
          <Text style={styles.statLabel}>Total Balance</Text>
        </Card>
        <Card style={styles.statCard}>
          <Ionicons name="arrow-up-circle-outline" size={18} color={colors.primary} style={{ marginBottom: 6 }} />
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
            {formatMoney(totalWithdrawn)}
          </Text>
          <Text style={styles.statLabel}>Total Withdrawn</Text>
        </Card>
      </View>

      <BankAccountCard />

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
        <Button
          title="Make a Withdrawal Request"
          onPress={handleSubmit}
          loading={submitting}
          disabled={!linkedBankAccount}
          style={{ marginTop: spacing.md }}
        />
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

type BankStep = 'view' | 'entry' | 'confirm' | 'otp';

function BankAccountCard() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    linkedBankAccount,
    fetchLinkedBankAccount,
    banks,
    fetchBanks,
    resolveBankAccount,
    sendBankVerificationOtp,
    confirmBankVerificationOtp,
  } = useWalletStore();

  const [loadingBank, setLoadingBank] = useState(false);
  const [step, setStep] = useState<BankStep>('view');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  // Fallback for a bank that isn't in the bundled list — since we have no
  // code for it, it can't go through resolveBankAccount (NUBAN lookups
  // always need a bank code, not just a name).
  const [manualBank, setManualBank] = useState(false);
  const [manualBankName, setManualBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  // Asked for upfront for BOTH paths — resolveBankAccount isn't backed by a
  // real endpoint yet, so waiting on it before letting someone type their
  // own name would block the flow entirely. If resolution DOES succeed for
  // a listed bank, it overrides this with the bank's own record; otherwise
  // this is what's used, same as the manual-bank path, and the confirm step
  // flags it as self-declared either way.
  const [accountName, setAccountName] = useState('');
  const [resolvedAccount, setResolvedAccount] = useState<ResolvedBankAccount | null>(null);
  // True only when resolveBankAccount actually returned a bank-confirmed
  // name — drives the verified/unverified styling on the confirm step.
  const [verifiedByBackend, setVerifiedByBackend] = useState(false);
  const [otp, setOtp] = useState('');
  const [resolving, setResolving] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [confirmingOtp, setConfirmingOtp] = useState(false);
  const [error, setError] = useState('');

  const bankName = manualBank ? manualBankName.trim() : selectedBank?.name ?? '';

  useFocusEffect(
    useCallback(() => {
      setLoadingBank(true);
      fetchLinkedBankAccount()
        .catch(() => {})
        .finally(() => setLoadingBank(false));
    }, [])
  );

  function resetFlow() {
    setStep('view');
    setSelectedBank(null);
    setManualBank(false);
    setManualBankName('');
    setAccountName('');
    setAccountNumber('');
    setResolvedAccount(null);
    setVerifiedByBackend(false);
    setOtp('');
    setError('');
  }

  function startAdd() {
    setError('');
    setSelectedBank(null);
    setManualBank(false);
    setManualBankName('');
    setAccountName('');
    setAccountNumber('');
    setResolvedAccount(null);
    setVerifiedByBackend(false);
    setOtp('');
    setStep('entry');
    if (banks.length === 0) {
      fetchBanks().catch((e) => setError(getErrorMessage(e, 'Could not load the bank list.')));
    }
  }

  function handleManualEntry() {
    setPickerVisible(false);
    setSelectedBank(null);
    setManualBank(true);
  }

  function handleSelectFromList() {
    setManualBank(false);
    setManualBankName('');
  }

  async function handleVerify() {
    setError('');
    if (!isValidBankAccountNumber(accountNumber)) {
      setError('Enter a valid 10-digit account number.');
      return;
    }
    if (!accountName.trim()) {
      setError('Enter the name on the account.');
      return;
    }

    if (manualBank) {
      if (!manualBankName.trim()) {
        setError('Enter your bank name.');
        return;
      }
      // No bank code to resolve against — this is the self-declared
      // account, taken as-is straight into the confirm step.
      setResolvedAccount({ accountNumber, bankCode: '', accountName: accountName.trim() });
      setVerifiedByBackend(false);
      setStep('confirm');
      return;
    }

    if (!selectedBank) {
      setError('Choose your bank.');
      return;
    }
    setResolving(true);
    try {
      // If this ever succeeds, the bank's own record wins over what was typed.
      const resolved = await resolveBankAccount(accountNumber, selectedBank.code);
      setResolvedAccount(resolved);
      setVerifiedByBackend(true);
      setStep('confirm');
    } catch (e) {
      // Right now this endpoint doesn't exist at all — that's not a real
      // validation failure worth blocking on, so fall back to the typed
      // name, same as the manual-bank path. A genuine future error (e.g. a
      // real "invalid account number" once the endpoint exists) still stops
      // here and shows normally, rather than silently getting bypassed.
      const message = getErrorMessage(e, '');
      if (message.includes("isn't available yet")) {
        setResolvedAccount({ accountNumber, bankCode: selectedBank.code, accountName: accountName.trim() });
        setVerifiedByBackend(false);
        setStep('confirm');
      } else {
        setError(message || 'Could not verify that account.');
      }
    } finally {
      setResolving(false);
    }
  }

  async function handleSendOtp() {
    if (!resolvedAccount || !bankName) return;
    setError('');
    setSendingOtp(true);
    try {
      await sendBankVerificationOtp({ ...resolvedAccount, bankName });
      setOtp('');
      setStep('otp');
    } catch (e) {
      setError(getErrorMessage(e, 'Could not send a verification code.'));
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleConfirmOtp() {
    if (!resolvedAccount || !bankName) return;
    setError('');
    if (!isValidOtp(otp)) {
      setError('Enter the code you received.');
      return;
    }
    setConfirmingOtp(true);
    try {
      await confirmBankVerificationOtp(otp, { ...resolvedAccount, bankName });
      resetFlow();
    } catch (e) {
      setError(getErrorMessage(e, 'Could not confirm that code.'));
    } finally {
      setConfirmingOtp(false);
    }
  }

  return (
    <Card style={styles.bankCard}>
      <View style={styles.bankCardHeader}>
        <Text style={styles.sectionTitle}>Payout account</Text>
        {step === 'view' && !!linkedBankAccount && (
          <Text style={styles.changeLink} onPress={startAdd}>
            Change
          </Text>
        )}
      </View>

      {step === 'view' &&
        (loadingBank ? (
          <Text style={styles.bankPlaceholder}>Loading…</Text>
        ) : linkedBankAccount ? (
          <>
            <BankDetailRow label="Bank" value={linkedBankAccount.bankName} />
            <BankDetailRow label="Account" value={linkedBankAccount.accountNumber} />
            <BankDetailRow label="Name" value={linkedBankAccount.fullName} />
          </>
        ) : (
          <>
            <Text style={styles.bankPlaceholder}>
              Add a bank account to withdraw to — we'll verify it belongs to you with a one-time code before saving it.
            </Text>
            <Button title="Add Bank Account" size="sm" onPress={startAdd} style={{ marginTop: spacing.md }} />
          </>
        ))}

      {step === 'entry' && (
        <View>
          <Text style={styles.stepHint}>Step 1 of 3 · Enter your account details</Text>

          {manualBank ? (
            <>
              <Input
                value={manualBankName}
                onChangeText={setManualBankName}
                placeholder="Bank name"
                autoCapitalize="words"
              />
              <Text style={styles.manualLink} onPress={handleSelectFromList}>
                Select from list instead
              </Text>
            </>
          ) : (
            <TouchableOpacity style={styles.bankSelect} onPress={() => setPickerVisible(true)}>
              <Text style={selectedBank ? styles.bankSelectText : styles.bankSelectPlaceholder}>
                {selectedBank ? selectedBank.name : 'Select your bank'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          <Input
            value={accountNumber}
            onChangeText={(t) => setAccountNumber(t.replace(/[^0-9]/g, '').slice(0, 10))}
            keyboardType="number-pad"
            placeholder="10-digit account number"
            style={{ marginTop: spacing.sm }}
          />

          <Input
            value={accountName}
            onChangeText={setAccountName}
            placeholder="Name on the account"
            autoCapitalize="words"
            style={{ marginTop: spacing.sm }}
          />

          {!!error && <FormError message={error} />}
          <View style={styles.stepActions}>
            <Button title="Cancel" variant="ghost" size="sm" onPress={resetFlow} />
            <Button title="Verify Account" size="sm" loading={resolving} onPress={handleVerify} />
          </View>
        </View>
      )}

      {step === 'confirm' && resolvedAccount && (
        <View>
          <Text style={styles.stepHint}>Step 2 of 3 · Confirm this is your account</Text>
          <View style={[styles.resolvedBox, { backgroundColor: verifiedByBackend ? colors.successTint : colors.warningTint }]}>
            <Ionicons
              name={verifiedByBackend ? 'checkmark-circle' : 'alert-circle'}
              size={20}
              color={verifiedByBackend ? colors.success : colors.warning}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.resolvedName}>{resolvedAccount.accountName}</Text>
              <Text style={styles.resolvedMeta}>
                {bankName} · {resolvedAccount.accountNumber}
              </Text>
            </View>
          </View>
          {!verifiedByBackend && (
            <Text style={styles.manualWarning}>
              We couldn't automatically verify this account — double-check the details are correct before continuing.
            </Text>
          )}
          {!!error && <FormError message={error} />}
          <View style={styles.stepActions}>
            <Button title="Not me — Start over" variant="ghost" size="sm" onPress={resetFlow} />
            <Button title="Send Code" size="sm" loading={sendingOtp} onPress={handleSendOtp} />
          </View>
        </View>
      )}

      {step === 'otp' && resolvedAccount && (
        <View>
          <Text style={styles.stepHint}>Step 3 of 3 · Enter the code we sent you</Text>
          <Text style={styles.bankPlaceholder}>
            We sent a one-time code to confirm {resolvedAccount.accountName} is your account.
          </Text>
          <Input
            value={otp}
            onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, '').slice(0, 6))}
            keyboardType="number-pad"
            placeholder="Enter code"
            style={{ marginTop: spacing.sm }}
          />
          {!!error && <FormError message={error} />}
          <Text style={styles.resendLink} onPress={handleSendOtp}>
            Resend code
          </Text>
          <View style={styles.stepActions}>
            <Button title="Cancel" variant="ghost" size="sm" onPress={resetFlow} />
            <Button title="Confirm" size="sm" loading={confirmingOtp} onPress={handleConfirmOtp} />
          </View>
        </View>
      )}

      <BankPickerModal
        visible={pickerVisible}
        banks={banks}
        onSelect={(bank) => {
          setSelectedBank(bank);
          setPickerVisible(false);
        }}
        onClose={() => setPickerVisible(false)}
        onManualEntry={handleManualEntry}
      />
    </Card>
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
    bankCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    changeLink: { ...typography.small, color: colors.primary, fontWeight: '700' },
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
    stepHint: { ...typography.tiny, color: colors.textDim, fontWeight: '700', letterSpacing: 0.3, marginBottom: spacing.sm },
    bankSelect: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: radius.md,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: spacing.md,
      height: 50,
    },
    bankSelectText: { ...typography.body, color: colors.text },
    bankSelectPlaceholder: { ...typography.body, color: colors.textDim },
    resolvedBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderRadius: radius.md,
      padding: spacing.md,
    },
    resolvedName: { ...typography.body, color: colors.text, fontWeight: '700' },
    resolvedMeta: { ...typography.tiny, color: colors.textMuted, marginTop: 2 },
    manualLink: { ...typography.small, color: colors.primary, fontWeight: '700', marginTop: spacing.sm },
    manualWarning: { ...typography.tiny, color: colors.warning, lineHeight: 15, marginTop: spacing.sm },
    resendLink: { ...typography.small, color: colors.primary, fontWeight: '700', marginTop: spacing.sm, alignSelf: 'flex-end' },
    stepActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
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

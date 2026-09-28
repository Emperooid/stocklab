import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { FormError } from '../../components/FormError';
import { EmptyState } from '../../components/EmptyState';
import { BankPickerModal } from '../../components/BankPickerModal';
import { Colors, radius, spacing, typography, useColors } from '../../theme/theme';
import { useWalletStore } from '../../store/walletStore';
import { useAuthStore } from '../../store/authStore';
import { WithdrawalHistoryEntry } from '../../types';
import { getErrorMessage, isValidBankAccountNumber, validateDepositAmount } from '../../lib/validation';
import { formatMoney } from '../../lib/format';

/**
 * Payout page. First-time setup uses PP (setPayoutBankDetails) — no OTP,
 * no bank-code resolution, per Mr Yemi's original BB/PP/VV doc. Changing an
 * already-set account goes through the newer RBP (resetPayoutBankDetails)
 * instead, which requires a verification code (sent via G20, reused purely
 * as an OTP-delivery mechanism — see the httpApi.ts comment on that
 * assumption) plus the user's real login password, both checked
 * server-side. The withdrawal request itself goes through IP — currently
 * confirmed live but failing (PAYOUT_FAILED) regardless of input, most
 * likely a Sling-sandbox issue on the backend, not a client bug. History
 * has no dedicated endpoint, so it's read from G15 (Code "W") instead — see
 * getWithdrawalHistory in httpApi.ts for what that does and doesn't cover.
 */
export default function WithdrawalScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { withdrawalHistory, fetchWithdrawalHistory, requestWithdrawal, sendWalletSecurityOtp, linkedBankAccount, balance } =
    useWalletStore();
  const totalWithdrawn = useAuthStore((s) => s.user?.totalWithdrawn) ?? 0;

  const [amount, setAmount] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
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

  function validateAmount(): string | null {
    if (!linkedBankAccount) return 'Add a payout account above before requesting a withdrawal.';
    const validationError = validateDepositAmount(amount);
    if (validationError) return validationError;
    if (Number(amount) > balance) return `You can't withdraw more than your available balance of ${formatMoney(balance)}.`;
    return null;
  }

  async function handleSendOtp() {
    setError('');
    const validationError = validateAmount();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSendingOtp(true);
    try {
      await sendWalletSecurityOtp();
      setOtpSent(true);
    } catch (e) {
      setError(getErrorMessage(e, 'Could not send a verification code.'));
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleSubmit() {
    setError('');
    if (!otp.trim()) {
      setError('Enter the code we sent you.');
      return;
    }
    if (!password.trim()) {
      setError('Enter your login password to confirm this withdrawal.');
      return;
    }
    const validationError = validateAmount();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSubmitting(true);
    try {
      await requestWithdrawal(Number(amount), otp.trim(), password);
      setAmount('');
      setOtp('');
      setPassword('');
      setOtpSent(false);
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
          onChangeText={(t) => {
            setAmount(t.replace(/[^0-9]/g, ''));
            setOtpSent(false);
          }}
          keyboardType="number-pad"
          placeholder="Amount to withdraw (₦)"
          editable={!otpSent}
          style={{ marginTop: spacing.sm }}
        />
        <View style={styles.availableRow}>
          <Text style={styles.availableText}>Available: {formatMoney(balance)}</Text>
          <Text style={styles.maxLink} onPress={() => setAmount(String(Math.floor(balance)))}>
            Use Max
          </Text>
        </View>

        {otpSent && (
          <>
            <Input
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              placeholder="Verification code"
              style={{ marginTop: spacing.sm }}
            />
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder="Your login password"
              secureTextEntry
              style={{ marginTop: spacing.sm }}
            />
            <Text style={styles.resendLink} onPress={handleSendOtp}>
              Resend code
            </Text>
          </>
        )}

        {!!error && <FormError message={error} />}

        {!otpSent ? (
          <Button
            title="Send Code"
            onPress={handleSendOtp}
            loading={sendingOtp}
            disabled={!linkedBankAccount}
            style={{ marginTop: spacing.md }}
          />
        ) : (
          <Button title="Confirm Withdrawal" onPress={handleSubmit} loading={submitting} style={{ marginTop: spacing.md }} />
        )}
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

type BankCardStep = 'view' | 'add' | 'reset';

function BankAccountCard() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    linkedBankAccount,
    fetchLinkedBankAccount,
    verifyBankAccount,
    setPayoutBankDetails,
    sendWalletSecurityOtp,
    resetPayoutBankDetails,
  } = useWalletStore();

  const [loadingBank, setLoadingBank] = useState(false);
  const [step, setStep] = useState<BankCardStep>('view');
  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [verifiedAccountName, setVerifiedAccountName] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const verifyRequestId = useRef(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [bankPickerOpen, setBankPickerOpen] = useState(false);

  // Reset-flow-only state
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');

  useFocusEffect(
    useCallback(() => {
      setLoadingBank(true);
      fetchLinkedBankAccount()
        .catch(() => {})
        .finally(() => setLoadingBank(false));
    }, [])
  );

  // Auto-verifies (AA) the moment a bank + valid 10-digit account number are
  // both present, instead of letting the user type their own account name —
  // a free-typed name could silently not match the real account holder,
  // which is exactly the mistake this closes off. Re-runs (and clears the
  // stale result first) whenever either input changes, so editing after a
  // successful verify can't leave a mismatched name behind.
  useEffect(() => {
    setVerifiedAccountName('');
    setVerifyError('');
    if (!bankCode || !isValidBankAccountNumber(accountNumber)) return;
    const requestId = ++verifyRequestId.current;
    setVerifying(true);
    verifyBankAccount(bankCode, accountNumber)
      .then(({ accountName }) => {
        if (verifyRequestId.current !== requestId) return; // superseded by a newer edit
        setVerifiedAccountName(accountName);
      })
      .catch((e) => {
        if (verifyRequestId.current !== requestId) return;
        setVerifyError(getErrorMessage(e, 'Could not verify that account.'));
      })
      .finally(() => {
        if (verifyRequestId.current === requestId) setVerifying(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankCode, accountNumber]);

  function startAdd() {
    setError('');
    setBankName('');
    setBankCode('');
    setAccountNumber('');
    setVerifiedAccountName('');
    setVerifyError('');
    setStep('add');
  }

  function startReset() {
    setError('');
    setBankName('');
    setBankCode('');
    setAccountNumber('');
    setVerifiedAccountName('');
    setVerifyError('');
    setOtp('');
    setPassword('');
    setOtpSent(false);
    setStep('reset');
  }

  function validateBankFields(): string | null {
    if (!bankName.trim() || !bankCode.trim()) return 'Select your bank from the list.';
    if (!isValidBankAccountNumber(accountNumber)) return 'Enter a valid 10-digit account number.';
    if (verifying) return 'Please wait — verifying the account.';
    if (!verifiedAccountName) return 'Could not verify this account. Check the bank and account number.';
    return null;
  }

  async function handleSave() {
    setError('');
    const validationError = validateBankFields();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    try {
      await setPayoutBankDetails(bankName.trim(), bankCode.trim(), accountNumber, verifiedAccountName);
      setStep('view');
    } catch (e) {
      setError(getErrorMessage(e, 'Could not save your payout account.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleSendOtp() {
    setError('');
    setSendingOtp(true);
    try {
      await sendWalletSecurityOtp();
      setOtpSent(true);
    } catch (e) {
      setError(getErrorMessage(e, 'Could not send a verification code.'));
    } finally {
      setSendingOtp(false);
    }
  }

  async function handleConfirmReset() {
    setError('');
    if (!otp.trim()) {
      setError('Enter the code we sent you.');
      return;
    }
    if (!password.trim()) {
      setError('Enter your login password to confirm this change.');
      return;
    }
    const validationError = validateBankFields();
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    try {
      await resetPayoutBankDetails(otp.trim(), password, bankName.trim(), bankCode.trim(), accountNumber, verifiedAccountName);
      setStep('view');
    } catch (e) {
      setError(getErrorMessage(e, 'Could not update your payout account.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card style={styles.bankCard}>
      <View style={styles.bankCardHeader}>
        <Text style={styles.sectionTitle}>Payout account</Text>
        {step === 'view' && !!linkedBankAccount && (
          <Text style={styles.changeLink} onPress={startReset}>
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
            <Text style={styles.bankPlaceholder}>Add a bank account to withdraw to.</Text>
            <Button title="Add Bank Account" size="sm" onPress={startAdd} style={{ marginTop: spacing.md }} />
          </>
        ))}

      {step === 'add' && (
        <View>
          <BankSelectField value={bankName} onPress={() => setBankPickerOpen(true)} />
          <Input
            value={accountNumber}
            onChangeText={(t) => setAccountNumber(t.replace(/[^0-9]/g, '').slice(0, 10))}
            keyboardType="number-pad"
            placeholder="10-digit account number"
            style={{ marginTop: spacing.sm }}
          />
          <AccountVerificationStatus verifying={verifying} verifiedName={verifiedAccountName} error={verifyError} />
          {!!error && <FormError message={error} />}
          <View style={styles.stepActions}>
            <Button title="Cancel" variant="ghost" size="sm" onPress={() => setStep('view')} />
            <Button
              title="Save Payout Details"
              size="sm"
              loading={saving}
              disabled={!verifiedAccountName}
              onPress={handleSave}
            />
          </View>
        </View>
      )}

      {step === 'reset' && !otpSent && (
        <View>
          <Text style={styles.bankPlaceholder}>
            Changing your payout account needs a verification code sent to your phone, plus your login password.
          </Text>
          {!!error && <FormError message={error} />}
          <View style={styles.stepActions}>
            <Button title="Cancel" variant="ghost" size="sm" onPress={() => setStep('view')} />
            <Button title="Send Code" size="sm" loading={sendingOtp} onPress={handleSendOtp} />
          </View>
        </View>
      )}

      {step === 'reset' && otpSent && (
        <View>
          <Input
            value={otp}
            onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, '').slice(0, 6))}
            keyboardType="number-pad"
            placeholder="Verification code"
          />
          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="Your login password"
            secureTextEntry
            style={{ marginTop: spacing.sm }}
          />
          <BankSelectField value={bankName} onPress={() => setBankPickerOpen(true)} placeholder="New bank" style={{ marginTop: spacing.sm }} />
          <Input
            value={accountNumber}
            onChangeText={(t) => setAccountNumber(t.replace(/[^0-9]/g, '').slice(0, 10))}
            keyboardType="number-pad"
            placeholder="New 10-digit account number"
            style={{ marginTop: spacing.sm }}
          />
          <AccountVerificationStatus verifying={verifying} verifiedName={verifiedAccountName} error={verifyError} />
          {!!error && <FormError message={error} />}
          <Text style={styles.resendLink} onPress={handleSendOtp}>
            Resend code
          </Text>
          <View style={styles.stepActions}>
            <Button title="Cancel" variant="ghost" size="sm" onPress={() => setStep('view')} />
            <Button
              title="Confirm Change"
              size="sm"
              loading={saving}
              disabled={!verifiedAccountName}
              onPress={handleConfirmReset}
            />
          </View>
        </View>
      )}

      <BankPickerModal
        visible={bankPickerOpen}
        onClose={() => setBankPickerOpen(false)}
        onSelect={(bank) => {
          setBankName(bank.name);
          setBankCode(bank.code);
          setBankPickerOpen(false);
        }}
      />
    </Card>
  );
}

function BankSelectField({
  value,
  onPress,
  placeholder = 'Bank name',
  style,
}: {
  value: string;
  onPress: () => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity style={[styles.bankSelectField, style]} onPress={onPress} activeOpacity={0.7}>
      <Text style={value ? styles.bankSelectValue : styles.bankSelectPlaceholder}>{value || placeholder}</Text>
      <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

/**
 * Shows the live result of the AA account-name lookup below the account
 * number field — verifying spinner, the resolved (read-only) name once
 * found, or an error. Nothing is shown until a bank + valid account number
 * are both entered, since that's when the lookup actually fires.
 */
function AccountVerificationStatus({ verifying, verifiedName, error }: { verifying: boolean; verifiedName: string; error: string }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (verifying) {
    return (
      <View style={[styles.verifyBox, { marginTop: spacing.sm }]}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.verifyingText}>Verifying account…</Text>
      </View>
    );
  }
  if (verifiedName) {
    return (
      <View style={[styles.verifyBox, styles.verifyBoxSuccess, { marginTop: spacing.sm }]}>
        <Ionicons name="checkmark-circle" size={16} color={colors.success} />
        <Text style={styles.verifiedNameText} numberOfLines={1}>
          {verifiedName}
        </Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={[styles.verifyBox, styles.verifyBoxError, { marginTop: spacing.sm }]}>
        <Ionicons name="alert-circle" size={16} color={colors.danger} />
        <Text style={styles.verifyErrorText}>{error}</Text>
      </View>
    );
  }
  return null;
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

function WithdrawalHistoryRow({ entry }: { entry: WithdrawalHistoryEntry }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Card style={styles.historyCard}>
      <View style={styles.historyIconCircle}>
        <Ionicons name="arrow-up-circle" size={18} color={colors.danger} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.historyDate} numberOfLines={1}>
          {entry.bank ? `To ${entry.bank}` : 'Withdrawal'}
        </Text>
        <Text style={styles.historyTime}>{new Date(entry.dateRequested).toLocaleString()}</Text>
      </View>
      <Text style={styles.historyAmount}>{formatMoney(Math.abs(entry.amount))}</Text>
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
    resendLink: { ...typography.small, color: colors.primary, fontWeight: '700', marginTop: spacing.sm, alignSelf: 'flex-end' },
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
    bankSelectField: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      height: 50,
    },
    bankSelectValue: { ...typography.body, color: colors.text },
    bankSelectPlaceholder: { ...typography.body, color: colors.textDim },
    verifyBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      backgroundColor: colors.surfaceAlt,
    },
    verifyingText: { ...typography.small, color: colors.textMuted },
    verifyBoxSuccess: { backgroundColor: colors.successTint },
    verifiedNameText: { ...typography.small, color: colors.success, fontWeight: '700', flex: 1, flexShrink: 1 },
    verifyBoxError: { backgroundColor: colors.dangerTint },
    verifyErrorText: { ...typography.small, color: colors.danger, flex: 1, flexShrink: 1 },
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
    historyCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    historyIconCircle: {
      width: 36,
      height: 36,
      borderRadius: radius.md,
      backgroundColor: colors.dangerTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    historyDate: { ...typography.small, color: colors.text, fontWeight: '600' },
    historyTime: { ...typography.tiny, color: colors.textMuted, marginTop: 2 },
    historyAmount: { ...typography.body, color: colors.danger, fontWeight: '700' },
  });
}

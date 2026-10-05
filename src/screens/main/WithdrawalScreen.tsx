import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { FormError } from '../../components/FormError';
import { Badge, BadgeTone } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { BankPickerModal } from '../../components/BankPickerModal';
import { AppIcon } from '../../components/AppIcon';
import { IconBubble } from '../../components/IconBubble';
import { ListItem } from '../../components/ListItem';
import { SectionHeader } from '../../components/SectionHeader';
import { StatTile } from '../../components/StatTile';
import { PageHeader } from '../../components/Decor';
import { IconName } from '../../theme/icons';
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
 * server-side. The withdrawal request itself and its history still have no
 * confirmed endpoint — those actions surface a real "not available yet"
 * error via the existing notSupported() pattern in httpApi.ts.
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
      <PageHeader title="Withdraw" subtitle="Send your balance straight to your bank" icon="withdraw" color={colors.accent} />

      <View style={styles.statsRow}>
        <StatTile icon="wallet" label="Total Balance" value={formatMoney(balance)} color={colors.teal} />
        <StatTile icon="withdraw" label="Total Withdrawn" value={formatMoney(totalWithdrawn)} color={colors.accent} />
      </View>

      <BankAccountCard />

      <Card tone="primary" style={styles.formCard}>
        <SectionHeader title="Withdraw" eyebrow="AMOUNT" style={styles.formHeader} />

        <Input
          value={amount}
          onChangeText={(t) => {
            setAmount(t.replace(/[^0-9]/g, ''));
            setOtpSent(false);
          }}
          keyboardType="number-pad"
          placeholder="Amount to withdraw (₦)"
          editable={!otpSent}
          leftIcon="coin"
        />

        <Card tone="amber" padded={false} style={styles.limitStrip}>
          <View style={styles.limitRow}>
            <AppIcon name="info" size={17} color={colors.warning} style={styles.limitIcon} />
            <Text style={styles.limitText}>Available: {formatMoney(balance)}</Text>
            <Text style={styles.maxLink} onPress={() => setAmount(String(Math.floor(balance)))}>
              Use Max
            </Text>
          </View>
        </Card>

        {otpSent && (
          <>
            <Input
              value={otp}
              onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, '').slice(0, 6))}
              keyboardType="number-pad"
              placeholder="Verification code"
              leftIcon="lock"
              containerStyle={styles.fieldGap}
            />
            <Input
              value={password}
              onChangeText={setPassword}
              placeholder="Your login password"
              secureTextEntry
              leftIcon="shield-check"
              containerStyle={styles.fieldGap}
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
            icon="send"
            onPress={handleSendOtp}
            loading={sendingOtp}
            disabled={!linkedBankAccount}
            style={{ marginTop: spacing.md }}
          />
        ) : (
          <Button
            title="Confirm Withdrawal"
            icon="check"
            onPress={handleSubmit}
            loading={submitting}
            style={{ marginTop: spacing.md }}
          />
        )}
      </Card>

      <SectionHeader title="Withdrawal History" eyebrow="PAST REQUESTS" />
      {loadingHistory ? (
        <Text style={styles.bankPlaceholder}>Loading…</Text>
      ) : withdrawalHistory.length === 0 ? (
        <Card>
          <EmptyState illustration="empty" title="No withdrawal requests yet" message="Requests you make will show up here." />
        </Card>
      ) : (
        <View style={styles.historyList}>
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
    <Card tone="info" style={styles.bankCard}>
      <View style={styles.bankCardHeader}>
        <View style={styles.bankCardTitleRow}>
          <IconBubble name="bank" size={44} iconSize={22} color={colors.blue} />
          <View style={styles.bankCardTitleText}>
            <Text style={styles.eyebrow}>PAYOUT ACCOUNT</Text>
            <Text style={styles.sectionTitle}>Payout account</Text>
          </View>
        </View>
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
          <View style={styles.bankDetailList}>
            <BankDetailRow icon="bank-outline" tint={colors.blue} label="Bank" value={linkedBankAccount.bankName} />
            <BankDetailRow icon="card" tint={colors.primary} label="Account" value={linkedBankAccount.accountNumber} />
            <BankDetailRow icon="user-outline" tint={colors.teal} label="Name" value={linkedBankAccount.fullName} />
          </View>
        ) : (
          <>
            <Text style={styles.bankPlaceholder}>Add a bank account to withdraw to.</Text>
            <Button title="Add Bank Account" icon="plus" size="sm" onPress={startAdd} style={{ marginTop: spacing.md }} />
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
            leftIcon="card"
            containerStyle={styles.fieldGap}
          />
          <AccountVerificationStatus verifying={verifying} verifiedName={verifiedAccountName} error={verifyError} />
          {!!error && <FormError message={error} />}
          <View style={styles.stepActions}>
            <View style={styles.stepAction}>
              <Button title="Cancel" variant="ghost" size="sm" onPress={() => setStep('view')} />
            </View>
            <View style={styles.stepAction}>
              <Button
                title="Save Payout Details"
                icon="check"
                size="sm"
                loading={saving}
                disabled={!verifiedAccountName}
                onPress={handleSave}
              />
            </View>
          </View>
        </View>
      )}

      {step === 'reset' && !otpSent && (
        <View>
          <Card tone="amber" padded={false} style={styles.infoStrip}>
            <View style={styles.infoRow}>
              <IconBubble name="shield" size={36} iconSize={18} color={colors.amber} />
              <Text style={styles.infoText}>
                Changing your payout account needs a verification code sent to your phone, plus your login password.
              </Text>
            </View>
          </Card>
          {!!error && <FormError message={error} />}
          <View style={styles.stepActions}>
            <View style={styles.stepAction}>
              <Button title="Cancel" variant="ghost" size="sm" onPress={() => setStep('view')} />
            </View>
            <View style={styles.stepAction}>
              <Button title="Send Code" icon="send" size="sm" loading={sendingOtp} onPress={handleSendOtp} />
            </View>
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
            leftIcon="lock"
          />
          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="Your login password"
            secureTextEntry
            leftIcon="shield-check"
            containerStyle={styles.fieldGap}
          />
          <BankSelectField value={bankName} onPress={() => setBankPickerOpen(true)} placeholder="New bank" style={styles.fieldGap} />
          <Input
            value={accountNumber}
            onChangeText={(t) => setAccountNumber(t.replace(/[^0-9]/g, '').slice(0, 10))}
            keyboardType="number-pad"
            placeholder="New 10-digit account number"
            leftIcon="card"
            containerStyle={styles.fieldGap}
          />
          <AccountVerificationStatus verifying={verifying} verifiedName={verifiedAccountName} error={verifyError} />
          {!!error && <FormError message={error} />}
          <Text style={styles.resendLink} onPress={handleSendOtp}>
            Resend code
          </Text>
          <View style={styles.stepActions}>
            <View style={styles.stepAction}>
              <Button title="Cancel" variant="ghost" size="sm" onPress={() => setStep('view')} />
            </View>
            <View style={styles.stepAction}>
              <Button
                title="Confirm Change"
                icon="check"
                size="sm"
                loading={saving}
                disabled={!verifiedAccountName}
                onPress={handleConfirmReset}
              />
            </View>
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
    <Pressable
      style={({ pressed }) => [styles.bankSelectField, style, pressed && styles.pressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <IconBubble name="bank" size={36} iconSize={18} color={colors.blue} />
      <Text style={[styles.bankSelectText, value ? styles.bankSelectValue : styles.bankSelectPlaceholder]} numberOfLines={1}>
        {value || placeholder}
      </Text>
      <AppIcon name="chevron-down" size={18} color={colors.textMuted} />
    </Pressable>
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
      <View style={[styles.verifyBox, styles.verifyBoxPending]}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.verifyingText}>Verifying account…</Text>
      </View>
    );
  }
  if (verifiedName) {
    return (
      <View style={[styles.verifyBox, styles.verifyBoxSuccess]}>
        <AppIcon name="check" size={16} color={colors.success} />
        <Text style={styles.verifiedNameText} numberOfLines={1}>
          {verifiedName}
        </Text>
      </View>
    );
  }
  if (error) {
    return (
      <View style={[styles.verifyBox, styles.verifyBoxError]}>
        <AppIcon name="alert" size={16} color={colors.danger} />
        <Text style={styles.verifyErrorText}>{error}</Text>
      </View>
    );
  }
  return null;
}

function BankDetailRow({ label, value, icon, tint }: { label: string; value: string; icon: IconName; tint: string }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return <ListItem icon={icon} iconColor={tint} title={value} subtitle={label} style={styles.bankRow} />;
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
        <View style={styles.historyTitleRow}>
          <IconBubble name="withdraw" size={40} iconSize={20} color={colors.accent} />
          <Text style={styles.historyDate}>{new Date(entry.dateRequested).toLocaleString()}</Text>
        </View>
        <Badge label={label} tone={tone} />
      </View>
      <View style={styles.historyStatsRow}>
        <View style={styles.historyStat}>
          <Text style={styles.historyStatLabel}>Balance Before</Text>
          <Text style={styles.historyStatValue}>{formatMoney(entry.balanceBefore)}</Text>
        </View>
        <View style={styles.historyStat}>
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
    eyebrow: { ...typography.label, color: colors.textDim },
    sectionTitle: { ...typography.h3, color: colors.text, marginTop: 2 },

    statsRow: { flexDirection: 'row', gap: spacing.md },
    formHeader: { marginTop: 0, marginBottom: spacing.md },
    fieldGap: { marginTop: spacing.sm },

    bankCard: { marginTop: spacing.xl },
    bankCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    bankCardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1, minWidth: 0 },
    bankCardTitleText: { flex: 1, minWidth: 0 },
    changeLink: { ...typography.small, color: colors.primary, fontWeight: '800' },
    bankPlaceholder: { ...typography.small, color: colors.textMuted, lineHeight: 18, marginTop: spacing.sm },

    bankDetailList: { marginTop: spacing.md },
    bankRow: { borderBottomWidth: 0, paddingVertical: spacing.sm },

    pressed: { opacity: 0.7 },
    bankSelectField: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.lg,
      paddingHorizontal: spacing.md,
      height: 60,
      marginTop: spacing.md,
    },
    bankSelectText: { ...typography.body, flex: 1, fontWeight: '600' },
    bankSelectValue: { color: colors.text },
    bankSelectPlaceholder: { color: colors.textDim },

    verifyBox: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      backgroundColor: colors.surfaceAlt,
      marginTop: spacing.sm,
    },
    verifyBoxPending: { backgroundColor: colors.primaryTint },
    verifyingText: { ...typography.small, color: colors.textMuted, fontWeight: '600' },
    verifyBoxSuccess: { backgroundColor: colors.successTint },
    verifiedNameText: { ...typography.small, color: colors.success, fontWeight: '800', flex: 1, flexShrink: 1 },
    verifyBoxError: { backgroundColor: colors.dangerTint },
    verifyErrorText: { ...typography.small, color: colors.danger, fontWeight: '600', flex: 1, flexShrink: 1 },

    infoStrip: { marginTop: spacing.md, borderRadius: radius.lg },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
    infoText: { ...typography.small, color: colors.text, flex: 1, lineHeight: 19 },

    stepActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
    stepAction: { flex: 1 },

    formCard: { marginTop: spacing.xl },
    limitStrip: { marginTop: spacing.sm, borderRadius: radius.md },
    limitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2 },
    limitIcon: { marginRight: 2 },
    limitText: { ...typography.tiny, color: colors.text, fontWeight: '700', flex: 1 },
    maxLink: {
      ...typography.tiny,
      color: colors.ink,
      fontWeight: '800',
      backgroundColor: colors.amber,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.md,
      paddingVertical: 5,
      overflow: 'hidden',
    },

    resendLink: { ...typography.small, color: colors.primary, fontWeight: '800', marginTop: spacing.md, alignSelf: 'flex-end' },

    historyList: { gap: spacing.md },
    historyCard: { borderRadius: radius.xl },
    historyHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    historyTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, minWidth: 0 },
    historyDate: { ...typography.small, color: colors.text, fontWeight: '700', flexShrink: 1 },
    historyStatsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    historyStat: { flex: 1, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md },
    historyStatLabel: { ...typography.tiny, color: colors.textMuted },
    historyStatValue: { ...typography.small, color: colors.text, fontWeight: '700', marginTop: 2 },
    historyCredited: { ...typography.tiny, color: colors.success, fontWeight: '700', marginTop: spacing.sm },
  });
}

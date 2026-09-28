import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { Input } from './Input';
import { Colors, radius, spacing, typography, useColors } from '../theme/theme';
import { useWalletStore } from '../store/walletStore';
import { useAuthStore } from '../store/authStore';
import { getErrorMessage, validateDepositAmount } from '../lib/validation';
import { formatMoney } from '../lib/format';

const AUTO_CHECK_INTERVAL_S = 10;
// Caps sustained background polling to 5 minutes (30 * 10s) of an open modal.
// Auto-checking forever while the modal just sits open re-mints a session
// token (G1001) every 10s indefinitely — harmless in short bursts, but there's
// no upside to letting it run unbounded for however long someone leaves the
// screen open, and it's needless load either way. Manual "Check Now" still
// works after the cap; it just stops firing on its own.
const MAX_AUTO_CHECKS = 30;

/**
 * Full-screen deposit modal — Flutterwave card/transfer checkout.
 *
 * Flow: the user enters an amount, we initialize a payment via PAY (see
 * walletStore.createDeposit → httpApi.createDepositReference) and hand back a
 * hosted checkout URL, which we open in the device browser. The backend
 * credits the wallet via webhook once the payment completes — there is no
 * client-side verify/confirm call — so "credited" is detected by comparing
 * the live balance against a snapshot taken when the payment was initiated.
 *
 * The previous virtual-account (VV/BB) flow is retained in the API/store but
 * is no longer used here; this modal was the only consumer.
 */
export function DepositModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { balance, refresh, createDeposit, verifyDeposit } = useWalletStore();
  const user = useAuthStore((s) => s.user);

  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  // The tx_ref + amount for the payment just initiated, so we can verify it
  // via UPS once the user has paid (bank transfers settle asynchronously).
  const pendingRef = useRef<string | null>(null);
  const pendingAmount = useRef<number>(0);
  const [loadError, setLoadError] = useState('');
  const [checking, setChecking] = useState(false);
  const [secondsToNextCheck, setSecondsToNextCheck] = useState(AUTO_CHECK_INTERVAL_S);
  const [autoChecksExhausted, setAutoChecksExhausted] = useState(false);
  const autoCheckCount = useRef(0);
  const startingBalance = useRef<number | null>(null);
  const credited = startingBalance.current != null && balance > startingBalance.current;

  useEffect(() => {
    if (!visible) return;
    // Reset every time the modal opens — a fresh deposit each time.
    setAmount('');
    setAmountError('');
    setCheckoutUrl(null);
    pendingRef.current = null;
    pendingAmount.current = 0;
    setLoadError('');
    setSecondsToNextCheck(AUTO_CHECK_INTERVAL_S);
    autoCheckCount.current = 0;
    setAutoChecksExhausted(false);
    startingBalance.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!visible || !checkoutUrl || credited || autoChecksExhausted) return;
    const timer = setInterval(() => {
      // Pure tick — just counts down to 0 and stops there. The actual check
      // runs from the effect below in response to the countdown reaching 0.
      setSecondsToNextCheck((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, checkoutUrl, credited, autoChecksExhausted]);

  useEffect(() => {
    if (!visible || !checkoutUrl || credited || autoChecksExhausted || checking) return;
    if (secondsToNextCheck === 0) checkNow(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsToNextCheck]);

  async function checkNow(isAuto = false) {
    if (isAuto) {
      autoCheckCount.current += 1;
      if (autoCheckCount.current >= MAX_AUTO_CHECKS) setAutoChecksExhausted(true);
    } else {
      autoCheckCount.current = 0;
      setAutoChecksExhausted(false);
    }
    setChecking(true);
    try {
      // Verify the payment via UPS first — if Flutterwave hasn't confirmed
      // the transaction yet (bank transfers settle slowly), there's no point
      // refreshing the balance.
      if (pendingRef.current) {
        const { verified } = await verifyDeposit(pendingRef.current);
        if (!verified) {
          setChecking(false);
          setSecondsToNextCheck(AUTO_CHECK_INTERVAL_S);
          return;
        }
      }
      await refresh();
    } catch {
      // Silent — the next auto-check (or manual retry) covers it.
    } finally {
      setChecking(false);
      setSecondsToNextCheck(AUTO_CHECK_INTERVAL_S);
    }
  }

  async function handleDeposit() {
    const err = validateDepositAmount(amount);
    if (err) {
      setAmountError(err);
      return;
    }
    setAmountError('');
    setSubmitting(true);
    setLoadError('');
    try {
      const { redirectUrl, reference } = await createDeposit(Number(amount), user?.name, user?.email);
      startingBalance.current = balance;
      // Store the tx_ref + amount so checkNow can verify via UPS.
      pendingRef.current = reference;
      pendingAmount.current = Number(amount);
      setCheckoutUrl(redirectUrl);
      // Open the hosted checkout in the device browser.
      await Linking.openURL(redirectUrl).catch(() => {});
    } catch (e) {
      setLoadError(getErrorMessage(e, 'Could not start your deposit. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  }

  const insets = useSafeAreaInsets();

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: Math.round(spacing.xl + insets.bottom) }]}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{checkoutUrl ? 'Complete Your Deposit' : 'Add Money'}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {!checkoutUrl ? (
            <>
              <Text style={styles.subtitle}>Enter an amount and we'll open a secure payment page for you to pay.</Text>
              <Input
                label="Amount (₦)"
                value={amount}
                onChangeText={setAmount}
                keyboardType="number-pad"
                placeholder="e.g. 5000"
                error={amountError}
                style={{ fontSize: typography.h3.fontSize, fontWeight: '700' }}
                containerStyle={{ marginTop: spacing.lg }}
              />
              {!!loadError && <Text style={styles.errorText}>{loadError}</Text>}
              <Button
                title={submitting ? 'Starting…' : 'Continue to Payment'}
                onPress={handleDeposit}
                disabled={submitting}
                loading={submitting}
                style={{ marginTop: spacing.lg }}
              />
            </>
          ) : credited ? (
            <View style={styles.creditedBox}>
              <Ionicons name="checkmark-circle" size={32} color={colors.success} />
              <Text style={styles.creditedTitle}>Deposit received!</Text>
              <Text style={styles.creditedBody}>Your balance is now {formatMoney(balance)}.</Text>
              <Button title="Done" onPress={onClose} style={{ marginTop: spacing.md }} />
            </View>
          ) : (
            <View style={styles.waitingBox}>
              <TouchableOpacity style={styles.reopenBtn} onPress={() => Linking.openURL(checkoutUrl).catch(() => {})}>
                <Ionicons name="open-outline" size={18} color={colors.primary} />
                <Text style={styles.reopenText}>Reopen payment page</Text>
              </TouchableOpacity>
              {checking ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <Ionicons name="time-outline" size={18} color={colors.textMuted} />
              )}
              <Text style={styles.waitingText}>
                {checking
                  ? 'Checking for your payment…'
                  : autoChecksExhausted
                    ? 'Still waiting — payments can take a minute to confirm. Tap Check Now once you\'ve paid.'
                    : `Waiting for your payment — checking again in ${secondsToNextCheck}s`}
              </Text>
              <TouchableOpacity onPress={() => checkNow(false)} disabled={checking} style={styles.checkNowBtn}>
                <Text style={styles.checkNowText}>Check Now</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      padding: spacing.lg,
      paddingBottom: spacing.xl,
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { ...typography.h2, color: colors.text },
    subtitle: { ...typography.small, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 18 },
    errorText: { ...typography.small, color: colors.danger, marginTop: spacing.lg },
    waitingBox: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.xs },
    waitingText: { ...typography.small, color: colors.textMuted, textAlign: 'center' },
    checkNowBtn: { marginTop: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
    checkNowText: { ...typography.small, color: colors.primary, fontWeight: '700' },
    reopenBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.primaryTint,
      borderRadius: radius.pill,
      marginBottom: spacing.md,
    },
    reopenText: { ...typography.small, color: colors.primary, fontWeight: '700' },
    creditedBox: { alignItems: 'center', marginTop: spacing.xl, gap: 4 },
    creditedTitle: { ...typography.h3, color: colors.text, marginTop: spacing.sm },
    creditedBody: { ...typography.small, color: colors.textMuted },
  });
}

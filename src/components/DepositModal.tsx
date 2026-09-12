import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Button } from './Button';
import { Colors, radius, spacing, typography, useColors } from '../theme/theme';
import { useWalletStore } from '../store/walletStore';
import { getErrorMessage } from '../lib/validation';
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
 * Full-screen deposit modal — big account details with per-field copy, plus
 * a live "waiting for your transfer" loop: auto-refreshes the balance every
 * 10s (visible countdown) and offers a manual "Check Now" for anyone who
 * doesn't want to wait. No per-transaction reference exists for a virtual
 * account transfer (unlike the old PAY/GR checkout flow), so "credited" is
 * simply detected by comparing the live balance against a snapshot taken
 * the moment this modal opened — the same before/after comparison the
 * removed verifyDepositByReference used, just without a reference to key
 * off of.
 */
export function DepositModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { balance, refresh, virtualAccount, virtualAccountLoading, fetchVirtualAccount } = useWalletStore();

  const [loadError, setLoadError] = useState('');
  const [checking, setChecking] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [secondsToNextCheck, setSecondsToNextCheck] = useState(AUTO_CHECK_INTERVAL_S);
  const [autoChecksExhausted, setAutoChecksExhausted] = useState(false);
  const autoCheckCount = useRef(0);
  const startingBalance = useRef<number | null>(null);
  const credited = startingBalance.current != null && balance > startingBalance.current;

  useEffect(() => {
    if (!visible) return;
    startingBalance.current = balance;
    setLoadError('');
    setSecondsToNextCheck(AUTO_CHECK_INTERVAL_S);
    autoCheckCount.current = 0;
    setAutoChecksExhausted(false);
    if (!virtualAccount) {
      fetchVirtualAccount().catch((e) => setLoadError(getErrorMessage(e, 'Could not load your deposit account.')));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!visible || credited || autoChecksExhausted) return;
    const timer = setInterval(() => {
      setSecondsToNextCheck((s) => {
        if (s <= 1) {
          checkNow(true);
          return AUTO_CHECK_INTERVAL_S;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, credited, autoChecksExhausted]);

  async function checkNow(isAuto = false) {
    if (isAuto) {
      autoCheckCount.current += 1;
      if (autoCheckCount.current >= MAX_AUTO_CHECKS) setAutoChecksExhausted(true);
    } else {
      // A manual tap always re-arms auto-checking, in case someone comes back
      // to a modal that had already timed out.
      autoCheckCount.current = 0;
      setAutoChecksExhausted(false);
    }
    setChecking(true);
    try {
      await refresh();
    } catch {
      // Silent — a failed background balance check isn't worth interrupting
      // someone who's just waiting; the next auto-check (or manual retry)
      // covers it.
    } finally {
      setChecking(false);
      setSecondsToNextCheck(AUTO_CHECK_INTERVAL_S);
    }
  }

  async function handleCopy(field: string, value: string) {
    await Clipboard.setStringAsync(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField((f) => (f === field ? null : f)), 1500);
  }

  const insets = useSafeAreaInsets();

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { paddingBottom: spacing.xl + insets.bottom }]}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Your Deposit Account</Text>
            <TouchableOpacity onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.subtitle}>
            Transfer any amount to this account from your own bank — it's yours alone, and we'll pick it up
            automatically below.
          </Text>

          {virtualAccountLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
          ) : !!loadError ? (
            <Text style={styles.errorText}>{loadError}</Text>
          ) : virtualAccount ? (
            <>
              <View style={styles.accountBox}>
                <BigRow label="Bank" value={virtualAccount.bankName} onCopy={handleCopy} copiedField={copiedField} />
                <BigRow
                  label="Account Number"
                  value={virtualAccount.accountNumber}
                  onCopy={handleCopy}
                  copiedField={copiedField}
                  emphasize
                />
                <BigRow label="Account Name" value={virtualAccount.accountName} onCopy={handleCopy} copiedField={copiedField} last />
              </View>

              {credited ? (
                <View style={styles.creditedBox}>
                  <Ionicons name="checkmark-circle" size={32} color={colors.success} />
                  <Text style={styles.creditedTitle}>Deposit received!</Text>
                  <Text style={styles.creditedBody}>Your balance is now {formatMoney(balance)}.</Text>
                  <Button title="Done" onPress={onClose} style={{ marginTop: spacing.md }} />
                </View>
              ) : (
                <View style={styles.waitingBox}>
                  {checking ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Ionicons name="time-outline" size={18} color={colors.textMuted} />
                  )}
                  <Text style={styles.waitingText}>
                    {checking
                      ? 'Checking for your transfer…'
                      : autoChecksExhausted
                        ? 'Still waiting — transfers can occasionally take a few minutes. Tap Check Now once you\'ve sent it.'
                        : `Waiting for your transfer — checking again in ${secondsToNextCheck}s`}
                  </Text>
                  <TouchableOpacity onPress={() => checkNow(false)} disabled={checking} style={styles.checkNowBtn}>
                    <Text style={styles.checkNowText}>Check Now</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function BigRow({
  label,
  value,
  onCopy,
  copiedField,
  emphasize,
  last,
}: {
  label: string;
  value: string;
  onCopy: (field: string, value: string) => void;
  copiedField: string | null;
  emphasize?: boolean;
  last?: boolean;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isCopied = copiedField === label;
  return (
    <View style={[styles.bigRow, last && { borderBottomWidth: 0 }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.bigRowLabel}>{label}</Text>
        <Text style={[styles.bigRowValue, emphasize && styles.bigRowValueEmphasized]} selectable>
          {value}
        </Text>
      </View>
      <Pressable onPress={() => onCopy(label, value)} hitSlop={10} style={styles.copyBtn}>
        <Ionicons name={isCopied ? 'checkmark' : 'copy-outline'} size={18} color={isCopied ? colors.success : colors.primary} />
      </Pressable>
    </View>
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
    accountBox: {
      marginTop: spacing.lg,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      paddingHorizontal: spacing.md,
    },
    bigRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      gap: spacing.sm,
    },
    bigRowLabel: { ...typography.tiny, color: colors.textMuted, fontWeight: '700', letterSpacing: 0.3 },
    bigRowValue: { ...typography.body, color: colors.text, fontWeight: '600', marginTop: 2 },
    bigRowValueEmphasized: { ...typography.h2, marginTop: 4 },
    copyBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    waitingBox: { alignItems: 'center', marginTop: spacing.xl, gap: spacing.xs },
    waitingText: { ...typography.small, color: colors.textMuted, textAlign: 'center' },
    checkNowBtn: { marginTop: spacing.sm, paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },
    checkNowText: { ...typography.small, color: colors.primary, fontWeight: '700' },
    creditedBox: { alignItems: 'center', marginTop: spacing.xl, gap: 4 },
    creditedTitle: { ...typography.h3, color: colors.text, marginTop: spacing.sm },
    creditedBody: { ...typography.small, color: colors.textMuted },
  });
}

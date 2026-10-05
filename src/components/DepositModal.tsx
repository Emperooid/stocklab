import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Button } from './Button';
import { AppIcon, Illustration } from './AppIcon';
import { IconBubble } from './IconBubble';
import { withAlpha } from '../lib/color';
import { radius, shadow, spacing, typography, useColors } from '../theme/theme';
import { useWalletStore } from '../store/walletStore';
import { getErrorMessage } from '../lib/validation';
import { formatMoney } from '../lib/format';

const AUTO_CHECK_INTERVAL_S = 10;
// Caps sustained background polling to 5 minutes (30 * 10s) of an open modal.
const MAX_AUTO_CHECKS = 30;

/**
 * Full-screen deposit modal — big account details with per-field copy, plus a
 * live "waiting for your transfer" loop.
 */
export function DepositModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
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
      autoCheckCount.current = 0;
      setAutoChecksExhausted(false);
    }
    setChecking(true);
    try {
      await refresh();
    } catch {
      // Silent — a failed background balance check isn't worth interrupting
      // someone who's just waiting.
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
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <View style={[styles.sheet, { backgroundColor: colors.surface, paddingBottom: spacing.xl + insets.bottom }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />

          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.eyebrow, { color: colors.textDim }]}>TOP UP</Text>
              <Text style={[styles.title, { color: colors.text }]}>Your deposit account</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={10} style={[styles.closeBtn, { backgroundColor: colors.surfaceAlt }]}>
              <AppIcon name="close" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Transfer any amount to this account from your own bank — it's yours alone, and we'll pick it up
            automatically below.
          </Text>

          {virtualAccountLoading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl }} />
          ) : !!loadError ? (
            <Text style={[styles.errorText, { color: colors.danger }]}>{loadError}</Text>
          ) : virtualAccount ? (
            <>
              <View style={[styles.accountBox, { backgroundColor: colors.primaryTint, borderColor: withAlpha(colors.primary, 0.24) }]}>
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
                  <Illustration name="win" size={150} />
                  <Text style={[styles.creditedTitle, { color: colors.text }]}>Deposit received!</Text>
                  <Text style={[styles.creditedBody, { color: colors.textMuted }]}>Your balance is now {formatMoney(balance)}.</Text>
                  <Button title="Done" icon="check" onPress={onClose} style={{ marginTop: spacing.lg }} />
                </View>
              ) : (
                <View style={[styles.waitingBox, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                  <View style={styles.waitingTop}>
                    {checking ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <IconBubble name="clock" size={40} iconSize={20} color={colors.amber} />
                    )}
                    <Text style={[styles.waitingText, { color: colors.textMuted }]}>
                      {checking
                        ? 'Checking for your transfer…'
                        : autoChecksExhausted
                          ? "Still waiting — transfers can occasionally take a few minutes. Tap Check Now once you've sent it."
                          : `Waiting for your transfer — checking again in ${secondsToNextCheck}s`}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => checkNow(false)}
                    disabled={checking}
                    style={[styles.checkNowBtn, { backgroundColor: colors.primary }]}
                  >
                    <AppIcon name="refresh" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
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
  const isCopied = copiedField === label;
  return (
    <View style={[styles.bigRow, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: withAlpha(colors.primary, 0.2) }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.bigRowLabel, { color: colors.textMuted }]}>{label}</Text>
        <Text style={[styles.bigRowValue, emphasize && styles.bigRowValueEmphasized, { color: colors.text }]} selectable>
          {value}
        </Text>
      </View>
      <Pressable
        onPress={() => onCopy(label, value)}
        hitSlop={10}
        style={[styles.copyBtn, { backgroundColor: isCopied ? withAlpha(colors.success, 0.16) : colors.surface }]}
      >
        <AppIcon name={isCopied ? 'check' : 'copy'} size={17} color={isCopied ? colors.success : colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    padding: spacing.lg,
    ...shadow.lg,
  },
  handle: { width: 48, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: spacing.lg },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  eyebrow: { ...typography.label },
  title: { ...typography.h2, marginTop: 2 },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  subtitle: { ...typography.small, marginTop: spacing.sm, lineHeight: 19 },
  errorText: { ...typography.small, marginTop: spacing.lg, fontWeight: '600' },
  accountBox: { marginTop: spacing.lg, borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: spacing.md },
  bigRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, gap: spacing.sm },
  bigRowLabel: { ...typography.label },
  bigRowValue: { ...typography.body, fontWeight: '700', marginTop: 3 },
  bigRowValueEmphasized: { ...typography.h2, marginTop: 4, letterSpacing: 1 },
  copyBtn: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  waitingBox: { marginTop: spacing.lg, borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: spacing.md },
  waitingTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  waitingText: { ...typography.small, flex: 1, lineHeight: 18 },
  checkNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    paddingVertical: spacing.sm + 4,
  },
  checkNowText: { ...typography.small, color: '#FFFFFF', fontWeight: '800' },
  creditedBox: { alignItems: 'center', marginTop: spacing.lg },
  creditedTitle: { ...typography.h2, marginTop: spacing.sm },
  creditedBody: { ...typography.body, marginTop: 4 },
});

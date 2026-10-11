import { useMemo } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Button } from './Button';
import { Colors, radius, spacing, typography, useColors } from '../theme/theme';
import { useAlertPopupStore } from '../store/alertPopupStore';

/**
 * Shows the account's current alert/news message once, as a blocking
 * popup, right after it's first seen (only G22/login ever supplies these —
 * see authStore) — then never again for that exact message, only when the
 * backend changes it to something new. Queued so an alert AND news arriving
 * together show one after another rather than one clobbering the other.
 */
export function AlertPopup() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const current = useAlertPopupStore((s) => s.pendingPopups[0]);
  const dismissCurrent = useAlertPopupStore((s) => s.dismissCurrent);

  if (!current) return null;

  const isAlert = current.type === 'alert';

  return (
    <Modal transparent visible animationType="fade" onRequestClose={dismissCurrent}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: isAlert ? colors.warningTint : colors.blueTint }]}>
            <Ionicons name={isAlert ? 'alert-circle' : 'megaphone'} size={26} color={isAlert ? colors.warning : colors.blue} />
          </View>
          <Text style={styles.title}>{isAlert ? 'Alert' : "What's new"}</Text>
          <Text style={styles.message}>{current.message}</Text>
          <Button title="Got it" onPress={dismissCurrent} style={{ marginTop: spacing.lg, width: '100%' }} />
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.xl,
      alignItems: 'center',
    },
    iconCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    title: { ...typography.h3, color: colors.text },
    message: { ...typography.small, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, lineHeight: 19 },
  });
}

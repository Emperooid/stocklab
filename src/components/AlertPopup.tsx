import { Modal, StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { Illustration, AppIcon } from './AppIcon';
import { withAlpha } from '../lib/color';
import { radius, spacing, typography, useColors } from '../theme/theme';
import { useAlertPopupStore } from '../store/alertPopupStore';

/**
 * Shows the account's current alert/news message once, as a blocking popup,
 * right after it's first seen — then never again for that exact message.
 * Queued so an alert AND news arriving together show one after another.
 */
export function AlertPopup() {
  const colors = useColors();
  const current = useAlertPopupStore((s) => s.pendingPopups[0]);
  const dismissCurrent = useAlertPopupStore((s) => s.dismissCurrent);

  if (!current) return null;

  const isAlert = current.type === 'alert';
  const tint = isAlert ? colors.amber : colors.primary;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={dismissCurrent}>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.artWell, { backgroundColor: withAlpha(tint, 0.12) }]}>
            <AppIcon name={isAlert ? 'alert' : 'megaphone'} size={44} color={tint} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{isAlert ? 'Heads up!' : "What's new"}</Text>
          <Text style={[styles.message, { color: colors.textMuted }]}>{current.message}</Text>
          <Button
            title={isAlert ? 'Got it' : 'Nice!'}
            variant={isAlert ? 'accent' : 'primary'}
            icon="check"
            onPress={dismissCurrent}
            style={{ marginTop: spacing.lg, width: '100%' }}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  card: {
    width: '100%',
    maxWidth: 370,
    borderRadius: radius.xxl,
    borderWidth: 1,
    padding: spacing.xl,
    alignItems: 'center',
  },
  artWell: { width: 92, height: 92, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md },
  title: { ...typography.h2 },
  message: { ...typography.body, textAlign: 'center', marginTop: spacing.sm, lineHeight: 21 },
});

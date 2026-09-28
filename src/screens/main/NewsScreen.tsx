import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { EmptyState } from '../../components/EmptyState';
import { Colors, spacing, typography, useColors } from '../../theme/theme';
import { useAuthStore } from '../../store/authStore';

/**
 * G22/G24's Profile carries a single current alert message and a single
 * current news message (not a list — confirmed with the user this is
 * "enough for now"), so this just shows whatever's on the account right
 * now rather than a scrollable feed of dated items.
 */
export default function NewsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const alertMessage = useAuthStore((s) => s.user?.alertMessage);
  const newsMessage = useAuthStore((s) => s.user?.newsMessage);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      refreshUser()
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [])
  );

  const hasContent = !!alertMessage || !!newsMessage;

  return (
    <Screen>
      {loading && !hasContent ? (
        <Text style={styles.placeholder}>Loading…</Text>
      ) : !hasContent ? (
        <Card>
          <EmptyState icon="megaphone-outline" title="Nothing here yet" message="Announcements and alerts will show up here." />
        </Card>
      ) : (
        <View style={{ gap: spacing.md }}>
          {!!alertMessage && <MessageCard icon="alert-circle" tone="warning" label="Alert" message={alertMessage} />}
          {!!newsMessage && <MessageCard icon="megaphone" tone="info" label="News" message={newsMessage} />}
        </View>
      )}
    </Screen>
  );
}

function MessageCard({
  icon,
  tone,
  label,
  message,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone: 'warning' | 'info';
  label: string;
  message: string;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const iconColor = tone === 'warning' ? colors.warning : colors.blue;
  const iconBg = tone === 'warning' ? colors.warningTint : colors.blueTint;
  return (
    <Card>
      <View style={styles.cardHeaderRow}>
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <Text style={styles.cardLabel}>{label}</Text>
      </View>
      <Text style={styles.cardBody}>{message}</Text>
    </Card>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    placeholder: { ...typography.small, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xxl },
    cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    iconCircle: { width: 32, height: 32, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
    cardLabel: { ...typography.h3, color: colors.text },
    cardBody: { ...typography.small, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 18 },
  });
}

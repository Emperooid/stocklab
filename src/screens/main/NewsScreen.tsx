import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { EmptyState } from '../../components/EmptyState';
import { IconBubble } from '../../components/IconBubble';
import { PageHeader } from '../../components/Decor';
import { Colors, spacing, typography, useColors } from '../../theme/theme';
import { IconName } from '../../theme/icons';
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
      <PageHeader
        title="Alerts & news"
        subtitle="What's happening on your account right now"
        icon="megaphone"
        color={colors.amber}
      />

      {loading && !hasContent ? (
        <View style={styles.loadingRow}>
          <IconBubble name="refresh" size={44} iconSize={22} color={colors.primary} />
          <Text style={styles.placeholder}>Loading…</Text>
        </View>
      ) : !hasContent ? (
        <Card tone="alt">
          <EmptyState
            illustration="empty"
            title="Nothing here yet"
            message="Announcements and alerts will show up here."
          />
        </Card>
      ) : (
        <View style={{ gap: spacing.md }}>
          {!!alertMessage && <MessageCard icon="alert" tone="warning" label="Alert" message={alertMessage} />}
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
  icon: IconName;
  tone: 'warning' | 'info';
  label: string;
  message: string;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const iconColor = tone === 'warning' ? colors.warning : colors.blue;
  const iconBg = tone === 'warning' ? colors.warningTint : colors.blueTint;
  return (
    <Card tone={tone === 'warning' ? 'amber' : 'info'}>
      <View style={styles.cardHeaderRow}>
        <IconBubble name={icon} size={46} iconSize={24} color={iconColor} background={iconBg} />
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardLabel}>{label}</Text>
          <Badge
            label={tone === 'warning' ? 'Needs a look' : 'Good to know'}
            tone={tone === 'warning' ? 'warning' : 'info'}
            icon={tone === 'warning' ? 'alert' : 'info'}
            size="sm"
          />
        </View>
        <IconBubble name="sparkle" size={34} iconSize={18} />
      </View>
      <Text style={styles.cardBody}>{message}</Text>
    </Card>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    loadingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xl },
    placeholder: { ...typography.small, color: colors.textMuted },
    cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    cardHeaderText: { flex: 1, minWidth: 0, gap: spacing.xs },
    cardLabel: { ...typography.h3, color: colors.text },
    cardBody: { ...typography.small, color: colors.textMuted, marginTop: spacing.md, lineHeight: 19 },
  });
}

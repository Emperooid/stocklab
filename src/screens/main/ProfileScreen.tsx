import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Colors, spacing, typography, useColors } from '../../theme/theme';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useRoundsStore } from '../../store/roundsStore';
import { useThemeStore } from '../../store/themeStore';
import { formatMoney, formatSigned } from '../../lib/format';
import { getDeviceId } from '../../lib/deviceId';

export default function ProfileScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
  const rounds = useRoundsStore((s) => s.rounds);
  const themeMode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggleMode);
  const [togglingNotifications, setTogglingNotifications] = useState(false);
  const [deviceId, setDeviceId] = useState('');

  useEffect(() => {
    getDeviceId().then(setDeviceId);
  }, []);

  async function handleToggleNotifications(value: boolean) {
    setTogglingNotifications(true);
    try {
      await setNotificationsEnabled(value, rounds);
    } finally {
      setTogglingNotifications(false);
    }
  }

  const totalProfit = user?.totalProfit ?? 0;
  const isDark = themeMode === 'dark';

  return (
    <Screen>
      <Text style={styles.title}>Profile</Text>

      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.phone}</Text>
      </Card>

      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Ionicons name="wallet-outline" size={18} color={colors.primary} style={{ marginBottom: 6 }} />
          <Text style={styles.statValue}>{formatMoney(user?.balance ?? 0)}</Text>
          <Text style={styles.statLabel}>Balance</Text>
        </Card>
        <Card style={styles.statCard}>
          <Ionicons
            name={totalProfit >= 0 ? 'trending-up' : 'trending-down'}
            size={18}
            color={totalProfit >= 0 ? colors.success : colors.danger}
            style={{ marginBottom: 6 }}
          />
          <Text style={[styles.statValue, { color: totalProfit >= 0 ? colors.success : colors.danger }]}>
            {formatSigned(totalProfit)}
          </Text>
          <Text style={styles.statLabel}>Total profit</Text>
        </Card>
      </View>

      <Text style={styles.sectionTitle}>Preferences</Text>
      <Card style={styles.section}>
        <View style={styles.row}>
          <View style={styles.rowIconCircle}>
            <Ionicons name={isDark ? 'moon-outline' : 'sunny-outline'} size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1, marginRight: spacing.md }}>
            <Text style={styles.rowLabel}>{isDark ? 'Dark mode' : 'Light mode'}</Text>
            <Text style={styles.rowHint}>Switch between a dark and light color theme.</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.text}
          />
        </View>

        <View style={[styles.row, styles.rowDivider]}>
          <View style={styles.rowIconCircle}>
            <Ionicons name="notifications-outline" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1, marginRight: spacing.md }}>
            <Text style={styles.rowLabel}>Round reminders</Text>
            <Text style={styles.rowHint}>Get notified when a round opens and when it settles.</Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleToggleNotifications}
            disabled={togglingNotifications}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.text}
          />
        </View>
      </Card>

      <Button title="Log Out" variant="outline" onPress={logout} style={{ marginTop: spacing.xl }} />

      <Text style={styles.footer}>StockLab · v1.0.0</Text>
      {!!deviceId && (
        <Text style={styles.deviceId} selectable>
          Device ID: {deviceId}
        </Text>
      )}
    </Screen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    title: { ...typography.h2, color: colors.text, marginBottom: spacing.lg },
    profileCard: { alignItems: 'center', paddingVertical: spacing.xl },
    avatar: {
      width: 68,
      height: 68,
      borderRadius: 34,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    avatarText: { ...typography.h1, color: colors.onPrimary },
    name: { ...typography.h3, color: colors.text },
    email: { ...typography.small, color: colors.textMuted, marginTop: 2 },
    statsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
    statCard: { flex: 1, alignItems: 'center' },
    statValue: { ...typography.h3, color: colors.text },
    statLabel: { ...typography.tiny, color: colors.textMuted, marginTop: 2 },
    sectionTitle: { ...typography.h3, color: colors.text, marginTop: spacing.xl, marginBottom: spacing.md },
    section: {},
    row: { flexDirection: 'row', alignItems: 'center' },
    rowDivider: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
    rowIconCircle: {
      width: 36,
      height: 36,
      borderRadius: 12,
      backgroundColor: colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: spacing.md,
    },
    rowLabel: { ...typography.body, color: colors.text, fontWeight: '600' },
    rowHint: { ...typography.tiny, color: colors.textDim, marginTop: 2 },
    footer: { ...typography.tiny, color: colors.textDim, textAlign: 'center', marginTop: spacing.xl },
    deviceId: { ...typography.tiny, color: colors.textDim, textAlign: 'center', marginTop: spacing.xs },
  });
}

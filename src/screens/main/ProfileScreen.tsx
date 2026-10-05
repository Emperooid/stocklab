import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { IconBubble } from '../../components/IconBubble';
import { ListItem } from '../../components/ListItem';
import { SectionHeader } from '../../components/SectionHeader';
import { StatTile } from '../../components/StatTile';
import { PageHeader } from '../../components/Decor';
import { Colors, spacing, typography, useColors } from '../../theme/theme';
import { IconName } from '../../theme/icons';
import { useAuthStore } from '../../store/authStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useRoundsStore } from '../../store/roundsStore';
import { useWalletStore } from '../../store/walletStore';
import { useThemeStore } from '../../store/themeStore';
import { useTourStore } from '../../store/tourStore';
import { formatMoney, formatSigned } from '../../lib/format';
import { getDeviceId } from '../../lib/deviceId';
import { api } from '../../api';
import { SupportContact } from '../../types';

export default function ProfileScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  // user.balance is always 0 — G22/G24 aren't the canonical balance source
  // (G25 is, see wallet.getBalance()), so this screen was showing a
  // permanently-zero balance regardless of the account's real balance.
  const balance = useWalletStore((s) => s.balance);
  const refreshWallet = useWalletStore((s) => s.refresh);
  const notificationsEnabled = useSettingsStore((s) => s.notificationsEnabled);
  const setNotificationsEnabled = useSettingsStore((s) => s.setNotificationsEnabled);
  const rounds = useRoundsStore((s) => s.rounds);
  const themeMode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggleMode);
  const startTour = useTourStore((s) => s.startTour);
  const [togglingNotifications, setTogglingNotifications] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [supportContact, setSupportContact] = useState<SupportContact | null>(null);
  const [loadingSupport, setLoadingSupport] = useState(false);

  useEffect(() => {
    getDeviceId().then(setDeviceId);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshWallet().catch(() => {});
      refreshUser().catch(() => {});
      setLoadingSupport(true);
      api.auth
        .getSupportContact()
        .then(setSupportContact)
        .catch(() => setSupportContact(null))
        .finally(() => setLoadingSupport(false));
    }, [])
  );

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
      <PageHeader
        title="Profile"
        subtitle="Your account, preferences and support"
        icon="profile"
        color={colors.pink}
      />

      <Card tone="primary" variant="sticker" style={styles.identityCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {user?.name}
        </Text>
        <Text style={styles.email}>{user?.phone}</Text>
        <View style={styles.identityIconsRow}>
          <IconBubble name="sparkle" size={38} iconSize={20} />
          <IconBubble name="shield-check" size={38} iconSize={20} color={colors.teal} />
          <IconBubble name="star-outline" size={38} iconSize={20} color={colors.amber} />
        </View>
      </Card>

      <View style={styles.tilesRow}>
        <StatTile icon="wallet" label="Balance" value={formatMoney(balance)} color={colors.accent} />
        <StatTile
          icon={totalProfit >= 0 ? 'trend-up' : 'trend-down'}
          label="Total profit"
          value={formatSigned(totalProfit)}
          color={totalProfit >= 0 ? colors.success : colors.danger}
        />
      </View>

      <SectionHeader eyebrow="MAKE IT YOURS" title="Preferences" />
      <Card tone="alt" style={styles.section}>
        <ListItem
          icon={isDark ? 'moon' : 'sun'}
          iconColor={colors.primary}
          title={isDark ? 'Dark mode' : 'Light mode'}
          subtitle="Switch between a dark and light color theme."
          right={
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.text}
            />
          }
        />

        <ListItem
          icon="bell-outline"
          iconColor={colors.amber}
          title="Round reminders"
          subtitle="Alerts when a round opens, when it's about to close, when your result is ready, and a nudge if you haven't played yet today."
          right={
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              disabled={togglingNotifications}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.text}
            />
          }
        />

        <ListItem
          icon="compass"
          iconColor={colors.teal}
          title="Take the guided tour"
          subtitle="Replay the walkthrough of the app's main screens."
          onPress={startTour}
          showChevron
        />
      </Card>

      <SectionHeader eyebrow="NEED A HAND?" title="Support" />
      <Card tone="info" style={styles.section}>
        {loadingSupport ? (
          <View style={styles.supportRow}>
            <IconBubble name="help" size={40} iconSize={20} color={colors.blue} />
            <Text style={[styles.rowHint, styles.supportText]}>Loading…</Text>
          </View>
        ) : supportContact ? (
          <>
            {!!supportContact.message && (
              <Text style={[styles.rowHint, styles.supportMessage]}>{supportContact.message}</Text>
            )}
            {!!supportContact.email && (
              <SupportRow
                icon="mail"
                label="Email"
                value={supportContact.email}
                onPress={() => Linking.openURL(`mailto:${supportContact.email}`)}
              />
            )}
            {!!supportContact.phone && (
              <SupportRow
                icon="phone"
                label="Phone"
                value={supportContact.phone}
                onPress={() => Linking.openURL(`tel:${supportContact.phone}`)}
              />
            )}
            {!!supportContact.whatsapp && (
              <SupportRow
                icon="send"
                label="WhatsApp"
                value={supportContact.whatsapp}
                onPress={() => Linking.openURL(`https://wa.me/${supportContact.whatsapp!.replace(/\D/g, '')}`)}
              />
            )}
          </>
        ) : (
          <View style={styles.supportRow}>
            <IconBubble name="info" size={40} iconSize={20} color={colors.textMuted} />
            <Text style={[styles.rowHint, styles.supportText]}>
              Support contact isn't available yet — check back soon.
            </Text>
          </View>
        )}
      </Card>

      <Button title="Log Out" variant="outline" icon="logout" onPress={logout} style={{ marginTop: spacing.xl }} />

      <Text style={styles.footer}>CrowdStock · v1.0.0</Text>
      {!!deviceId && (
        <Text style={styles.deviceId} selectable>
          Device ID: {deviceId}
        </Text>
      )}
    </Screen>
  );
}

function SupportRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: IconName;
  label: string;
  value: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <ListItem
      icon={icon}
      iconColor={colors.blue}
      title={label}
      subtitle={value}
      onPress={onPress}
      showChevron
      style={styles.supportListItem}
    />
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    identityCard: { alignItems: 'center', paddingVertical: spacing.xl },
    avatar: {
      width: 92,
      height: 92,
      borderRadius: 46,
      backgroundColor: colors.primary,
      borderWidth: 5,
      borderColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.md,
    },
    avatarText: { ...typography.display, color: colors.onPrimary },
    name: { ...typography.h2, color: colors.text, textAlign: 'center' },
    email: { ...typography.small, color: colors.textMuted, marginTop: 2, textAlign: 'center' },
    identityIconsRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
    tilesRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
    section: {},
    supportRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    supportText: { flex: 1, marginTop: 0 },
    supportMessage: { marginBottom: spacing.sm },
    supportListItem: { marginTop: spacing.sm },
    rowHint: { ...typography.tiny, color: colors.textDim, marginTop: 2 },
    footer: { ...typography.tiny, color: colors.textDim, textAlign: 'center', marginTop: spacing.xl },
    deviceId: { ...typography.tiny, color: colors.textDim, textAlign: 'center', marginTop: spacing.xs },
  });
}

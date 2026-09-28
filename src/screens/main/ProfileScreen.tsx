import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Colors, spacing, typography, useColors } from '../../theme/theme';
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
import { LegalDoc, MainStackParamList, MainTabParamList } from '../../navigation/types';

const LEGAL_ROWS: { doc: LegalDoc; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { doc: 'privacy', label: 'Privacy Policy', icon: 'shield-checkmark-outline' },
  { doc: 'terms', label: 'Terms of Service', icon: 'document-text-outline' },
  { doc: 'responsible', label: 'Responsible Use', icon: 'heart-outline' },
];

export default function ProfileScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const stackNavigation = navigation.getParent<NativeStackNavigationProp<MainStackParamList>>();
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
          <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
            {formatMoney(balance)}
          </Text>
          <Text style={styles.statLabel}>Balance</Text>
        </Card>
        <Card style={styles.statCard}>
          <Ionicons
            name={totalProfit >= 0 ? 'trending-up' : 'trending-down'}
            size={18}
            color={totalProfit >= 0 ? colors.success : colors.danger}
            style={{ marginBottom: 6 }}
          />
          <Text
            style={[styles.statValue, { color: totalProfit >= 0 ? colors.success : colors.danger }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
          >
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
          <View style={styles.rowText}>
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
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Auction notifications</Text>
            <Text style={styles.rowHint}>
              Alerts for auctions closing soon, bid updates, winners, and order delivery progress.
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleToggleNotifications}
            disabled={togglingNotifications}
            trackColor={{ false: colors.border, true: colors.primary }}
            thumbColor={colors.text}
          />
        </View>

        <TouchableOpacity style={[styles.row, styles.rowDivider]} onPress={startTour} activeOpacity={0.7}>
          <View style={styles.rowIconCircle}>
            <Ionicons name="compass-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowLabel}>Take the guided tour</Text>
            <Text style={styles.rowHint}>Replay the walkthrough of the app's main screens.</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </Card>

      <Text style={styles.sectionTitle}>Support</Text>
      <Card style={styles.section}>
        {loadingSupport ? (
          <Text style={styles.rowHint}>Loading…</Text>
        ) : supportContact ? (
          <>
            {!!supportContact.message && <Text style={[styles.rowHint, { marginBottom: spacing.sm }]}>{supportContact.message}</Text>}
            {!!supportContact.email && (
              <SupportRow
                icon="mail-outline"
                label="Email"
                value={supportContact.email}
                onPress={() => Linking.openURL(`mailto:${supportContact.email}`)}
              />
            )}
            {!!supportContact.phone && (
              <SupportRow
                icon="call-outline"
                label="Phone"
                value={supportContact.phone}
                onPress={() => Linking.openURL(`tel:${supportContact.phone}`)}
              />
            )}
            {!!supportContact.whatsapp && (
              <SupportRow
                icon="logo-whatsapp"
                label="WhatsApp"
                value={supportContact.whatsapp}
                onPress={() => Linking.openURL(`https://wa.me/${supportContact.whatsapp!.replace(/\D/g, '')}`)}
              />
            )}
          </>
        ) : (
          <Text style={styles.rowHint}>Support contact isn't available yet — check back soon.</Text>
        )}
      </Card>

      <Text style={styles.sectionTitle}>Legal</Text>
      <Card style={styles.section}>
        {LEGAL_ROWS.map((row, index) => (
          <TouchableOpacity
            key={row.doc}
            style={[styles.row, index > 0 && styles.rowDivider]}
            onPress={() => stackNavigation?.navigate('Legal', { doc: row.doc })}
            activeOpacity={0.7}
          >
            <View style={styles.rowIconCircle}>
              <Ionicons name={row.icon} size={18} color={colors.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{row.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </Card>

      <Button title="Log Out" variant="outline" onPress={logout} style={{ marginTop: spacing.xl }} />

      <Text style={styles.footer}>CrowdStock</Text>
      {/* Device ID display temporarily disabled — see deviceId state above. */}
      {/* {!!deviceId && (
        <Text style={styles.deviceId} selectable>
          Device ID: {deviceId}
        </Text>
      )} */}
    </Screen>
  );
}

function SupportRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  onPress: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <TouchableOpacity style={[styles.row, styles.supportRow]} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.rowIconCircle}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowHint}>{value}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
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
    rowText: { flex: 1, minWidth: 0, marginRight: spacing.md },
    rowDivider: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
    supportRow: { marginTop: spacing.sm },
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

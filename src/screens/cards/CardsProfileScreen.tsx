import { useCallback, useEffect, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CardTableScreen } from '../../components/cards/CardTableScreen';
import { CardPanel } from '../../components/cards/CardPanel';
import { CardButton } from '../../components/cards/CardButton';
import { AppIcon } from '../../components/AppIcon';
import { cardGame, cardRadius } from '../../theme/cardsTheme';
import { IconName } from '../../theme/icons';
import { computeCardStats, useCardsStore } from '../../store/cardsStore';
import { useAuthStore } from '../../store/authStore';
import { useWalletStore } from '../../store/walletStore';
import { useThemeStore } from '../../store/themeStore';
import { formatMoney, formatPercent } from '../../lib/format';
import { getDeviceId } from '../../lib/deviceId';
import { api } from '../../api';
import { SupportContact } from '../../types';
import { CardsTabParamList, MainStackParamList } from '../../navigation/types';

/** Big gold numerals; an em dash until there is a real number to show. */
function statValue(value: number | null): string {
  return value == null ? '—' : String(value);
}

/**
 * The card game's Profile tab. It is the *same account* as the stock-rounds
 * game — same store selectors, same handlers, same support/logout logic — just
 * presented on the navy felt instead of the cream paper theme.
 */
export default function CardsProfileScreen() {
  const tabNavigation = useNavigation<BottomTabNavigationProp<CardsTabParamList>>();
  const stackNavigation = tabNavigation.getParent<NativeStackNavigationProp<MainStackParamList>>();

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  // user.balance is always 0 — G22/G24 aren't the canonical balance source
  // (G25 is, see wallet.getBalance()), so this screen was showing a
  // permanently-zero balance regardless of the account's real balance.
  const balance = useWalletStore((s) => s.balance);
  const refreshWallet = useWalletStore((s) => s.refresh);
  const themeMode = useThemeStore((s) => s.mode);
  const toggleTheme = useThemeStore((s) => s.toggleMode);

  const cards = useCardsStore((s) => s.cards);
  const bankroll = useCardsStore((s) => s.bankroll);
  const ensureSeeded = useCardsStore((s) => s.ensureSeeded);
  const settleDue = useCardsStore((s) => s.settleDue);

  const [deviceId, setDeviceId] = useState('');
  const [supportContact, setSupportContact] = useState<SupportContact | null>(null);
  const [loadingSupport, setLoadingSupport] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const stats = useMemo(() => computeCardStats(cards), [cards]);
  const isDark = themeMode === 'dark';

  useEffect(() => {
    getDeviceId().then(setDeviceId);
  }, []);

  useFocusEffect(
    useCallback(() => {
      // The card game's own focus work, plus the stock ProfileScreen's exact
      // account/support refresh (same calls, same order, same error handling).
      ensureSeeded();
      settleDue();
      refreshWallet().catch(() => {});
      refreshUser().catch(() => {});
      setLoadingSupport(true);
      api.auth
        .getSupportContact()
        .then(setSupportContact)
        .catch(() => setSupportContact(null))
        .finally(() => setLoadingSupport(false));
    }, [ensureSeeded, settleDue, refreshWallet, refreshUser])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    useCardsStore.getState().ensureSeeded();
    useCardsStore.getState().settleDue();
    refreshWallet()
      .catch(() => {})
      .finally(() => setRefreshing(false));
  }, [refreshWallet]);

  return (
    <CardTableScreen refreshing={refreshing} onRefresh={handleRefresh}>
      {/* 1 ── header */}
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.eyebrow}>YOUR ACCOUNT</Text>
          <Text style={styles.title}>Profile</Text>
        </View>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
        </View>
      </View>

      {/* 2 ── identity */}
      <CardPanel tone="table" style={styles.identityPanel}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? '?'}</Text>
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {user?.name}
        </Text>
        <Text style={styles.phone}>{user?.phone}</Text>
        <View style={styles.chip}>
          <AppIcon name="user-outline" size={13} color={cardGame.ink} />
          <Text style={styles.chipText}>Player</Text>
        </View>
      </CardPanel>

      {/* 3 ── card stats */}
      <CardPanel tone="deep" eyebrow="ON THE FELT" title="Card stats" style={styles.panel}>
        <View style={styles.statsGrid}>
          <StatCell label="Played" value={statValue(stats.played)} />
          <StatCell label="Wins" value={statValue(stats.wins)} tone={cardGame.success} />
          <StatCell label="Losses" value={statValue(stats.losses)} tone={cardGame.danger} />
          <StatCell
            label="Win rate"
            value={stats.played > 0 ? formatPercent(stats.winRate) : '—'}
            tone={cardGame.gold}
          />
        </View>
      </CardPanel>

      {/* 4 ── money */}
      <CardPanel tone="deep" eyebrow="BALANCES" title="Money" style={styles.panel}>
        <View style={styles.moneyRow}>
          <AppIcon name="pot" size={24} color={cardGame.gold} />
          <View style={styles.moneyText}>
            <Text style={styles.moneyLabel}>Card table</Text>
            <Text style={styles.moneyValue} numberOfLines={1} adjustsFontSizeToFit>
              {bankroll == null ? '—' : formatMoney(bankroll)}
            </Text>
          </View>
        </View>
        <View style={styles.moneyRow}>
          <AppIcon name="wallet" size={24} color={cardGame.gold} />
          <View style={styles.moneyText}>
            <Text style={styles.moneyLabel}>Wallet</Text>
            <Text style={styles.moneyValue} numberOfLines={1} adjustsFontSizeToFit>
              {formatMoney(balance)}
            </Text>
          </View>
        </View>
        <CardButton title="Withdraw" variant="outline" icon="withdraw" onPress={() => stackNavigation?.navigate('Withdrawal')} />
      </CardPanel>

      {/* 5 ── preferences */}
      <CardPanel tone="deep" eyebrow="MAKE IT YOURS" title="Preferences" style={styles.panel}>
        <View style={styles.prefRow}>
          <View style={styles.prefIcon}>
            <AppIcon name={isDark ? 'moon' : 'sun'} size={20} color={cardGame.gold} />
          </View>
          <View style={styles.prefText}>
            <Text style={styles.prefTitle}>{isDark ? 'Dark mode' : 'Light mode'}</Text>
            <Text style={styles.prefHint}>Switch between a dark and light color theme.</Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: cardGame.rim, true: cardGame.gold }}
            thumbColor={cardGame.cream}
          />
        </View>
      </CardPanel>

      {/* 6 ── support */}
      <CardPanel tone="deep" eyebrow="NEED A HAND?" title="Support" style={styles.panel}>
        {loadingSupport ? (
          <View style={styles.supportRow}>
            <View style={styles.prefIcon}>
              <AppIcon name="help" size={20} color={cardGame.gold} />
            </View>
            <Text style={styles.supportText}>Loading…</Text>
          </View>
        ) : supportContact ? (
          <>
            {!!supportContact.message && <Text style={styles.supportMessage}>{supportContact.message}</Text>}
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
            <View style={styles.prefIcon}>
              <AppIcon name="info" size={20} color={cardGame.textMuted} />
            </View>
            <Text style={styles.supportText}>
              Support contact isn&apos;t available yet — check back soon.
            </Text>
          </View>
        )}
      </CardPanel>

      {/* 7 ── switch game */}
      <CardButton
        title="Switch game"
        variant="outline"
        icon="cards-outline"
        onPress={() => stackNavigation?.navigate('GamePicker')}
        style={styles.action}
      />

      {/* 8 ── log out */}
      <CardButton title="Log out" variant="magenta" icon="logout" onPress={logout} style={styles.action} />

      {/* 9 ── footer */}
      <Text style={styles.footer}>CrowdStock · v1.0.0</Text>
      {!!deviceId && (
        <Text style={styles.deviceId} selectable>
          Device ID: {deviceId}
        </Text>
      )}
    </CardTableScreen>
  );
}

/** One big gold numeral in the stats grid. */
function StatCell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, !!tone && { color: tone }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/** A tappable support line — navy version of the stock screen's ListItem row. */
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
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [styles.supportLink, pressed && styles.supportLinkPressed]}
    >
      <View style={styles.prefIcon}>
        <AppIcon name={icon} size={20} color={cardGame.gold} />
      </View>
      <View style={styles.prefText}>
        <Text style={styles.prefTitle}>{label}</Text>
        <Text style={styles.prefHint} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <AppIcon name="chevron-right" size={18} color={cardGame.textDim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  eyebrow: { color: cardGame.textDim, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: cardGame.text, fontSize: 27, fontWeight: '900', marginTop: 2 },

  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: cardGame.gold,
    backgroundColor: cardGame.tableDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: cardGame.gold, fontSize: 32, fontWeight: '900' },

  identityPanel: { alignItems: 'center', paddingVertical: 22, marginTop: 12 },
  name: { color: cardGame.text, fontSize: 20, fontWeight: '900', marginTop: 12, textAlign: 'center' },
  phone: { color: cardGame.textMuted, fontSize: 13, marginTop: 3, textAlign: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 12,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: cardRadius.pill,
    backgroundColor: cardGame.gold,
  },
  chipText: { color: cardGame.ink, fontSize: 11.5, fontWeight: '900', letterSpacing: 0.6, textTransform: 'uppercase' },

  panel: { marginTop: 12 },

  statsGrid: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: cardRadius.chip,
    backgroundColor: cardGame.table,
    borderWidth: 1,
    borderColor: cardGame.rimSoft,
  },
  statValue: { color: cardGame.gold, fontSize: 21, fontWeight: '900' },
  statLabel: { color: cardGame.textDim, fontSize: 10.5, fontWeight: '800', letterSpacing: 0.9, marginTop: 4 },

  moneyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  moneyText: { flex: 1, minWidth: 0 },
  moneyLabel: { color: cardGame.textDim, fontSize: 10.5, fontWeight: '800', letterSpacing: 1 },
  moneyValue: { color: cardGame.gold, fontSize: 22, fontWeight: '900', marginTop: 2 },

  prefRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  prefIcon: {
    width: 38,
    height: 38,
    borderRadius: cardRadius.chip,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(247,183,51,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(247,183,51,0.32)',
  },
  prefText: { flex: 1, minWidth: 0 },
  prefTitle: { color: cardGame.text, fontSize: 14, fontWeight: '800' },
  prefHint: { color: cardGame.textMuted, fontSize: 11.5, marginTop: 2 },

  supportRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  supportText: { flex: 1, color: cardGame.textMuted, fontSize: 12.5 },
  supportMessage: { color: cardGame.textMuted, fontSize: 12.5, marginBottom: 4 },
  supportLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 10,
    padding: 8,
    marginHorizontal: -8,
    borderRadius: cardRadius.chip,
  },
  supportLinkPressed: { backgroundColor: cardGame.tableRaised, opacity: 0.9 },

  action: { marginTop: 12 },

  footer: { color: cardGame.textDim, fontSize: 11, textAlign: 'center', marginTop: 20 },
  deviceId: { color: cardGame.textDim, fontSize: 11, textAlign: 'center', marginTop: 4 },
});

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as Contacts from 'expo-contacts';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { EmptyState } from '../../components/EmptyState';
import { IconBubble } from '../../components/IconBubble';
import { Badge } from '../../components/Badge';
import { ListItem } from '../../components/ListItem';
import { StatTile } from '../../components/StatTile';
import { Illustration } from '../../components/AppIcon';
import { Colors, radius, spacing, typography, useColors } from '../../theme/theme';
import { withAlpha } from '../../lib/color';
import { IconName } from '../../theme/icons';
import { useAuthStore } from '../../store/authStore';
import { useInviteStore } from '../../store/inviteStore';
import { api } from '../../api';
import { normalizeLocalPhone } from '../../lib/validation';
import { formatMoney } from '../../lib/format';

const PAGE_SIZE = 10;

interface InviteContact {
  id: string;
  name: string;
  phone: string; // canonical local format, e.g. 08012345678
}

type PermissionState = 'checking' | 'undetermined' | 'granted' | 'denied';

/**
 * Referral/invite screen. Contacts access is a materially more sensitive
 * permission than anything else in this app (the only other permission
 * flow, notifications in lib/notifications.ts, has no pre-prompt
 * explanation or denial UI at all) — this deliberately adds both here
 * rather than following that bare convention, given how much more invasive
 * contacts access is.
 *
 * No bulk "check many phones" endpoint exists (B2_IsRegisteredUser takes
 * one phone at a time), so registration status is checked lazily, only for
 * whatever page of contacts is actually rendered — not the full list up
 * front, which could be hundreds of contacts.
 */
export default function InviteScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const myPhone = useAuthStore((s) => s.user?.phone);
  const downloadUrl = useAuthStore((s) => s.user?.playStoreUrl || s.user?.appStoreUrl);
  const stats = useInviteStore((s) => s.stats);
  const statsLoading = useInviteStore((s) => s.statsLoading);
  const fetchStats = useInviteStore((s) => s.fetchStats);
  const invitedContacts = useInviteStore((s) => s.invitedContacts);
  const recordInvite = useInviteStore((s) => s.recordInvite);
  const refreshInvitedStatuses = useInviteStore((s) => s.refreshInvitedStatuses);

  const [permission, setPermission] = useState<PermissionState>('checking');
  const [allContacts, setAllContacts] = useState<InviteContact[] | null>(null);
  const [contactsError, setContactsError] = useState('');
  const [search, setSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [registration, setRegistration] = useState<Record<string, boolean | 'checking'>>({});
  const checkedRef = useRef<Set<string>>(new Set());

  useFocusEffect(
    useCallback(() => {
      fetchStats().catch(() => {});
      refreshInvitedStatuses().catch(() => {});
    }, [])
  );

  useEffect(() => {
    Contacts.getPermissionsAsync().then((res) => {
      if (res.granted) {
        setPermission('granted');
        loadContacts();
      } else {
        setPermission('undetermined');
      }
    });
  }, []);

  async function loadContacts() {
    try {
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
        sort: Contacts.SortTypes.FirstName,
      });
      const seen = new Set<string>();
      const normalized: InviteContact[] = [];
      for (const c of data) {
        const rawPhone = c.phoneNumbers?.[0]?.number;
        if (!rawPhone) continue;
        const phone = normalizeLocalPhone(rawPhone);
        if (!phone || phone === myPhone || seen.has(phone)) continue;
        seen.add(phone);
        normalized.push({ id: c.id ?? phone, name: c.name?.trim() || phone, phone });
      }
      setAllContacts(normalized);
    } catch (e) {
      setContactsError('Could not load your contacts. Pull down to try again.');
    }
  }

  async function handleAllow() {
    const requested = await Contacts.requestPermissionsAsync();
    if (requested.granted) {
      setPermission('granted');
      loadContacts();
    } else {
      setPermission('denied');
    }
  }

  const filtered = useMemo(() => {
    if (!allContacts) return [];
    const q = search.trim().toLowerCase();
    if (!q) return allContacts;
    return allContacts.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q));
  }, [allContacts, search]);

  const visible = filtered.slice(0, visibleCount);

  // Lazily check registration status only for whatever's currently rendered.
  useEffect(() => {
    const toCheck = visible.filter((c) => !checkedRef.current.has(c.phone));
    if (toCheck.length === 0) return;
    toCheck.forEach((c) => checkedRef.current.add(c.phone));
    setRegistration((prev) => {
      const next = { ...prev };
      toCheck.forEach((c) => {
        next[c.phone] = 'checking';
      });
      return next;
    });
    toCheck.forEach((c) => {
      api.invite
        .isRegistered(c.phone)
        .then((isRegistered) => setRegistration((prev) => ({ ...prev, [c.phone]: isRegistered })))
        .catch(() => {
          // A network failure here shouldn't be shown as "definitely not
          // registered" — drop it from the checked set so a later render
          // (e.g. pull-to-refresh) retries instead of getting stuck wrong.
          checkedRef.current.delete(c.phone);
          setRegistration((prev) => {
            const { [c.phone]: _removed, ...rest } = prev;
            return rest;
          });
        });
    });
  }, [visible]);

  function handleInvite(contact: InviteContact) {
    api.invite.logInvite(contact.phone).catch(() => {});
    recordInvite(contact.phone, contact.name);
    const firstName = contact.name.split(' ')[0];
    const linkLine = downloadUrl ? ` Download here: ${downloadUrl}` : '';
    const message = encodeURIComponent(
      `Hey ${firstName}, join me on CrowdStock! Download the app and let's play together.${linkLine}`
    );
    Linking.openURL(`https://wa.me/234${contact.phone.slice(1)}?text=${message}`).catch(() => {});
  }

  function handleGiftInfo() {
    Alert.alert('Reward Credits', 'Earn credits and payout by inviting friends who join and play CrowdStock.');
  }

  const showList = permission === 'granted';

  return (
    <Screen scroll={false}>
      <FlatList
        data={showList ? visible : []}
        keyExtractor={(c) => c.phone}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        onRefresh={showList ? loadContacts : undefined}
        refreshing={false}
        ListHeaderComponent={
          <>
            <Card tone="pink" variant="sticker" style={styles.heroCard}>
              <View style={styles.headerRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.heroEyebrow}>INVITE & EARN</Text>
                  <Text style={styles.subtitle}>Onboard Others, Earn More</Text>
                </View>
                <TouchableOpacity style={styles.giftButton} onPress={handleGiftInfo} hitSlop={8}>
                  <IconBubble name="gift" size={48} iconSize={28} />
                </TouchableOpacity>
              </View>
              <Illustration name="hero" size={136} style={styles.heroArt} />
            </Card>

            <Card tone="success" style={styles.statsCard}>
              <Text style={styles.statsBody}>
                Earn more by bringing others to CrowdStock — the more people you onboard, the higher your payout gets.
              </Text>
              <View style={styles.statsRow}>
                <StatBlock
                  icon="people-outline"
                  value={stats?.successfulConversions ?? 0}
                  label="People Onboarded"
                  loading={statsLoading}
                  color={colors.teal}
                />
                <StatBlock
                  icon="medal"
                  value={stats?.credits ?? 0}
                  label="Reward Credits"
                  loading={statsLoading}
                  color={colors.amber}
                />
                <StatBlock
                  icon="wallet"
                  value={stats ? formatMoney(stats.payout) : 0}
                  label="Payout"
                  loading={statsLoading}
                  color={colors.accent}
                />
              </View>
            </Card>

            {Object.keys(invitedContacts).length > 0 && (
              <Card tone="teal" style={styles.trackingCard}>
                <View style={styles.trackingRow}>
                  <IconBubble name="people" size={42} iconSize={22} />
                  <Text style={styles.trackingTitle}>Your Invites</Text>
                </View>
                <Text style={styles.trackingBody}>
                  {Object.values(invitedContacts).filter((c) => c.joined).length} of{' '}
                  {Object.keys(invitedContacts).length} people you invited from this device have joined so far.
                </Text>
              </Card>
            )}

            {showList && (
              <Input
                value={search}
                onChangeText={(t) => {
                  setSearch(t);
                  setVisibleCount(PAGE_SIZE);
                }}
                placeholder="Search contacts"
                autoCapitalize="none"
                leftIcon="search"
                containerStyle={{ marginTop: spacing.lg }}
              />
            )}
          </>
        }
        renderItem={({ item }) => (
          <ContactRow
            contact={item}
            status={registration[item.phone]}
            invited={!!invitedContacts[item.phone]}
            onInvite={() => handleInvite(item)}
          />
        )}
        ListFooterComponent={
          showList && visibleCount < filtered.length ? (
            <Button
              title="Load more contacts"
              variant="outline"
              size="sm"
              icon="chevron-down"
              onPress={() => setVisibleCount((n) => n + PAGE_SIZE)}
              style={styles.loadMore}
            />
          ) : null
        }
        ListEmptyComponent={
          permission === 'checking' ? (
            <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
          ) : permission === 'undetermined' ? (
            <Card tone="primary" variant="sticker" style={styles.permissionCard}>
              <IconBubble name="people" size={88} iconSize={44} />
              <Text style={styles.permissionTitle}>See who's already on CrowdStock</Text>
              <Text style={styles.permissionBody}>
                Allow contacts access so we can show which of your contacts have already joined, and help you invite
                the rest.
              </Text>
              <Button title="Allow Contacts Access" icon="people-outline" onPress={handleAllow} style={{ marginTop: spacing.md }} />
            </Card>
          ) : permission === 'denied' ? (
            <Card tone="danger" variant="sticker" style={styles.permissionCard}>
              <IconBubble name="lock" size={88} iconSize={44} color={colors.textMuted} />
              <Text style={styles.permissionTitle}>Contacts access denied</Text>
              <Text style={styles.permissionBody}>
                You can enable it later in your device Settings to invite friends from your contact list.
              </Text>
              <Button title="Open Settings" variant="outline" icon="lock" onPress={() => Linking.openSettings()} style={{ marginTop: spacing.md }} />
            </Card>
          ) : allContacts === null ? (
            <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
          ) : !!contactsError ? (
            <EmptyState illustration="empty" title="Couldn't load contacts" message={contactsError} />
          ) : (
            <EmptyState illustration="empty" title="No contacts found" message="Try a different search." />
          )
        }
      />
    </Screen>
  );
}

function StatBlock({
  icon,
  value,
  label,
  loading,
  color,
}: {
  icon: IconName;
  value: number | string;
  label: string;
  loading: boolean;
  color?: string;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <StatTile
      icon={icon}
      value={loading ? '—' : String(value)}
      label={label}
      color={color}
      style={styles.statTile}
    />
  );
}

function ContactRow({
  contact,
  status,
  invited,
  onInvite,
}: {
  contact: InviteContact;
  status: boolean | 'checking' | undefined;
  invited: boolean;
  onInvite: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // Same per-contact letter avatar the original drew, now in the new palette.
  const avatarPalette = [colors.primary, colors.teal, colors.accent, colors.pink, colors.blue, colors.amber];
  const avatarTint = avatarPalette[(contact.name?.charCodeAt(0) ?? 0) % avatarPalette.length];
  const initial = contact.name?.trim()?.[0]?.toUpperCase() ?? '?';
  return (
    <Card tone="alt" style={styles.contactCard} padded={false}>
      <ListItem
        leading={
          <View style={[styles.avatar, { backgroundColor: withAlpha(avatarTint, 0.16) }]}>
            <Text style={[styles.avatarText, { color: avatarTint }]}>{initial}</Text>
          </View>
        }
        title={contact.name}
        subtitle={contact.phone}
        style={styles.contactListItem}
        right={
          status === 'checking' || status === undefined ? (
            <ActivityIndicator size="small" color={colors.textMuted} />
          ) : status === true ? (
            <Badge label="CrowdStock" tone="success" icon="check" size="sm" />
          ) : (
            <View style={styles.inviteButtonWrap}>
              <Button
                title={invited ? 'Invited' : 'Invite'}
                variant="outline"
                size="sm"
                disabled={invited}
                onPress={onInvite}
                accessibilityLabel={invited ? `${contact.name} invited` : `Invite ${contact.name} via WhatsApp`}
              />
            </View>
          )
        }
      />
    </Card>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    heroCard: { marginBottom: spacing.lg },
    headerRow: { flexDirection: 'row', alignItems: 'center' },
    heroEyebrow: { ...typography.label, color: colors.pink },
    subtitle: { ...typography.h2, color: colors.text, marginTop: 2 },
    giftButton: {
      width: 48,
      height: 48,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: spacing.md,
    },
    heroArt: { alignSelf: 'center', marginTop: spacing.sm },
    statsCard: {},
    statsBody: { ...typography.small, color: colors.text, lineHeight: 19 },
    statsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    statTile: { minHeight: 108, padding: spacing.sm + 2 },
    trackingCard: { marginTop: spacing.md },
    trackingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    trackingTitle: { ...typography.h3, color: colors.text },
    trackingBody: { ...typography.tiny, color: colors.textMuted, marginTop: spacing.sm, lineHeight: 16 },
    permissionCard: { alignItems: 'center', marginTop: spacing.lg, padding: spacing.xl },
    permissionTitle: { ...typography.h3, color: colors.text, marginTop: spacing.md, textAlign: 'center' },
    permissionBody: { ...typography.small, color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center', lineHeight: 19 },
    contactCard: { marginTop: spacing.sm },
    contactListItem: { paddingHorizontal: spacing.md, borderBottomWidth: 0 },
    avatar: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    avatarText: { ...typography.h3 },
    inviteButtonWrap: { width: 108 },
    loadMore: { marginTop: spacing.lg },
  });
}

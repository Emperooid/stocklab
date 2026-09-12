import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Contacts from 'expo-contacts';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { EmptyState } from '../../components/EmptyState';
import { Colors, radius, spacing, typography, useColors } from '../../theme/theme';
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
            <View style={styles.headerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.subtitle}>Onboard Others, Earn More</Text>
              </View>
              <TouchableOpacity style={styles.giftButton} onPress={handleGiftInfo} hitSlop={8}>
                <Ionicons name="gift-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <Card style={styles.statsCard}>
              <Text style={styles.statsBody}>
                Earn more by bringing others to CrowdStock — the more people you onboard, the higher your payout gets.
              </Text>
              <View style={styles.statsRow}>
                <StatBlock icon="people-outline" value={stats?.successfulConversions ?? 0} label="People Onboarded" loading={statsLoading} />
                <StatBlock icon="ribbon-outline" value={stats?.credits ?? 0} label="Reward Credits" loading={statsLoading} />
                <StatBlock
                  icon="wallet-outline"
                  value={stats ? formatMoney(stats.payout) : 0}
                  label="Payout"
                  loading={statsLoading}
                />
              </View>
            </Card>

            {Object.keys(invitedContacts).length > 0 && (
              <Card style={styles.trackingCard}>
                <Text style={styles.trackingTitle}>Your Invites</Text>
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
                style={{ marginTop: spacing.lg }}
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
            <TouchableOpacity style={styles.loadMore} onPress={() => setVisibleCount((n) => n + PAGE_SIZE)}>
              <Text style={styles.loadMoreText}>Load more contacts</Text>
              <Ionicons name="chevron-down" size={14} color={colors.primary} />
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          permission === 'checking' ? (
            <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
          ) : permission === 'undetermined' ? (
            <Card style={styles.permissionCard}>
              <Ionicons name="people-circle-outline" size={40} color={colors.primary} />
              <Text style={styles.permissionTitle}>See who's already on CrowdStock</Text>
              <Text style={styles.permissionBody}>
                Allow contacts access so we can show which of your contacts have already joined, and help you invite
                the rest.
              </Text>
              <Button title="Allow Contacts Access" onPress={handleAllow} style={{ marginTop: spacing.md }} />
            </Card>
          ) : permission === 'denied' ? (
            <Card style={styles.permissionCard}>
              <Ionicons name="lock-closed-outline" size={40} color={colors.textMuted} />
              <Text style={styles.permissionTitle}>Contacts access denied</Text>
              <Text style={styles.permissionBody}>
                You can enable it later in your device Settings to invite friends from your contact list.
              </Text>
              <Button title="Open Settings" variant="outline" onPress={() => Linking.openSettings()} style={{ marginTop: spacing.md }} />
            </Card>
          ) : allContacts === null ? (
            <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
          ) : !!contactsError ? (
            <EmptyState icon="alert-circle-outline" title="Couldn't load contacts" message={contactsError} />
          ) : (
            <EmptyState icon="search-outline" title="No contacts found" message="Try a different search." />
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
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number | string;
  label: string;
  loading: boolean;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.statBlock}>
      <Ionicons name={icon} size={16} color={colors.primary} />
      <Text style={styles.statValue}>{loading ? '—' : value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
  return (
    <Card style={styles.contactCard}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{contact.name[0]?.toUpperCase() ?? '?'}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.contactName} numberOfLines={1}>
          {contact.name}
        </Text>
        <Text style={styles.contactPhone}>{contact.phone}</Text>
      </View>
      {status === 'checking' || status === undefined ? (
        <ActivityIndicator size="small" color={colors.textMuted} />
      ) : status === true ? (
        <View style={styles.registeredPill}>
          <Text style={styles.registeredPillText}>CrowdStock</Text>
          <Ionicons name="checkmark-circle" size={14} color={colors.success} />
        </View>
      ) : (
        <Button
          title={invited ? 'Invited' : 'Invite'}
          variant="outline"
          size="sm"
          disabled={invited}
          onPress={onInvite}
          accessibilityLabel={invited ? `${contact.name} invited` : `Invite ${contact.name} via WhatsApp`}
        />
      )}
    </Card>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
    subtitle: { ...typography.small, color: colors.textMuted },
    giftButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statsCard: { backgroundColor: colors.successTint, borderColor: colors.success },
    trackingCard: { marginTop: spacing.md, backgroundColor: colors.blueTint, borderColor: colors.blue },
    trackingTitle: { ...typography.small, color: colors.text, fontWeight: '700' },
    trackingBody: { ...typography.tiny, color: colors.textMuted, marginTop: 2, lineHeight: 15 },
    statsBody: { ...typography.small, color: colors.text, lineHeight: 18 },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
    statBlock: { alignItems: 'center', flex: 1, gap: 2 },
    statValue: { ...typography.h3, color: colors.text, marginTop: 2 },
    statLabel: { ...typography.tiny, color: colors.textMuted, textAlign: 'center' },
    permissionCard: { alignItems: 'center', marginTop: spacing.lg, padding: spacing.xl },
    permissionTitle: { ...typography.h3, color: colors.text, marginTop: spacing.md, textAlign: 'center' },
    permissionBody: { ...typography.small, color: colors.textMuted, marginTop: spacing.xs, textAlign: 'center', lineHeight: 18 },
    contactCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { ...typography.body, color: colors.primary, fontWeight: '700' },
    contactName: { ...typography.body, color: colors.text, fontWeight: '600' },
    contactPhone: { ...typography.tiny, color: colors.textMuted, marginTop: 2 },
    registeredPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.successTint,
      borderRadius: radius.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
    },
    registeredPillText: { ...typography.tiny, color: colors.success, fontWeight: '700' },
    loadMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: spacing.md },
    loadMoreText: { ...typography.small, color: colors.primary, fontWeight: '700' },
  });
}

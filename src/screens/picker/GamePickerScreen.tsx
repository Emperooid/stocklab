import { useCallback, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { Colors, radius, shadow, spacing, typography, useColors } from '../../theme/theme';
import { useAuthStore } from '../../store/authStore';
import { useWalletStore } from '../../store/walletStore';
import { computeCardStats, useCardsStore } from '../../store/cardsStore';
import { ROUND_SLOTS } from '../../lib/schedule';
import { refreshAppData } from '../../lib/refresh';
import { formatMoney } from '../../lib/format';
import { MainStackParamList } from '../../navigation/types';

// Per explicit reference image: the two game pills get their own fixed,
// vivid faces (not the main green theme) so they read as two distinct game
// choices at a glance — gold for Stock Rounds, pink for Cards.
const PILL_GOLD = '#FFC94D';
const PILL_GOLD_DEEP = '#E0A500';
const PILL_PINK = '#EC4899';
const PILL_PINK_DEEP = '#C2185B';
const PILL_INK = '#241505';

/**
 * The lobby — what you land on after signing in. Deliberately has **no navbar**:
 * a profile strip, then two big pills, one per game. Choosing a pill pushes that
 * game's own space, which brings its own bar. The invite banner at the bottom
 * mirrors the referral push.
 */
export default function GamePickerScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const user = useAuthStore((s) => s.user);
  const balance = useWalletStore((s) => s.balance);
  const refreshWallet = useWalletStore((s) => s.refresh);
  const cards = useCardsStore((s) => s.cards);
  const ensureSeeded = useCardsStore((s) => s.ensureSeeded);
  const settleDue = useCardsStore((s) => s.settleDue);

  useFocusEffect(
    useCallback(() => {
      refreshWallet().catch(() => {});
      ensureSeeded();
      settleDue();
    }, [ensureSeeded, settleDue, refreshWallet])
  );

  // The picker is outside Screen, so it carries its own pull. It reloads the
  // same set as everywhere else, plus this screen's own card bookkeeping.
  const [pulling, setPulling] = useState(false);
  const handleRefresh = useCallback(() => {
    setPulling(true);
    ensureSeeded();
    settleDue();
    refreshAppData().finally(() => setPulling(false));
  }, [ensureSeeded, settleDue]);

  const cardStats = computeCardStats(cards);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={pulling}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.topBar}>
          <View style={styles.wordmark}>
            <Ionicons name="trending-up" size={26} color={colors.primary} />
            <Text style={styles.wordmarkText}>CrowdStock</Text>
          </View>
          <Pressable
            style={styles.topBtn}
            onPress={() => navigation.navigate('News')}
            accessibilityLabel="News and alerts"
          >
            <Ionicons name="notifications-outline" size={19} color={colors.text} />
          </Pressable>
        </View>

        {/* ── profile strip ──────────────────────────────────────────────── */}
        <View style={styles.infoCard}>
          <InfoColumn
            icon="wallet-outline"
            label="Wallet Balance"
            value={formatMoney(balance)}
            styles={styles}
            colors={colors}
            first
            onPress={() => navigation.navigate('LobbyWallet')}
          />
          <View style={styles.infoDivider} />
          <InfoColumn
            icon="person-outline"
            label="Name"
            value={user?.name?.split(' ')[0] ?? 'Player'}
            styles={styles}
            colors={colors}
          />
          <View style={styles.infoDivider} />
          <InfoColumn icon="call-outline" label="Phone" value={user?.phone ?? '—'} styles={styles} colors={colors} small />
        </View>

        <Text style={styles.prompt}>Pick a game and play</Text>

        {/* ── game 1 ─────────────────────────────────────────────────────── */}
        <GamePill
          icon="stats-chart"
          badgeIcon="people"
          title="Hourly Cash"
          subtitle=" Choose Between 1 and 5 and Win Hourly"
          meta={`${ROUND_SLOTS.length} rounds a day`}
          face={PILL_GOLD}
          deep={PILL_GOLD_DEEP}
          textColor={PILL_INK}
          metaColor="rgba(36,21,5,0.62)"
          styles={styles}
          onPress={() => navigation.navigate('RoundsGame')}
          accessibilityLabel="Play Hourly Cash"
        />

        {/* ── game 2 ─────────────────────────────────────────────────────── */}
        <GamePill
          icon="cash"
          badgeIcon="card"
          title="Hide or Guess"
          subtitle="Hide a figure or Guess Right to Win Instantly"
          face={PILL_PINK}
          deep={PILL_PINK_DEEP}
          textColor="#FFFFFF"
          metaColor="rgba(255,255,255,0.82)"
          styles={styles}
          onPress={() => navigation.navigate('CardsGame')}
          accessibilityLabel="Play Hide and Seek"
        />

        {/* ── invite ─────────────────────────────────────────────────────── */}
        <Pressable
          style={({ pressed }) => [styles.invite, pressed && { opacity: 0.85 }]}
          onPress={() => navigation.navigate('Invite')}
          accessibilityLabel="Invite contacts and earn points"
        >
          <View style={styles.inviteArt}>
            <Ionicons name="megaphone" size={56} color={colors.primary} />
            <View style={[styles.inviteArtBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="people" size={15} color={colors.onPrimary} />
            </View>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.inviteTitle}>Invite contacts..</Text>
            <Text style={styles.inviteHighlight}>and earn points</Text>
            <Text style={styles.inviteMeta} numberOfLines={1}>
              {cardStats.played > 0
                ? `${formatMoney(cardStats.winnings)} won so far`
                : 'Bring a friend, both of you earn'}
            </Text>
          </View>
          <View style={styles.inviteChevron}>
            <Ionicons name="chevron-forward" size={20} color={colors.primary} />
          </View>
        </Pressable>

        <View style={styles.spacer} />
        <Text style={styles.footnote}>Predict · Play · Win</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoColumn({
  icon,
  label,
  value,
  styles,
  colors,
  first,
  small,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
  colors: Colors;
  first?: boolean;
  small?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <>
      <Ionicons name={icon} size={28} color={colors.primary} />
      <Text style={styles.infoLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text
        style={[styles.infoValue, small && styles.infoValueSmall]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {value}
      </Text>
    </>
  );
  return onPress ? (
    <Pressable style={styles.infoColumn} onPress={onPress} accessibilityLabel="Open wallet">
      {content}
    </Pressable>
  ) : (
    <View style={styles.infoColumn}>{content}</View>
  );
}

function GamePill({
  icon,
  badgeIcon,
  title,
  subtitle,
  meta,
  face,
  deep,
  textColor,
  metaColor,
  onPress,
  accessibilityLabel,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  /** Small corner badge, layered over the main icon — matches the reference image's combined icon look. */
  badgeIcon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  meta?: string;
  face: string;
  deep: string;
  textColor: string;
  metaColor: string;
  onPress: () => void;
  accessibilityLabel: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={[styles.pillWrap, { paddingBottom: 6 }]}>
      <View pointerEvents="none" style={[styles.pillBase, { backgroundColor: deep }]} />
      <Pressable
        onPress={onPress}
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [
          styles.pill,
          { backgroundColor: face },
          pressed && { transform: [{ translateY: 4 }] },
        ]}
      >
        <View style={styles.pillArt}>
          <Ionicons name={icon} size={40} color={textColor} />
          {!!badgeIcon && (
            <View style={[styles.pillArtBadge, { backgroundColor: deep, borderColor: face }]}>
              <Ionicons name={badgeIcon} size={14} color={textColor} />
            </View>
          )}
        </View>
        <View style={styles.pillText}>
          <Text style={[styles.pillTitle, { color: textColor }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.pillSubtitle, { color: textColor }]} numberOfLines={2}>
            {subtitle}
          </Text>
          {!!meta && (
            <Text style={[styles.pillMeta, { color: metaColor }]} numberOfLines={1}>
              {meta}
            </Text>
          )}
        </View>
        <View style={[styles.pillChevron, { backgroundColor: deep }]}>
          <Ionicons name="chevron-forward" size={22} color="#FFFFFF" />
        </View>
      </Pressable>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    content: {
      padding: spacing.lg,
      paddingBottom: spacing.xxxl,
      width: '100%',
      maxWidth: 520,
      alignSelf: 'center',
      // Lets the spacer below push the footnote to the bottom on tall screens.
      flexGrow: 1,
    },
    spacer: { flex: 1, minHeight: spacing.lg },

    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    wordmark: { flexDirection: 'row', alignItems: 'center', gap: 9 },
    wordmarkText: { ...typography.h2, color: colors.text, letterSpacing: -0.4 },
    topBtn: {
      width: 42,
      height: 42,
      borderRadius: 16,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },

    /* profile strip */
    infoCard: {
      flexDirection: 'row',
      alignItems: 'stretch',
      backgroundColor: colors.surface,
      borderRadius: radius.xxl,
      paddingVertical: spacing.lg,
      marginTop: spacing.lg,
      ...shadow.lg,
    },
    infoColumn: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
    infoDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },
    infoLabel: { ...typography.tiny, color: colors.textMuted, marginTop: 8, fontWeight: '700' },
    infoValue: { ...typography.h3, color: colors.text, marginTop: 2, textAlign: 'center' },
    infoValueSmall: { fontSize: typography.small.fontSize, marginTop: 4 },

    prompt: {
      ...typography.h2,
      color: colors.text,
      textAlign: 'center',
      marginTop: spacing.xl,
      marginBottom: spacing.md,
    },

    /* game pills */
    pillWrap: { position: 'relative', marginBottom: spacing.md },
    pillBase: { position: 'absolute', left: 0, right: 0, top: 6, bottom: 0, borderRadius: radius.pill },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radius.pill,
      paddingVertical: spacing.md,
      paddingLeft: spacing.sm,
      paddingRight: spacing.md,
      gap: spacing.sm,
      minHeight: 112,
    },
    pillArt: { width: 92, alignItems: 'center', justifyContent: 'center' },
    pillArtBadge: {
      position: 'absolute',
      bottom: 10,
      right: 10,
      width: 26,
      height: 26,
      borderRadius: 13,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pillText: { flex: 1, minWidth: 0 },
    pillTitle: { ...typography.h2, letterSpacing: -0.3 },
    pillSubtitle: { ...typography.small, fontWeight: '700', marginTop: 1, lineHeight: 17 },
    pillMeta: { ...typography.tiny, fontWeight: '800', marginTop: 4 },
    pillChevron: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
    },

    /* invite banner */
    invite: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      marginTop: spacing.xl,
      paddingVertical: spacing.md,
    },
    inviteArt: { width: 118, alignItems: 'center', justifyContent: 'center' },
    inviteArtBadge: {
      position: 'absolute',
      bottom: 4,
      right: 18,
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 2,
      borderColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    inviteTitle: { ...typography.h2, color: colors.text },
    inviteHighlight: { ...typography.h2, color: colors.primary, marginTop: -2 },
    inviteMeta: { ...typography.tiny, color: colors.textMuted, marginTop: 6, fontWeight: '700' },
    inviteChevron: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },

    footnote: {
      ...typography.label,
      color: colors.textDim,
      textAlign: 'center',
      marginTop: spacing.lg,
    },
  });
}

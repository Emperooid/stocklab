import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon, Illustration, IllustrationName } from '../../components/AppIcon';
import { Colors, lightColors, radius, shadow, spacing, typography, useColors, useIsLight } from '../../theme/theme';
import { useAuthStore } from '../../store/authStore';
import { useWalletStore } from '../../store/walletStore';
import { computeCardStats, openCards, useCardsStore } from '../../store/cardsStore';
import { ROUND_SLOTS } from '../../lib/schedule';
import { formatMoney } from '../../lib/format';
import { MainStackParamList } from '../../navigation/types';

/** The two game pills keep fixed brand faces so they stay loud in both themes. */
const PILL_AMBER = '#FFC24B';
const PILL_AMBER_DEEP = '#D98A05';
const PILL_PINK = '#F0357F';
const PILL_PINK_DEEP = '#B9155A';

/**
 * The lobby — what you land on after signing in. Deliberately has **no navbar**:
 * a profile strip, then two big pills, one per game. Choosing a pill pushes that
 * game's own space, which brings its own bar. The invite banner at the bottom
 * mirrors the referral push.
 */
export default function GamePickerScreen() {
  const colors = useColors();
  const isLight = useIsLight();
  const styles = useMemo(() => createStyles(colors, isLight), [colors, isLight]);
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const user = useAuthStore((s) => s.user);
  const balance = useWalletStore((s) => s.balance);
  const refreshWallet = useWalletStore((s) => s.refresh);
  const cards = useCardsStore((s) => s.cards);
  const bankroll = useCardsStore((s) => s.bankroll);
  const ensureSeeded = useCardsStore((s) => s.ensureSeeded);
  const settleDue = useCardsStore((s) => s.settleDue);

  useFocusEffect(
    useCallback(() => {
      refreshWallet().catch(() => {});
      ensureSeeded();
      settleDue();
    }, [ensureSeeded, settleDue, refreshWallet])
  );

  const playable = openCards(cards).length;
  const cardStats = computeCardStats(cards);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View style={styles.wordmark}>
            <AppIcon name="stock" size={26} />
            <Text style={styles.wordmarkText}>CrowdStock</Text>
          </View>
          <Pressable
            style={styles.topBtn}
            onPress={() => navigation.navigate('News')}
            accessibilityLabel="News and alerts"
          >
            <AppIcon name="bell-outline" size={19} color={colors.onPrimary} />
          </Pressable>
        </View>

        {/* ── profile strip ──────────────────────────────────────────────── */}
        <View style={styles.infoCard}>
          <InfoColumn
            art="wallet"
            label="Wallet Balance"
            value={formatMoney(balance)}
            styles={styles}
            first
          />
          <View style={styles.infoDivider} />
          <InfoColumn
            art="person"
            label="Name"
            value={user?.name?.split(' ')[0] ?? 'Player'}
            styles={styles}
          />
          <View style={styles.infoDivider} />
          <InfoColumn art="phone" label="Phone" value={user?.phone ?? '—'} styles={styles} small />
        </View>

        <Text style={styles.prompt}>Pick a game and play</Text>

        {/* ── game 1 ─────────────────────────────────────────────────────── */}
        <GamePill
          art="crowd"
          title="Stock Rounds"
          subtitle="Play the hourly crowd pick"
          meta={`${ROUND_SLOTS.length} rounds a day`}
          face={PILL_AMBER}
          deep={PILL_AMBER_DEEP}
          textColor={lightColors.ink}
          metaColor="rgba(42,27,18,0.62)"
          styles={styles}
          onPress={() => navigation.navigate('RoundsGame')}
          accessibilityLabel="Play Stock Rounds"
        />

        {/* ── game 2 ─────────────────────────────────────────────────────── */}
        <GamePill
          art="cash"
          title="CrowdStock Cards"
          subtitle="Draft a card, instantly"
          meta={
            bankroll == null
              ? `${playable} open`
              : `${formatMoney(bankroll)} on the table · ${playable} open`
          }
          face={PILL_PINK}
          deep={PILL_PINK_DEEP}
          textColor="#FFFFFF"
          metaColor="rgba(255,255,255,0.82)"
          styles={styles}
          onPress={() => navigation.navigate('CardsGame')}
          accessibilityLabel="Play CrowdStock Cards"
        />

        {/* ── invite ─────────────────────────────────────────────────────── */}
        <Pressable
          style={({ pressed }) => [styles.invite, pressed && { opacity: 0.85 }]}
          onPress={() => navigation.navigate('Invite')}
          accessibilityLabel="Invite contacts and earn points"
        >
          <View style={styles.inviteArt}>
            <Illustration name="invite" size={132} />
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
            <AppIcon name="chevron-right" size={20} color={PILL_AMBER} />
          </View>
        </Pressable>

        <View style={styles.spacer} />
        <Text style={styles.footnote}>Predict · Play · Win</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoColumn({
  art,
  label,
  value,
  styles,
  first,
  small,
}: {
  art: IllustrationName;
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
  first?: boolean;
  small?: boolean;
}) {
  return (
    <View style={styles.infoColumn}>
      <Illustration name={art} size={52} />
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
    </View>
  );
}

function GamePill({
  art,
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
  art: IllustrationName;
  title: string;
  subtitle: string;
  meta: string;
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
          <Illustration name={art} size={88} />
        </View>
        <View style={styles.pillText}>
          <Text style={[styles.pillTitle, { color: textColor }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.pillSubtitle, { color: textColor }]} numberOfLines={2}>
            {subtitle}
          </Text>
          <Text style={[styles.pillMeta, { color: metaColor }]} numberOfLines={1}>
            {meta}
          </Text>
        </View>
        <View style={[styles.pillChevron, { backgroundColor: deep }]}>
          <AppIcon name="chevron-right" size={22} color="#FFFFFF" />
        </View>
      </Pressable>
    </View>
  );
}

function createStyles(colors: Colors, isLight: boolean) {
  const pageBg = isLight ? colors.primary : '#1B1145';
  const softWhite = isLight ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.12)';
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: pageBg },
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
    wordmarkText: { ...typography.h2, color: colors.onPrimary, letterSpacing: -0.4 },
    topBtn: {
      width: 42,
      height: 42,
      borderRadius: 16,
      backgroundColor: softWhite,
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
      color: colors.onPrimary,
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
    inviteTitle: { ...typography.h2, color: colors.onPrimary },
    inviteHighlight: { ...typography.h2, color: PILL_AMBER, marginTop: -2 },
    inviteMeta: { ...typography.tiny, color: 'rgba(255,255,255,0.72)', marginTop: 6, fontWeight: '700' },
    inviteChevron: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: softWhite,
      alignItems: 'center',
      justifyContent: 'center',
    },

    footnote: {
      ...typography.label,
      color: 'rgba(255,255,255,0.6)',
      textAlign: 'center',
      marginTop: spacing.lg,
    },
  });
}

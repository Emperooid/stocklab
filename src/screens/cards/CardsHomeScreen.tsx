import { useCallback, useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { CardPanel } from '../../components/cards/CardPanel';
import { Screen } from '../../components/Screen';
import { PlayingCard } from '../../components/cards/PlayingCard';
import { Colors, radius, useColors, glow } from '../../theme/theme';
import { CardsTabParamList, MainStackParamList } from '../../navigation/types';
import { formatMoney, formatSigned, formatPercent } from '../../lib/format';
import { useWalletStore } from '../../store/walletStore';
import {
  useCardsStore,
  openCards,
  myOpenCards,
  settledCards,
  iWon,
  computeCardStats,
  payoutFor,
} from '../../store/cardsStore';
import type { GameCard } from '../../store/cardsStore';

type IconName = keyof typeof Ionicons.glyphMap;

const HOME_CARD_SIZE = 92;
const RESULT_CARD_SIZE = 44;
const MAX_OPEN_PREVIEW = 3;
const MAX_RESULT_PREVIEW = 3;

/** "just now" / "12m ago" / "3h ago" / "2d ago" — plain, locale-free, never throws. */
function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'just now';
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function firstFigure(card: GameCard): number | null {
  if (typeof card.originatorFigure === 'number') return card.originatorFigure;
  return typeof card.answeredFigure === 'number' ? card.answeredFigure : null;
}

function secondFigure(card: GameCard): number | null {
  return typeof card.answeredFigure === 'number' ? card.answeredFigure : null;
}

export default function CardsHomeScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tabNavigation = useNavigation<BottomTabNavigationProp<CardsTabParamList>>();
  const stackNavigation = tabNavigation.getParent<NativeStackNavigationProp<MainStackParamList>>();

  const cards = useCardsStore((s) => s.cards);
  const bankroll = useCardsStore((s) => s.bankroll);
  const ensureSeeded = useCardsStore((s) => s.ensureSeeded);
  const settleDue = useCardsStore((s) => s.settleDue);
  const walletBalance = useWalletStore((s) => s.balance);

  useFocusEffect(
    useCallback(() => {
      ensureSeeded();
      settleDue();
    }, [ensureSeeded, settleDue])
  );

  const playable = useMemo(() => openCards(cards), [cards]);
  const waiting = useMemo(() => myOpenCards(cards), [cards]);
  const stats = useMemo(() => computeCardStats(cards), [cards]);

  /** Most recent first — ISO strings sort lexicographically. */
  const recent = useMemo(
    () => [...settledCards(cards)].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, MAX_RESULT_PREVIEW),
    [cards]
  );

  const openPreview = playable.slice(0, MAX_OPEN_PREVIEW);
  const waitingStake = waiting.reduce((sum, c) => sum + c.amount, 0);

  return (
    <Screen>
      {/* 1 ── identity + way out to the game picker */}
      <View style={styles.identity}>
        <Ionicons name="albums" size={64} color={colors.primary} />
        <View style={styles.identityText}>
          <Text style={styles.brand}>CROWDSTOCK CARDS</Text>
          <Text style={styles.tagline} numberOfLines={2}>
            Hide a figure. Match it. Win the pot.
          </Text>
        </View>
        <Pressable
          onPress={() => stackNavigation?.navigate('GamePicker')}
          accessibilityRole="button"
          accessibilityLabel="Switch game"
          hitSlop={8}
          style={({ pressed }) => [styles.switchBtn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="albums-outline" size={19} color={colors.primary} />
        </Pressable>
      </View>

      {/* 2 ── balance hero */}
      <CardPanel tone="deep" style={[styles.hero, glow(colors.primary)]}>
        <View style={styles.heroRow}>
          <View style={styles.heroCoin}>
            <Ionicons name="cash" size={26} color={colors.primary} />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.heroLabel}>CARD BALANCE</Text>
            <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>
              {bankroll == null ? '—' : formatMoney(bankroll)}
            </Text>
          </View>
        </View>
        <View style={styles.heroFooter}>
          <Text style={styles.heroHint} numberOfLines={1}>
            {stats.played > 0
              ? `${stats.wins}W · ${stats.losses}L · ${formatPercent(stats.winRate)} win rate`
              : 'Win your first pot to start a streak.'}
          </Text>
          <Text style={styles.heroMinor} numberOfLines={1}>
            Wallet {formatMoney(walletBalance)}
          </Text>
        </View>
      </CardPanel>

      {/* 2b ── promo banner */}
      <Pressable
        onPress={() => tabNavigation.navigate('Play')}
        accessibilityLabel="Hide a Number: pick a number between 1 and 5, then make your guess"
        style={({ pressed }) => [styles.bannerWrap, pressed && { opacity: 0.9 }]}
      >
        <View style={styles.bannerClip}>
          <Image
            source={require('../../../assets/banner-hide-a-number.jpg')}
            style={styles.banner}
            resizeMode="cover"
          />
        </View>
      </Pressable>

      {/* 3 ── quick actions */}
      <Text style={styles.blockLabel}>QUICK ACTIONS</Text>
      <QuickTile
        icon="add"
        label="Create a card"
        hint="Select an amount and choose a figure to hide between 1 and 5"
        onPress={() => stackNavigation?.navigate('SetCard')}
      />
      <View style={styles.orRow}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>OR</Text>
        <View style={styles.orLine} />
      </View>
      <QuickTile
        icon="flame"
        label="Unveil a card"
        hint="Guess the hidden figure between 1 and 5"
        primary
        onPress={() => tabNavigation.navigate('Play')}
      />

      {/* 4 ── open cards */}
      <CardPanel
        tone="deep"
        eyebrow="Cashout Instantly"
        title="Many Cards to Unveil"
        style={styles.section}
      >
        <Pressable onPress={() => tabNavigation.navigate('Play')} accessibilityRole="button" accessibilityLabel="See all open cards" hitSlop={8}>
          <Text style={styles.link}>See all</Text>
        </Pressable>

        {openPreview.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="file-tray-outline" size={96} color={colors.textDim} />
            <Text style={styles.emptyText}>No open cards right now. Create one and let someone answer it.</Text>
          </View>
        ) : (
          <View style={styles.cardRow}>
            {openPreview.map((c) => (
              <View key={c.id} style={styles.cardItem}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {c.originatorName}
                </Text>
                <PlayingCard
                  amount={c.amount}
                  size={HOME_CARD_SIZE}
                  onPress={() => stackNavigation?.navigate('UnveilCard', { cardId: c.id })}
                />
                <Text style={styles.cardMeta} numberOfLines={1}>
                  {timeAgo(c.createdAt)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </CardPanel>

      {/* 5 ── your cards waiting for an answer */}
      <CardPanel tone="deep" title="Your cards waiting for an answer" style={styles.section}>
        {waiting.length === 0 ? (
          <View style={styles.waitingEmpty}>
            <Ionicons name="albums" size={22} color={colors.primary} />
            <Text style={styles.waitingText}>Nothing waiting right now — your open cards show up here.</Text>
          </View>
        ) : (
          <View style={styles.waitingRow}>
            <View style={styles.waitingBadge}>
              <Text style={styles.waitingCount}>{waiting.length}</Text>
            </View>
            <View style={styles.waitingBody}>
              <Text style={styles.waitingTitle} numberOfLines={1}>
                {waiting.length === 1 ? '1 card is waiting' : `${waiting.length} cards are waiting`}
              </Text>
              <Text style={styles.waitingText} numberOfLines={1}>
                {formatMoney(waitingStake)} at stake — we&apos;ll settle them automatically.
              </Text>
            </View>
          </View>
        )}
      </CardPanel>

      {/* 6 ── recent results */}
      <CardPanel tone="deep" eyebrow="LATEST" title="Recent results" style={styles.section}>
        <Pressable onPress={() => tabNavigation.navigate('Rewards')} accessibilityRole="button" accessibilityLabel="View all results" hitSlop={8}>
          <Text style={styles.link}>View all</Text>
        </Pressable>

        {recent.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="file-tray-outline" size={96} color={colors.textDim} />
            <Text style={styles.emptyText}>No settled cards yet. Your wins and losses land here.</Text>
          </View>
        ) : (
          <View style={styles.resultList}>
            {recent.map((c, i) => {
              const won = iWon(c);
              const signed = won ? formatSigned(c.payout ?? payoutFor(c.amount)) : formatSigned(-c.amount);
              const mine = firstFigure(c);
              const theirs = secondFigure(c);
              const versus = theirs == null ? `${mine ?? '—'} vs —` : `${mine ?? '—'} vs ${theirs}`;
              return (
                <View key={c.id} style={[styles.resultRow, i > 0 && styles.resultDivider]}>
                  <PlayingCard amount={c.amount} size={RESULT_CARD_SIZE} revealed figure={mine ?? undefined} />
                  <View style={styles.resultBody}>
                    <Text style={styles.resultTitle} numberOfLines={1}>
                      {c.mine ? 'Your card' : c.originatorName}
                    </Text>
                    <Text style={styles.resultMeta} numberOfLines={1}>
                      {versus} · {formatMoney(c.amount)}
                    </Text>
                  </View>
                  <Text style={[styles.resultAmount, { color: won ? colors.success : colors.danger }]} numberOfLines={1}>
                    {signed}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </CardPanel>

      {/* 7 ── rules reminder */}
      <CardPanel tone="gold" style={styles.section}>
        <View style={styles.rules}>
          <Ionicons name="bulb" size={20} color={colors.primary} />
          <Text style={styles.rulesText}>
            Match the originator&apos;s figure to win 80% of the pot.
          </Text>
        </View>
      </CardPanel>
    </Screen>
  );
}

/* ── pieces ────────────────────────────────────────────────────────────────── */

interface QuickTileProps {
  icon: IconName;
  label: string;
  hint: string;
  onPress: () => void;
  /** The full-width, call-to-action variant. */
  primary?: boolean;
}

function QuickTile({ icon, label, hint, onPress, primary = false }: QuickTileProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.quick,
        primary ? styles.quickPrimary : styles.quickFull,
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={[styles.quickIcon, primary && styles.quickIconPrimary]}>
        <Ionicons name={icon} size={primary ? 22 : 18} color={primary ? colors.ink : colors.primary} />
      </View>
      <View style={styles.quickText}>
        <Text style={[styles.quickLabel, primary && styles.quickLabelPrimary]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.quickHint, primary && styles.quickHintPrimary]}>{hint}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={primary ? colors.ink : colors.textDim} />
    </Pressable>
  );
}

/* ── styles ────────────────────────────────────────────────────────────────── */

function createStyles(colors: Colors) {
  return StyleSheet.create({
    /* identity */
    identity: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    identityText: { flex: 1, minWidth: 0 },
    brand: { color: colors.text, fontSize: 20, fontWeight: '900', letterSpacing: 0.2 },
    tagline: { color: colors.textMuted, fontSize: 12.5, fontWeight: '700', marginTop: 3 },
    switchBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },

    /* balance hero */
    hero: { borderRadius: radius.xl, padding: 18 },
    heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    heroCoin: {
      width: 56,
      height: 56,
      borderRadius: radius.sm + 6,
      backgroundColor: colors.primaryTint,
      borderWidth: 1.5,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroText: { flex: 1, minWidth: 0 },
    heroLabel: { color: colors.textDim, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.1 },
    heroValue: { color: colors.primary, fontSize: 38, fontWeight: '900', marginTop: 2 },
    heroFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginTop: 14,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.borderLight,
    },
    heroHint: { color: colors.textMuted, fontSize: 12, fontWeight: '800', flexShrink: 1 },
    heroMinor: { color: colors.textDim, fontSize: 11.5, fontWeight: '700' },
    bannerWrap: { marginTop: 16 },
    // Same treatment as the Home banner: the radius lives on a clipping wrapper
    // (borderRadius + overflow directly on a raster <Image> is unreliable), and
    // the ratio matches the artwork so nothing is cropped. radius.xl is what
    // CardPanel uses, so the corners line up with the balance panel above.
    bannerClip: {
      width: '100%',
      aspectRatio: 1.5071,
      borderRadius: radius.xl,
      overflow: 'hidden',
    },
    banner: { width: '100%', height: '100%' },

    /* quick actions */
    blockLabel: { color: colors.textDim, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.1, marginTop: 20, marginBottom: 10 },
    quickRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
    quick: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: radius.xl,
      backgroundColor: colors.surfaceAlt,
      paddingVertical: 10,
      paddingHorizontal: 12,
      minHeight: 68,
    },
    quickPrimary: { backgroundColor: colors.primary, borderColor: colors.primaryDark, ...glow(colors.primary) },
    quickFull: { minWidth: 0 },
    // Breathing room on BOTH sides of the divider — it only had marginTop, so
    // the second tile sat flush against it.
    orRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 18 },
    orLine: { flex: 1, height: 1, backgroundColor: colors.border },
    orText: { color: colors.textMuted, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
    quickIcon: {
      width: 38,
      height: 38,
      borderRadius: radius.sm,
      backgroundColor: colors.primaryTint,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickIconPrimary: { backgroundColor: 'rgba(0,0,0,0.16)' },
    quickText: { flex: 1, minWidth: 0 },
    quickLabel: { color: colors.text, fontSize: 15, fontWeight: '900' },
    quickLabelPrimary: { color: colors.ink },
    quickHint: { color: colors.textDim, fontSize: 11.5, fontWeight: '700', marginTop: 2 },
    quickHintPrimary: { color: 'rgba(0,0,0,0.6)' },

    /* sections */
    section: { marginTop: 16 },
    link: { color: colors.blue, fontSize: 12.5, fontWeight: '900' },

    /* open cards row */
    cardRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    cardItem: { flex: 1, minWidth: 0, alignItems: 'center' },
    cardName: { color: colors.textMuted, fontSize: 11.5, fontWeight: '800', marginBottom: 6, maxWidth: '100%' },
    cardMeta: { color: colors.textDim, fontSize: 10.5, fontWeight: '700', marginTop: 6 },

    /* waiting strip */
    waitingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
    waitingBadge: {
      width: 46,
      height: 46,
      borderRadius: radius.sm + 2,
      backgroundColor: colors.primaryTint,
      borderWidth: 1.5,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    waitingCount: { color: colors.primary, fontSize: 22, fontWeight: '900' },
    waitingBody: { flex: 1, minWidth: 0 },
    waitingTitle: { color: colors.text, fontSize: 14.5, fontWeight: '900' },
    waitingText: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginTop: 3, flexShrink: 1 },
    waitingEmpty: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },

    /* results */
    resultList: { marginTop: 8 },
    resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
    resultDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderLight },
    resultBody: { flex: 1, minWidth: 0 },
    resultTitle: { color: colors.text, fontSize: 13.5, fontWeight: '900' },
    resultMeta: { color: colors.textMuted, fontSize: 11.5, fontWeight: '700', marginTop: 3 },
    resultAmount: { fontSize: 15, fontWeight: '900' },

    /* empty states */
    empty: { alignItems: 'center', paddingVertical: 8, gap: 8 },
    emptyText: { color: colors.textMuted, fontSize: 12.5, fontWeight: '700', textAlign: 'center', maxWidth: 280 },

    /* rules */
    rules: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    rulesText: { color: colors.text, fontSize: 13, fontWeight: '800', flex: 1 },
  });
}

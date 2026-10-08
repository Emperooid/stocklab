import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppIcon, Illustration } from '../../components/AppIcon';
import { CardPanel } from '../../components/cards/CardPanel';
import { CardTableScreen } from '../../components/cards/CardTableScreen';
import { PlayingCard } from '../../components/cards/PlayingCard';
import { cardGame, cardRadius, goldGlow } from '../../theme/cardsTheme';
import { IconName } from '../../theme/icons';
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
    <CardTableScreen>
      {/* 1 ── identity + way out to the game picker */}
      <View style={styles.identity}>
        <Illustration name="cards" size={64} />
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
          <AppIcon name="cards-outline" size={19} color={cardGame.gold} />
        </Pressable>
      </View>

      {/* 2 ── balance hero */}
      <CardPanel tone="deep" style={[styles.hero, goldGlow(0.24)]}>
        <View style={styles.heroRow}>
          <View style={styles.heroCoin}>
            <AppIcon name="pot" size={26} color={cardGame.gold} />
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

      {/* 3 ── quick actions */}
      <Text style={styles.blockLabel}>QUICK ACTIONS</Text>
      <QuickTile
        icon="flame"
        label="Play now"
        hint={`${playable.length} card${playable.length === 1 ? '' : 's'} open`}
        primary
        onPress={() => tabNavigation.navigate('Play')}
      />
      <View style={styles.quickRow}>
        <QuickTile icon="plus" label="Create card" hint="Hide a figure" onPress={() => stackNavigation?.navigate('SetCard')} />
        <QuickTile icon="card" label="My cards" hint="See your cards" onPress={() => tabNavigation.navigate('MyCards')} />
      </View>

      {/* 4 ── open cards */}
      <CardPanel
        tone="deep"
        eyebrow="UP FOR GRABS"
        title="Open cards"
        style={styles.section}
      >
        <Pressable onPress={() => tabNavigation.navigate('Play')} accessibilityRole="button" accessibilityLabel="See all open cards" hitSlop={8}>
          <Text style={styles.link}>See all</Text>
        </Pressable>

        {openPreview.length === 0 ? (
          <View style={styles.empty}>
            <Illustration name="empty" size={96} />
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
            <AppIcon name="card" size={22} color={cardGame.gold} />
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
            <Illustration name="empty" size={96} />
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
                  <Text style={[styles.resultAmount, { color: won ? cardGame.success : cardGame.danger }]} numberOfLines={1}>
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
          <AppIcon name="bulb" size={20} color={cardGame.gold} />
          <Text style={styles.rulesText}>
            Match the originator&apos;s figure to win 80% of the pot.
          </Text>
        </View>
      </CardPanel>
    </CardTableScreen>
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
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.quick,
        primary ? styles.quickPrimary : styles.quickHalf,
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
      ]}
    >
      <View style={[styles.quickIcon, primary && styles.quickIconPrimary]}>
        <AppIcon name={icon} size={primary ? 22 : 18} color={primary ? cardGame.ink : cardGame.gold} />
      </View>
      <View style={styles.quickText}>
        <Text style={[styles.quickLabel, primary && styles.quickLabelPrimary]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={[styles.quickHint, primary && styles.quickHintPrimary]} numberOfLines={1}>
          {hint}
        </Text>
      </View>
      <AppIcon name="chevron-right" size={18} color={primary ? cardGame.ink : cardGame.textDim} />
    </Pressable>
  );
}

/* ── styles ────────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  /* identity */
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  identityText: { flex: 1, minWidth: 0 },
  brand: { color: cardGame.text, fontSize: 20, fontWeight: '900', letterSpacing: 0.2 },
  tagline: { color: cardGame.textMuted, fontSize: 12.5, fontWeight: '700', marginTop: 3 },
  switchBtn: {
    width: 44,
    height: 44,
    borderRadius: cardRadius.pill,
    borderWidth: 1.5,
    borderColor: cardGame.rim,
    backgroundColor: cardGame.table,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* balance hero */
  hero: { borderRadius: cardRadius.panel, padding: 18 },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heroCoin: {
    width: 56,
    height: 56,
    borderRadius: cardRadius.chip + 6,
    backgroundColor: 'rgba(247,183,51,0.16)',
    borderWidth: 1.5,
    borderColor: 'rgba(247,183,51,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroText: { flex: 1, minWidth: 0 },
  heroLabel: { color: cardGame.textDim, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.1 },
  heroValue: { color: cardGame.gold, fontSize: 38, fontWeight: '900', marginTop: 2 },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cardGame.rimSoft,
  },
  heroHint: { color: cardGame.textMuted, fontSize: 12, fontWeight: '800', flexShrink: 1 },
  heroMinor: { color: cardGame.textDim, fontSize: 11.5, fontWeight: '700' },

  /* quick actions */
  blockLabel: { color: cardGame.textDim, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.1, marginTop: 20, marginBottom: 10 },
  quickRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  quick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(247,183,51,0.42)',
    borderRadius: cardRadius.panel,
    backgroundColor: cardGame.tableDeep,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 68,
  },
  quickPrimary: { backgroundColor: cardGame.gold, borderColor: cardGame.goldDeep, ...goldGlow(0.3) },
  quickHalf: { flex: 1, minWidth: 0 },
  quickIcon: {
    width: 38,
    height: 38,
    borderRadius: cardRadius.chip,
    backgroundColor: 'rgba(247,183,51,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickIconPrimary: { backgroundColor: 'rgba(21,14,54,0.16)' },
  quickText: { flex: 1, minWidth: 0 },
  quickLabel: { color: cardGame.text, fontSize: 15, fontWeight: '900' },
  quickLabelPrimary: { color: cardGame.ink },
  quickHint: { color: cardGame.textDim, fontSize: 11.5, fontWeight: '700', marginTop: 2 },
  quickHintPrimary: { color: 'rgba(21,14,54,0.72)' },

  /* sections */
  section: { marginTop: 16 },
  link: { color: cardGame.cyan, fontSize: 12.5, fontWeight: '900' },

  /* open cards row */
  cardRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  cardItem: { flex: 1, minWidth: 0, alignItems: 'center' },
  cardName: { color: cardGame.textMuted, fontSize: 11.5, fontWeight: '800', marginBottom: 6, maxWidth: '100%' },
  cardMeta: { color: cardGame.textDim, fontSize: 10.5, fontWeight: '700', marginTop: 6 },

  /* waiting strip */
  waitingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  waitingBadge: {
    width: 46,
    height: 46,
    borderRadius: cardRadius.chip + 2,
    backgroundColor: 'rgba(247,183,51,0.16)',
    borderWidth: 1.5,
    borderColor: 'rgba(247,183,51,0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  waitingCount: { color: cardGame.gold, fontSize: 22, fontWeight: '900' },
  waitingBody: { flex: 1, minWidth: 0 },
  waitingTitle: { color: cardGame.text, fontSize: 14.5, fontWeight: '900' },
  waitingText: { color: cardGame.textMuted, fontSize: 12, fontWeight: '700', marginTop: 3, flexShrink: 1 },
  waitingEmpty: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },

  /* results */
  resultList: { marginTop: 8 },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  resultDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: cardGame.rimSoft },
  resultBody: { flex: 1, minWidth: 0 },
  resultTitle: { color: cardGame.text, fontSize: 13.5, fontWeight: '900' },
  resultMeta: { color: cardGame.textMuted, fontSize: 11.5, fontWeight: '700', marginTop: 3 },
  resultAmount: { fontSize: 15, fontWeight: '900' },

  /* empty states */
  empty: { alignItems: 'center', paddingVertical: 8, gap: 8 },
  emptyText: { color: cardGame.textMuted, fontSize: 12.5, fontWeight: '700', textAlign: 'center', maxWidth: 280 },

  /* rules */
  rules: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rulesText: { color: cardGame.text, fontSize: 13, fontWeight: '800', flex: 1 },
});

import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { CardButton } from '../../components/cards/CardButton';
import { CardPanel } from '../../components/cards/CardPanel';
import { Screen } from '../../components/Screen';
import { PlayingCard } from '../../components/cards/PlayingCard';
import { Colors, radius, useColors } from '../../theme/theme';
import {
  computeCardStats,
  iWon,
  payoutFor,
  potFor,
  settledCards,
  useCardsStore,
} from '../../store/cardsStore';
import { formatMoney, formatPercent, formatSigned } from '../../lib/format';
import { CardsTabParamList } from '../../navigation/types';

type ResultFilter = 'all' | 'wins' | 'losses';

const FILTERS: ReadonlyArray<{ key: ResultFilter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'wins', label: 'Wins' },
  { key: 'losses', label: 'Losses' },
];

/** "2026-10-05T15:24:00.000Z" -> "Oct 5 · 3:24 PM" */
function formatResultDate(iso: string): string {
  const date = new Date(iso);
  const day = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const time = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}

interface MetricTileProps {
  label: string;
  value: string;
  color?: string;
}

function MetricTile({ label, value, color }: MetricTileProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.metricTile}>
      <Text
        style={[styles.metricValue, color != null && { color }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

/**
 * Rewards — the "Result" page of the card duel: the signed-in player's winnings
 * summary on top, then the full settled history, newest first, filterable to
 * just the wins or just the losses.
 */
export default function RewardsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tabNavigation = useNavigation<BottomTabNavigationProp<CardsTabParamList>>();

  const cards = useCardsStore((s) => s.cards);
  const ensureSeeded = useCardsStore((s) => s.ensureSeeded);
  const settleDue = useCardsStore((s) => s.settleDue);
  const refreshFromServer = useCardsStore((s) => s.refreshFromServer);

  const [filter, setFilter] = useState<ResultFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      ensureSeeded();
      settleDue();
    }, [ensureSeeded, settleDue])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    refreshFromServer().then(
      () => setRefreshing(false),
      () => setRefreshing(false)
    );
  }, [refreshFromServer]);

  const stats = useMemo(() => computeCardStats(cards), [cards]);

  const results = useMemo(() => {
    const settled = settledCards(cards);
    return [...settled].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [cards]);

  const visible = useMemo(() => {
    if (filter === 'wins') return results.filter(iWon);
    if (filter === 'losses') return results.filter((card) => !iWon(card));
    return results;
  }, [filter, results]);

  const counts: Record<ResultFilter, number> = {
    all: stats.played,
    wins: stats.wins,
    losses: stats.losses,
  };

  const noGames = stats.played === 0;
  const netColor = stats.net >= 0 ? colors.success : colors.danger;

  const emptyCopy =
    filter === 'wins'
      ? { title: 'No wins yet', body: 'Match the hidden figure and your first win lands here.' }
      : filter === 'losses'
        ? { title: 'No losses yet', body: 'Every card played so far went your way. Nice run.' }
        : { title: 'No results yet', body: 'Play a card and the result is recorded here as soon as it is done.' };

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      {/* ── Winnings hero ─────────────────────────────────────────────── */}
      <CardPanel tone="gold" style={styles.hero}>
        <View style={styles.heroTop}>
          <View style={styles.heroBadge}>
            <Ionicons name="trophy" size={30} color={colors.primary} />
          </View>
          <View style={styles.heroHeadline}>
            <Text style={styles.heroEyebrow}>YOUR REWARDS</Text>
            <Text style={styles.heroTitle}>Total winnings</Text>
          </View>
        </View>

        <Text
          style={styles.heroAmount}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.55}
        >
          {formatMoney(stats.winnings)}
        </Text>

        <View style={styles.heroMetaRow}>
          <View style={styles.heroMetaChip}>
            <Ionicons name="trending-up" size={14} color={colors.success} />
            <Text style={styles.heroMetaText}>{formatPercent(stats.winRate)} win rate</Text>
          </View>
          <View style={styles.heroMetaChip}>
            <Ionicons name="albums" size={14} color={colors.primary} />
            <Text style={styles.heroMetaText}>
              {stats.played} {stats.played === 1 ? 'game' : 'games'} played
            </Text>
          </View>
        </View>
      </CardPanel>

      {/* ── Stat tiles ────────────────────────────────────────────────── */}
      <CardPanel tone="deep" style={styles.statsPanel}>
        <View style={styles.statsRow}>
          <MetricTile label="Played" value={String(stats.played)} />
          <MetricTile
            label="Wins"
            value={noGames ? '—' : String(stats.wins)}
            color={colors.success}
          />
          <MetricTile
            label="Losses"
            value={noGames ? '—' : String(stats.losses)}
            color={colors.danger}
          />
          <MetricTile
            label="Net"
            value={noGames ? '—' : formatSigned(stats.net)}
            color={netColor}
          />
        </View>
      </CardPanel>

      {/* ── Filter switcher ───────────────────────────────────────────── */}
      <View style={styles.filterRow}>
        {FILTERS.map((option) => {
          const active = filter === option.key;
          const count = counts[option.key];
          return (
            <Pressable
              key={option.key}
              onPress={() => setFilter(option.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${option.label}, ${count} results`}
              style={[styles.filterPill, active && styles.filterPillActive]}
            >
              <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                {option.label}
              </Text>
              <View style={[styles.filterCount, active && styles.filterCountActive]}>
                <Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>
                  {count}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* ── Results ───────────────────────────────────────────────────── */}
      {visible.length > 0 ? (
        <>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Your results</Text>
            <Text style={styles.sectionCount}>
              {visible.length} {visible.length === 1 ? 'card' : 'cards'}
            </Text>
          </View>

          {visible.map((card) => {
            const won = iWon(card);
            const pot = potFor(card.amount);
            const payout = card.payout ?? payoutFor(card.amount);
            return (
              <CardPanel key={card.id} tone={won ? 'gold' : 'deep'} style={styles.resultPanel}>
                <View style={styles.resultRow}>
                  <PlayingCard
                    amount={card.amount}
                    size={52}
                    revealed
                    figure={card.originatorFigure}
                  />

                  <View style={styles.resultBody}>
                    <View style={styles.resultHead}>
                      <Text style={styles.figuresLine} numberOfLines={1}>
                        Originator {card.originatorFigure}  ·  Answerer {card.answeredFigure ?? '—'}
                      </Text>
                      <View
                        style={[styles.outcomeChip, won ? styles.outcomeChipWin : styles.outcomeChipLoss]}
                      >
                        <Ionicons
                          name={won ? 'checkmark' : 'close'}
                          size={11}
                          color={won ? colors.success : colors.danger}
                        />
                        <Text
                          style={[styles.outcomeText, won ? styles.outcomeTextWin : styles.outcomeTextLoss]}
                          numberOfLines={1}
                        >
                          {won ? 'Won' : 'Lost'} {formatSigned(won ? card.payout ?? 0 : -card.amount)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.playersLine} numberOfLines={1}>
                      {card.originatorName} vs {card.answeredByName ?? 'Waiting'}
                    </Text>

                    <View style={styles.resultFoot}>
                      <Text style={styles.potLine} numberOfLines={1}>
                        Both entries {formatMoney(pot)}
                      </Text>
                      <Text style={styles.dateLine} numberOfLines={1}>
                        {formatResultDate(card.createdAt)}
                      </Text>
                    </View>
                  </View>
                </View>
              </CardPanel>
            );
          })}
        </>
      ) : (
        <CardPanel tone="deep" style={styles.emptyPanel}>
          <Ionicons name="file-tray-outline" size={130} color={colors.textDim} />
          <Text style={styles.emptyTitle}>{emptyCopy.title}</Text>
          <Text style={styles.emptyBody}>{emptyCopy.body}</Text>
          <CardButton
            title="Play a card"
            icon="albums"
            onPress={() => tabNavigation.navigate('Play')}
            style={styles.emptyButton}
          />
        </CardPanel>
      )}

      {/* ── Fine print ────────────────────────────────────────────────── */}
      <CardPanel tone="deep" style={styles.footnote}>
        <View style={styles.footnoteRow}>
          <Ionicons name="information-circle-outline" size={15} color={colors.blue} />
          <Text style={styles.footnoteText}>
            Match a card to win — every card is settled the moment it is answered.
          </Text>
        </View>
      </CardPanel>
    </Screen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    /* hero */
    hero: { marginBottom: 14 },
    heroTop: { flexDirection: 'row', alignItems: 'center' },
    heroBadge: {
      width: 46,
      height: 46,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.primary,
    },
    heroHeadline: { flex: 1, minWidth: 0, marginLeft: 12 },
    heroEyebrow: {
      color: colors.primary,
      fontSize: 10.5,
      fontWeight: '800',
      letterSpacing: 1.2,
    },
    heroTitle: { color: colors.text, fontSize: 17, fontWeight: '900', marginTop: 2 },
    heroAmount: {
      color: colors.primary,
      fontSize: 40,
      fontWeight: '900',
      letterSpacing: -0.5,
      marginTop: 12,
      includeFontPadding: false,
    },
    heroMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    heroMetaChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    heroMetaText: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },

    /* stat tiles */
    statsPanel: { marginBottom: 14 },
    statsRow: { flexDirection: 'row', gap: 6 },
    metricTile: {
      flex: 1,
      minWidth: 0,
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 4,
      borderRadius: radius.sm,
      backgroundColor: colors.surfaceAlt,
    },
    metricValue: { color: colors.text, fontSize: 16, fontWeight: '900' },
    metricLabel: {
      color: colors.textDim,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.6,
      marginTop: 4,
      textTransform: 'uppercase',
    },

    /* filter switcher */
    filterRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 14,
      padding: 5,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    filterPill: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 9,
      borderRadius: radius.pill,
    },
    filterPillActive: { backgroundColor: colors.primary },
    filterLabel: { color: colors.textMuted, fontSize: 13.5, fontWeight: '900' },
    filterLabelActive: { color: colors.ink },
    filterCount: {
      minWidth: 22,
      paddingHorizontal: 6,
      paddingVertical: 1,
      borderRadius: radius.pill,
      alignItems: 'center',
      backgroundColor: colors.primaryTint,
    },
    filterCountActive: { backgroundColor: 'rgba(0,0,0,0.18)' },
    filterCountText: { color: colors.primary, fontSize: 11, fontWeight: '900' },
    filterCountTextActive: { color: colors.ink },

    /* section header */
    sectionHead: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      marginBottom: 8,
      paddingHorizontal: 2,
    },
    sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '900' },
    sectionCount: { color: colors.textDim, fontSize: 11.5, fontWeight: '800' },

    /* result rows */
    resultPanel: { marginBottom: 10 },
    resultRow: { flexDirection: 'row', alignItems: 'flex-start' },
    resultBody: { flex: 1, minWidth: 0, marginLeft: 12 },
    resultHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    figuresLine: { flexShrink: 1, color: colors.text, fontSize: 13, fontWeight: '900' },
    outcomeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      flexShrink: 0,
      paddingVertical: 4,
      paddingHorizontal: 8,
      borderRadius: radius.pill,
      borderWidth: 1,
    },
    outcomeChipWin: {
      backgroundColor: colors.successTint,
      borderColor: colors.success,
    },
    outcomeChipLoss: {
      backgroundColor: colors.dangerTint,
      borderColor: colors.danger,
    },
    outcomeText: { fontSize: 11, fontWeight: '900' },
    outcomeTextWin: { color: colors.success },
    outcomeTextLoss: { color: colors.danger },
    playersLine: { color: colors.textMuted, fontSize: 12, fontWeight: '700', marginTop: 5 },
    resultFoot: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginTop: 6,
    },
    potLine: { flexShrink: 1, color: colors.primary, fontSize: 11.5, fontWeight: '800' },
    dateLine: { flexShrink: 0, color: colors.textDim, fontSize: 11, fontWeight: '700' },

    /* empty state */
    emptyPanel: { alignItems: 'center', paddingVertical: 24 },
    emptyTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 10 },
    emptyBody: {
      color: colors.textMuted,
      fontSize: 13,
      fontWeight: '600',
      textAlign: 'center',
      marginTop: 6,
      marginBottom: 18,
      paddingHorizontal: 8,
    },
    emptyButton: { alignSelf: 'stretch' },

    /* footnote */
    footnote: { marginTop: 4 },
    footnoteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    footnoteText: { flex: 1, color: colors.textMuted, fontSize: 11.5, fontWeight: '600', lineHeight: 16 },
  });
}

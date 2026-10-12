import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { CardPanel } from '../../components/cards/CardPanel';
import { CardButton } from '../../components/cards/CardButton';
import { PlayingCard } from '../../components/cards/PlayingCard';
import { Colors, radius, useColors, glow } from '../../theme/theme';
import { computeCardStats, iWon, myOpenCards, settledCards, useCardsStore } from '../../store/cardsStore';
import type { GameCard } from '../../store/cardsStore';
import { formatMoney, formatSigned } from '../../lib/format';
import { CardsTabParamList, MainStackParamList } from '../../navigation/types';

type TabKey = 'active' | 'completed';

/** "just now" · "2m ago" · "3h ago" · "5d ago" — for a card's createdAt. */
function timeAgo(iso: string): string {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Page 2 of the card duel — the player's own shelf. Everything they hid is
 * either still face down (Active, waiting on an answer) or already settled
 * (Completed, with the reveal, who answered and what it paid).
 */
export default function MyCardsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tabNavigation = useNavigation<BottomTabNavigationProp<CardsTabParamList>>();
  const stackNavigation = tabNavigation.getParent<NativeStackNavigationProp<MainStackParamList>>();

  const cards = useCardsStore((s) => s.cards);
  const ensureSeeded = useCardsStore((s) => s.ensureSeeded);
  const settleDue = useCardsStore((s) => s.settleDue);

  const [tab, setTab] = useState<TabKey>('active');

  useFocusEffect(
    useCallback(() => {
      ensureSeeded();
      settleDue();
    }, [ensureSeeded, settleDue])
  );

  const waiting = useMemo(() => myOpenCards(cards), [cards]);
  const settled = useMemo(
    () =>
      settledCards(cards)
        .filter((c) => c.mine === true)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [cards]
  );
  const stats = useMemo(() => computeCardStats(cards), [cards]);

  const createCard = useCallback(() => {
    stackNavigation?.navigate('SetCard');
  }, [stackNavigation]);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>YOUR TABLE</Text>
          <Text style={styles.title}>My Cards</Text>
        </View>
        <View style={styles.newCardWrap}>
          <CardButton
            title="New card"
            size="sm"
            variant="gold"
            icon="add"
            onPress={createCard}
            accessibilityLabel="Create a new card"
          />
        </View>
      </View>

      <Text style={styles.subtitle} numberOfLines={1}>
        Every number you've hidden — waiting or played.
      </Text>

      <View style={styles.segmented}>
        <Segment
          label="Active"
          count={waiting.length}
          selected={tab === 'active'}
          onPress={() => setTab('active')}
        />
        <Segment
          label="Completed"
          count={settled.length}
          selected={tab === 'completed'}
          onPress={() => setTab('completed')}
        />
      </View>

      {tab === 'active' ? (
        waiting.length === 0 ? (
          <CardPanel tone="deep" style={styles.empty}>
            {/* Placeholder for the removed bundled "empty" illustration. */}
            <Ionicons name="file-tray-outline" size={120} color={colors.textDim} />
            <Text style={styles.emptyTitle}>No cards waiting</Text>
            <Text style={styles.emptyBody}>
              You have nothing face down right now. Hide a number at your own price and let the table answer.
            </Text>
            <CardButton title="Create a card" icon="add" onPress={createCard} style={{ marginTop: 16 }} />
          </CardPanel>
        ) : (
          <>
            <View style={styles.list}>
              {waiting.map((card) => (
                <CardPanel key={card.id} tone="table" style={styles.cardRow}>
                  <PlayingCard amount={card.amount} size={56} picked={card.originatorFigure} />
                  <View style={styles.cardInfo}>
                    <View style={styles.titleRow}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        You hid a figure
                      </Text>
                      <View style={styles.timeChip}>
                        <Text style={styles.timeChipText} numberOfLines={1}>
                          {timeAgo(card.createdAt)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.waitRow}>
                      <Ionicons name="time-outline" size={13} color={colors.textDim} />
                      <Text style={styles.cardMeta} numberOfLines={1}>
                        Waiting for an answer
                      </Text>
                    </View>
                    <View style={styles.stakeRow}>
                      <Ionicons name="cash-outline" size={14} color={colors.primary} />
                      <Text style={styles.stakeText} numberOfLines={1}>
                        Stake {formatMoney(card.amount)}
                      </Text>
                    </View>
                  </View>
                </CardPanel>
              ))}
            </View>

            <CardPanel tone="deep" style={styles.note}>
              <View style={styles.noteRow}>
                <Ionicons name="eye-off-outline" size={16} color={colors.primary} />
                <Text style={styles.noteText}>
                  Your figure stays face down until somebody answers — only the stake is on show.
                </Text>
              </View>
            </CardPanel>
          </>
        )
      ) : (
        <>
          <CardPanel tone="gold" style={styles.summary}>
            <View style={styles.summaryRow}>
              <Stat label="Played" value={String(stats.played)} />
              <View style={styles.summaryDivider} />
              <Stat label="Won" value={String(stats.wins)} />
              <View style={styles.summaryDivider} />
              <Stat label="Win rate" value={`${stats.winRate}%`} />
            </View>
          </CardPanel>

          {settled.length === 0 ? (
            <CardPanel tone="deep" style={styles.empty}>
              {/* Placeholder for the removed bundled "empty" illustration. */}
              <Ionicons name="file-tray-outline" size={120} color={colors.textDim} />
              <Text style={styles.emptyTitle}>Nothing played yet</Text>
              <Text style={styles.emptyBody}>
                Once someone plays one of your cards, the answer lands here with the numbers and what it paid.
              </Text>
              <CardButton
                title="Create a card"
                icon="add"
                variant="outline"
                onPress={createCard}
                style={{ marginTop: 16 }}
              />
            </CardPanel>
          ) : (
            <View style={styles.list}>
              {settled.map((card) => (
                <SettledRow key={card.id} card={card} />
              ))}
            </View>
          )}
        </>
      )}
    </Screen>
  );
}

/** One row of the Completed list — the cream face-up card plus its result. */
function SettledRow({ card }: { card: GameCard }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const won = iWon(card);
  return (
    <CardPanel tone="table" style={styles.cardRow}>
      <PlayingCard amount={card.amount} size={56} revealed figure={card.originatorFigure} />
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {`You ${card.originatorFigure} · Them ${card.answeredFigure ?? '—'}`}
        </Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          Answered by {card.answeredByName ?? 'a player'}
        </Text>
        <View style={styles.outcomeRow}>
          <Text style={styles.dateText} numberOfLines={1}>
            {shortDate(card.createdAt)}
          </Text>
          <View style={[styles.outcomeChip, won ? styles.outcomeWin : styles.outcomeLose]}>
            <Ionicons
              name={won ? 'trophy' : 'trending-down'}
              size={12}
              color={won ? colors.success : colors.danger}
            />
            <Text
              style={[styles.outcomeText, { color: won ? colors.success : colors.danger }]}
              numberOfLines={1}
            >
              {won ? `Won ${formatSigned(card.payout ?? 0)}` : `Lost ${formatSigned(-card.amount)}`}
            </Text>
          </View>
        </View>
      </View>
    </CardPanel>
  );
}

/** One half of the felt segmented switcher. */
function Segment({
  label,
  count,
  selected,
  onPress,
}: {
  label: string;
  count: number;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}, ${count}`}
      style={[styles.segment, selected && styles.segmentOn]}
    >
      <Text style={[styles.segmentText, selected && styles.segmentTextOn]} numberOfLines={1}>
        {`${label} (${count})`}
      </Text>
    </Pressable>
  );
}

/** A single gold numeral in the Completed summary strip. */
function Stat({ label, value }: { label: string; value: string }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    headerCopy: { flex: 1, minWidth: 0 },
    newCardWrap: { width: 132 },
    eyebrow: { color: colors.textDim, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.1 },
    title: { color: colors.text, fontSize: 26, fontWeight: '900', marginTop: 1 },
    subtitle: { color: colors.textMuted, fontSize: 13.5, lineHeight: 20, marginTop: 10 },

    segmented: {
      flexDirection: 'row',
      gap: 6,
      marginTop: 16,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.pill,
      padding: 5,
    },
    segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: radius.pill },
    segmentOn: { backgroundColor: colors.primary, ...glow(colors.primary) },
    segmentText: { color: colors.textMuted, fontSize: 13, fontWeight: '900' },
    segmentTextOn: { color: colors.ink },

    summary: { marginTop: 14 },
    summaryRow: { flexDirection: 'row', alignItems: 'center' },
    summaryDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: 'rgba(247,183,51,0.42)' },
    stat: { flex: 1, alignItems: 'center' },
    statValue: { color: colors.primary, fontSize: 22, fontWeight: '900' },
    statLabel: { color: colors.textDim, fontSize: 10.5, fontWeight: '800', marginTop: 2 },

    list: { gap: 12, marginTop: 16 },
    cardRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
    cardInfo: { flex: 1, minWidth: 0 },
    titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    cardTitle: { color: colors.text, fontSize: 15.5, fontWeight: '900', flexShrink: 1 },
    cardMeta: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
    timeChip: {
      backgroundColor: 'rgba(247,183,51,0.16)',
      borderWidth: 1,
      borderColor: 'rgba(247,183,51,0.5)',
      borderRadius: radius.pill,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    timeChipText: { color: colors.primary, fontSize: 11, fontWeight: '900' },
    waitRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
    stakeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    stakeText: { color: colors.primary, fontSize: 13.5, fontWeight: '900' },

    note: { marginTop: 18 },
    noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    noteText: { color: colors.textMuted, fontSize: 12.5, lineHeight: 18, flex: 1 },

    outcomeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9 },
    dateText: { color: colors.textDim, fontSize: 11.5, fontWeight: '700' },
    outcomeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: radius.pill,
      borderWidth: 1,
      paddingHorizontal: 9,
      paddingVertical: 4,
    },
    outcomeWin: { backgroundColor: 'rgba(61,220,151,0.16)', borderColor: 'rgba(61,220,151,0.5)' },
    outcomeLose: { backgroundColor: 'rgba(255,91,127,0.16)', borderColor: 'rgba(255,91,127,0.5)' },
    outcomeText: { fontSize: 11.5, fontWeight: '900' },

    empty: { marginTop: 16, alignItems: 'center' },
    emptyTitle: { color: colors.text, fontSize: 19, fontWeight: '900', marginTop: 12 },
    emptyBody: { color: colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },
  });
}

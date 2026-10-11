import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { CardFlowHeader } from '../../components/cards/CardFlowHeader';
import { CardPanel } from '../../components/cards/CardPanel';
import { Colors, radius, useColors } from '../../theme/theme';
import { computeCardStats, iWon, settledCards, useCardsStore } from '../../store/cardsStore';
import type { GameCard } from '../../store/cardsStore';
import { formatMoney, formatSigned } from '../../lib/format';
import { getErrorMessage } from '../../lib/validation';
import { MainStackParamList } from '../../navigation/types';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "10 Oct · 21:43" — built by hand so it can't depend on Intl being present. */
function when(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MONTHS[d.getMonth()]} · ${hh}:${mm}`;
}

/**
 * The card game's history: every settled card, newest first — both the ones you
 * created and the ones you unveiled. My Cards only lists cards you *made*, and
 * Rewards reads as a winnings screen, so neither answers "what have I played?".
 */
export default function CardHistoryScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const cards = useCardsStore((s) => s.cards);
  const ensureSeeded = useCardsStore((s) => s.ensureSeeded);
  const settleDue = useCardsStore((s) => s.settleDue);

  useFocusEffect(
    useCallback(() => {
      ensureSeeded();
      settleDue();
    }, [ensureSeeded, settleDue])
  );

  const history = useMemo(
    () => [...settledCards(cards)].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    [cards]
  );
  const stats = useMemo(() => computeCardStats(cards), [cards]);

  return (
    <Screen>
      <CardFlowHeader title="History" step="EVERY SETTLED CARD" onBack={() => navigation.goBack()} />

      <CardPanel tone="deep" eyebrow="YOUR RECORD" title="All settled cards" style={{ marginTop: 16 }}>
        <View style={styles.grid}>
          <Cell label="Played" value={String(stats.played)} />
          <Cell label="Won" value={String(stats.wins)} tone={colors.success} />
          <Cell label="Lost" value={String(stats.losses)} tone={colors.danger} />
          <Cell
            label="Net"
            value={formatSigned(stats.net)}
            tone={stats.net >= 0 ? colors.success : colors.danger}
          />
        </View>
        <Text style={styles.gridNote}>
          Both roles count here — cards you created and cards you unveiled.
        </Text>
      </CardPanel>

      <CardPanel tone="deep" eyebrow="ACTIVITY" title="Timeline" style={{ marginTop: 16 }}>
        {history.length === 0 ? (
          <Text style={styles.empty}>
            Nothing has settled yet. The moment a card is answered it lands here with both figures and what
            it paid.
          </Text>
        ) : (
          history.map((card) => (
            <HistoryRow
              key={card.id}
              card={card}
              onPress={() => navigation.navigate('CardResult', { cardId: card.id })}
            />
          ))
        )}
      </CardPanel>
    </Screen>
  );
}

function Cell({ label, value, tone }: { label: string; value: string; tone?: string }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.cell}>
      <Text
        style={[styles.cellValue, !!tone && { color: tone }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {value}
      </Text>
      <Text style={styles.cellLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function HistoryRow({ card, onPress }: { card: GameCard; onPress: () => void }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const won = iWon(card);
  // NET effect of this card, not the gross payout: a win also cost its stake
  // (taken at creation as the originator, at play as the unveiler). Gross rows
  // could never sum to the summary's Net — they were out by exactly the stakes.
  const delta = won ? (card.payout ?? 0) - card.amount : -card.amount;
  const yours = card.originatorFigure > 0 ? card.originatorFigure : '—';
  const theirs = card.answeredFigure != null ? card.answeredFigure : '—';

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${card.mine ? 'You created' : 'You unveiled'} a ${formatMoney(card.amount)} card, ${
        won ? 'won' : 'lost'
      } ${formatMoney(Math.abs(delta))}`}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: won ? colors.success : colors.danger }]}>
        <Ionicons name={won ? 'trophy' : 'close'} size={14} color="#FFFFFF" />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {card.mine ? 'You created' : 'You unveiled'}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {formatMoney(card.amount)} · You {yours} · Them {theirs}
        </Text>
        <Text style={styles.rowDate} numberOfLines={1}>
          {when(card.createdAt)}
        </Text>
      </View>
      <Text
        style={[styles.rowDelta, { color: won ? colors.success : colors.danger }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {formatSigned(delta)}
      </Text>
    </Pressable>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    cell: {
      flexGrow: 1,
      flexBasis: '45%',
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: radius.sm,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderLight,
    },
    cellValue: { color: colors.primary, fontSize: 21, fontWeight: '900' },
    cellLabel: { color: colors.textDim, fontSize: 10.5, fontWeight: '800', letterSpacing: 0.9, marginTop: 4 },
    gridNote: { color: colors.textMuted, fontSize: 11.5, fontWeight: '600', marginTop: 10, lineHeight: 17 },

    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 11,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderLight,
    },
    rowIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    rowText: { flex: 1, minWidth: 0 },
    rowTitle: { color: colors.text, fontSize: 13.5, fontWeight: '900' },
    rowMeta: { color: colors.textMuted, fontSize: 11.5, fontWeight: '700', marginTop: 2 },
    rowDate: { color: colors.textDim, fontSize: 10.5, fontWeight: '700', marginTop: 1 },
    rowDelta: { fontSize: 14, fontWeight: '900' },

    empty: { color: colors.textMuted, fontSize: 12.5, fontWeight: '600', lineHeight: 19, marginTop: 10 },
  });
}

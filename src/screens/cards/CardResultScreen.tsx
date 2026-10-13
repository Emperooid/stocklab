import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { CardFlowHeader } from '../../components/cards/CardFlowHeader';
import { CardPanel } from '../../components/cards/CardPanel';
import { CardButton } from '../../components/cards/CardButton';
import { PlayingCard } from '../../components/cards/PlayingCard';
import { PotBreakdown } from '../../components/cards/PotBreakdown';
import { Colors, radius, useColors } from '../../theme/theme';
import { useCardsStore, winnerOf } from '../../store/cardsStore';
import { formatMoney, formatSigned } from '../../lib/format';
import { MainStackParamList } from '../../navigation/types';

/**
 * Page 3 — the reveal. Both figures are shown side by side, the match is called,
 * and the pot is split 80/20 in front of you.
 */
export default function CardResultScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const route = useRoute<RouteProp<MainStackParamList, 'CardResult'>>();
  const { cardId } = route.params;

  const cards = useCardsStore((s) => s.cards);
  const markSeen = useCardsStore((s) => s.markSeen);
  const card = useMemo(() => cards.find((c) => c.id === cardId), [cards, cardId]);

  useEffect(() => {
    if (card) markSeen(card.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id]);

  if (!card) {
    return (
      <Screen>
        <CardFlowHeader title="Result" onBack={() => navigation.goBack()} />
        <CardPanel tone="deep" style={{ alignItems: 'center' }}>
          <Ionicons name="alert-circle-outline" size={34} color={colors.primary} />
          <Text style={styles.missingTitle}>We couldn't find that card</Text>
          <CardButton
            title="Back to the table"
            icon="albums-outline"
            onPress={() => navigation.navigate('CardsGame', { screen: 'Play' })}
            style={{ marginTop: 16 }}
          />
        </CardPanel>
      </Screen>
    );
  }

  const winner = winnerOf(card);
  // Tri-state: true / false / undefined. Collapsing "unknown" into a loss is
  // what made a matched guess read as "Not this time".
  const won =
    card.status === 'settled' && winner != null ? (card.mine ? winner === 'originator' : winner === 'answerer') : undefined;
  // Only claim a match when BOTH figures are actually known.
  const figuresKnown = card.originatorFigure > 0 && card.answeredFigure != null;
  const matched = figuresKnown ? card.originatorFigure === card.answeredFigure : undefined;
  const outcome = matched === true ? 'IT’S A MATCH' : matched === false ? 'NO MATCH' : 'SETTLED';
  const body =
    matched === true
      ? 'Both numbers matched, so the answering player takes the pot.'
      : matched === false
        ? 'The numbers were different, so the card maker keeps the pot.'
        : winner === 'answerer'
          ? 'The answering player matched the hidden number, so they take the pot.'
          : winner === 'originator'
            ? 'The answering player missed the hidden number, so the card maker keeps the pot.'
            : 'This card has been played.'
  // Two cards plus the VS column have to fit the panel on any device. A fixed
  // 116 overflowed a narrow phone, so the cards are sized from the row's
  // measured width with a readable floor and the old 116 as the ceiling.
  const [revealWidth, setRevealWidth] = useState(0);
  const REVEAL_MIDDLE = 92;
  const revealCardSize = revealWidth
    ? Math.min(116, Math.max(66, Math.floor((revealWidth - REVEAL_MIDDLE - 20) / 2)))
    : 116;

  const originatorLabel = card.mine ? 'You' : card.originatorName;
  const answererLabel = card.mine ? card.answeredByName ?? 'Answerer' : 'You';
  const delta = won === true ? card.payout : won === false ? -card.amount : undefined;
  const verdictTitle = won === true ? 'You won!' : won === false ? 'Not this time' : 'Played';

  return (
    <Screen>
      <CardFlowHeader
        title="Result"
        step={outcome}
        closeIcon="close"
        onBack={() => navigation.navigate('CardsGame', { screen: 'Play' })}
        actionLabel="Results"
        onAction={() => navigation.navigate('CardsGame', { screen: 'Rewards' })}
      />

      <View style={[styles.verdict, won === false ? styles.verdictLose : styles.verdictWin]}>
        <View style={[styles.verdictIcon, { backgroundColor: won === false ? colors.danger : colors.success }]}>
          <Ionicons name={won === true ? 'trophy' : won === false ? 'close' : 'hourglass'} size={26} color="#FFFFFF" />
        </View>
        <Text style={styles.verdictTitle}>{verdictTitle}</Text>
        {delta != null && <Text style={styles.verdictDelta}>{formatSigned(delta)}</Text>}
        <Text style={styles.verdictBody}>{body}</Text>
      </View>

      <View style={styles.revealRow} onLayout={(e) => setRevealWidth(e.nativeEvent.layout.width)}>
        <PlayingCard
          amount={card.amount}
          size={revealCardSize}
          revealed
          figure={card.originatorFigure}
          caption={originatorLabel}
          chipLabel="STORED"
          chipIcon="lock-closed"
        />
        <View style={styles.vsWrap}>
          <View style={styles.vsBadge}>
            <Text style={styles.vsText}>VS</Text>
          </View>
          <View style={[styles.matchPill, matched ? styles.matchYes : styles.matchNo]}>
            <Ionicons
              name={matched ? 'checkmark' : 'close'}
              size={13}
              color={matched ? colors.ink : '#FFFFFF'}
            />
            <Text style={[styles.matchText, { color: matched ? colors.ink : '#FFFFFF' }]} numberOfLines={1}>
              {matched ? 'Matched' : 'Different'}
            </Text>
          </View>
        </View>
        <PlayingCard
          amount={card.amount}
          size={revealCardSize}
          revealed
          figure={card.answeredFigure}
          caption={answererLabel}
          chipLabel="REVEALED"
          chipIcon="eye"
        />
      </View>

      <CardPanel eyebrow="HOW IT SPLIT" title="The pot" style={{ marginTop: 20 }}>
        <View style={styles.figuresRow}>
          <View style={styles.figureCell}>
            <Text style={styles.figureCellLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {originatorLabel === 'You' ? 'YOUR HIDDEN FIGURE' : 'ORIGINATOR HID'}
            </Text>
            <Text style={styles.figureCellValue}>{card.originatorFigure}</Text>
          </View>
          <View style={styles.figureCellDivider} />
          <View style={styles.figureCell}>
            <Text style={styles.figureCellLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {answererLabel === 'You' ? 'YOUR FIGURE' : 'ANSWERER PICKED'}
            </Text>
            <Text style={styles.figureCellValue}>{card.answeredFigure ?? '—'}</Text>
          </View>
        </View>
        <PotBreakdown amount={card.amount} won={won} payout={card.payout} style={{ marginTop: 14 }} />
      </CardPanel>

      <View style={styles.actionRow}>
        <CardButton
          title="Play another"
          icon="albums-outline"
          onPress={() => navigation.navigate('CardsGame', { screen: 'Play' })}
        />
      </View>
      <CardButton
        title="See all results"
        variant="outline"
        icon="trophy-outline"
        onPress={() => navigation.navigate('CardsGame', { screen: 'Rewards' })}
        style={{ marginTop: 10 }}
      />
      <CardButton
        title="Back to my game"
        variant="ghost"
        icon="home-outline"
        onPress={() => navigation.navigate('CardsGame', { screen: 'CardsHome' })}
        style={{ marginTop: 6 }}
      />

      <Text style={styles.footnote}>
        Card {card.id.slice(-6).toUpperCase()} · {formatMoney(card.amount)} stake
      </Text>
    </Screen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    verdict: { borderRadius: radius.xl, borderWidth: 1, padding: 18, alignItems: 'center' },
    verdictWin: { backgroundColor: 'rgba(61,220,151,0.12)', borderColor: 'rgba(61,220,151,0.45)' },
    verdictLose: { backgroundColor: 'rgba(255,91,127,0.12)', borderColor: 'rgba(255,91,127,0.45)' },
    verdictIcon: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    verdictTitle: { color: colors.text, fontSize: 24, fontWeight: '900', marginTop: 12 },
    verdictDelta: { color: colors.primary, fontSize: 30, fontWeight: '900', marginTop: 4 },
    verdictBody: { color: colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8 },

    revealRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 22 },
    vsWrap: { alignItems: 'center', gap: 8, maxWidth: 92 },
    vsBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
    vsText: { color: colors.textDim, fontSize: 12, fontWeight: '900' },
    matchPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 5 },
    matchYes: { backgroundColor: colors.success },
    matchNo: { backgroundColor: colors.danger },
    matchText: { fontSize: 11, fontWeight: '900' },

    figuresRow: { flexDirection: 'row', alignItems: 'center' },
    figureCell: { flex: 1, alignItems: 'center' },
    figureCellDivider: { width: 1, height: 34, backgroundColor: colors.borderLight },
    figureCellLabel: { color: colors.textDim, fontSize: 9.5, fontWeight: '800', letterSpacing: 0.8, textAlign: 'center' },
    figureCellValue: { color: colors.primary, fontSize: 24, fontWeight: '900', marginTop: 2 },

    actionRow: { marginTop: 20 },
    missingTitle: { color: colors.text, fontSize: 19, fontWeight: '900', marginTop: 12 },
    footnote: { color: colors.textDim, fontSize: 11, textAlign: 'center', marginTop: 18, fontWeight: '600' },
  });
}

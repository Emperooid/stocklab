import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CardTableScreen } from '../../components/cards/CardTableScreen';
import { CardFlowHeader } from '../../components/cards/CardFlowHeader';
import { CardPanel } from '../../components/cards/CardPanel';
import { CardButton } from '../../components/cards/CardButton';
import { PlayingCard } from '../../components/cards/PlayingCard';
import { PotBreakdown } from '../../components/cards/PotBreakdown';
import { AppIcon } from '../../components/AppIcon';
import { cardGame, cardRadius } from '../../theme/cardsTheme';
import { iWon, useCardsStore } from '../../store/cardsStore';
import { formatMoney, formatSigned } from '../../lib/format';
import { MainStackParamList } from '../../navigation/types';

/**
 * Page 3 — the reveal. Both figures are shown side by side, the match is called,
 * and the pot is split 80/20 in front of you.
 */
export default function CardResultScreen() {
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
      <CardTableScreen>
        <CardFlowHeader title="Result" onBack={() => navigation.goBack()} />
        <CardPanel tone="deep" style={{ alignItems: 'center' }}>
          <AppIcon name="alert" size={34} color={cardGame.gold} />
          <Text style={styles.missingTitle}>We couldn't find that card</Text>
          <CardButton
            title="Back to the table"
            icon="cards-outline"
            onPress={() => navigation.navigate('CardsGame', { screen: 'Play' })}
            style={{ marginTop: 16 }}
          />
        </CardPanel>
      </CardTableScreen>
    );
  }

  const won = iWon(card);
  const matched = card.originatorFigure === card.answeredFigure;
  const originatorLabel = card.mine ? 'You' : card.originatorName;
  const answererLabel = card.mine ? card.answeredByName ?? 'Answerer' : 'You';
  const delta = won ? card.payout ?? 0 : -card.amount;

  return (
    <CardTableScreen>
      <CardFlowHeader
        title="Result"
        step={matched ? 'IT\u2019S A MATCH' : 'NO MATCH'}
        closeIcon="close"
        onBack={() => navigation.navigate('CardsGame', { screen: 'Play' })}
        actionLabel="Results"
        onAction={() => navigation.navigate('CardsGame', { screen: 'Rewards' })}
      />

      <View style={[styles.verdict, won ? styles.verdictWin : styles.verdictLose]}>
        <View style={[styles.verdictIcon, { backgroundColor: won ? cardGame.success : cardGame.danger }]}>
          <AppIcon name={won ? 'trophy' : 'close'} size={26} />
        </View>
        <Text style={styles.verdictTitle}>{won ? 'You won!' : 'Not this time'}</Text>
        <Text style={styles.verdictDelta}>{formatSigned(delta)}</Text>
        <Text style={styles.verdictBody}>
          {matched
            ? 'Both figures landed on the same number, so the answering player takes the pot.'
            : 'The figures were different, so the originator keeps the pot.'}
        </Text>
      </View>

      <View style={styles.revealRow}>
        <PlayingCard amount={card.amount} size={116} revealed figure={card.originatorFigure} caption={originatorLabel} />
        <View style={styles.vsWrap}>
          <View style={styles.vsBadge}>
            <Text style={styles.vsText}>VS</Text>
          </View>
          <View style={[styles.matchPill, matched ? styles.matchYes : styles.matchNo]}>
            <AppIcon name={matched ? 'check' : 'close'} size={13} color={matched ? cardGame.ink : '#FFFFFF'} />
            <Text style={[styles.matchText, { color: matched ? cardGame.ink : '#FFFFFF' }]}>
              {matched ? 'Matched' : 'Different'}
            </Text>
          </View>
        </View>
        <PlayingCard amount={card.amount} size={116} revealed figure={card.answeredFigure} caption={answererLabel} />
      </View>

      <CardPanel eyebrow="HOW IT SPLIT" title="The pot" style={{ marginTop: 20 }}>
        <View style={styles.figuresRow}>
          <View style={styles.figureCell}>
            <Text style={styles.figureCellLabel}>{originatorLabel === 'You' ? 'YOUR HIDDEN FIGURE' : 'ORIGINATOR HID'}</Text>
            <Text style={styles.figureCellValue}>{card.originatorFigure}</Text>
          </View>
          <View style={styles.figureCellDivider} />
          <View style={styles.figureCell}>
            <Text style={styles.figureCellLabel}>{answererLabel === 'You' ? 'YOUR FIGURE' : 'ANSWERER PICKED'}</Text>
            <Text style={styles.figureCellValue}>{card.answeredFigure ?? '—'}</Text>
          </View>
        </View>
        <PotBreakdown amount={card.amount} won={won} style={{ marginTop: 14 }} />
      </CardPanel>

      <View style={styles.actionRow}>
        <CardButton
          title="Play another"
          icon="cards-outline"
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
    </CardTableScreen>
  );
}

const styles = StyleSheet.create({
  verdict: { borderRadius: cardRadius.panel, borderWidth: 1, padding: 18, alignItems: 'center' },
  verdictWin: { backgroundColor: 'rgba(61,220,151,0.12)', borderColor: 'rgba(61,220,151,0.45)' },
  verdictLose: { backgroundColor: 'rgba(255,91,127,0.12)', borderColor: 'rgba(255,91,127,0.45)' },
  verdictIcon: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  verdictTitle: { color: cardGame.text, fontSize: 24, fontWeight: '900', marginTop: 12 },
  verdictDelta: { color: cardGame.gold, fontSize: 30, fontWeight: '900', marginTop: 4 },
  verdictBody: { color: cardGame.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 8 },

  revealRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 22 },
  vsWrap: { alignItems: 'center', gap: 8 },
  vsBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: cardGame.tableDeep, borderWidth: 1.5, borderColor: cardGame.rim, alignItems: 'center', justifyContent: 'center' },
  vsText: { color: cardGame.textDim, fontSize: 12, fontWeight: '900' },
  matchPill: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: cardRadius.pill, paddingHorizontal: 10, paddingVertical: 5 },
  matchYes: { backgroundColor: cardGame.success },
  matchNo: { backgroundColor: cardGame.danger },
  matchText: { fontSize: 11, fontWeight: '900' },

  figuresRow: { flexDirection: 'row', alignItems: 'center' },
  figureCell: { flex: 1, alignItems: 'center' },
  figureCellDivider: { width: 1, height: 34, backgroundColor: cardGame.rimSoft },
  figureCellLabel: { color: cardGame.textDim, fontSize: 9.5, fontWeight: '800', letterSpacing: 0.8, textAlign: 'center' },
  figureCellValue: { color: cardGame.gold, fontSize: 24, fontWeight: '900', marginTop: 2 },

  actionRow: { marginTop: 20 },
  missingTitle: { color: cardGame.text, fontSize: 19, fontWeight: '900', marginTop: 12 },
  footnote: { color: cardGame.textDim, fontSize: 11, textAlign: 'center', marginTop: 18, fontWeight: '600' },
});

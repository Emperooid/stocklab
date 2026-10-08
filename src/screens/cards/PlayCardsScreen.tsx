import { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CardTableScreen } from '../../components/cards/CardTableScreen';
import { CardPanel } from '../../components/cards/CardPanel';
import { CardButton } from '../../components/cards/CardButton';
import { PlayingCard } from '../../components/cards/PlayingCard';
import { AppIcon, Illustration } from '../../components/AppIcon';
import { cardGame, cardRadius } from '../../theme/cardsTheme';
import { openCards, useCardsStore } from '../../store/cardsStore';
import { formatMoney } from '../../lib/format';
import { CardsTabParamList, MainStackParamList } from '../../navigation/types';

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/**
 * Page 2 — the open table. Other players' face-down cards, each showing only
 * its price. Tapping one takes you to the unveil step.
 */
export default function PlayCardsScreen() {
  const tabNavigation = useNavigation<BottomTabNavigationProp<CardsTabParamList>>();
  const stackNavigation = tabNavigation.getParent<NativeStackNavigationProp<MainStackParamList>>();

  const cards = useCardsStore((s) => s.cards);
  const bankroll = useCardsStore((s) => s.bankroll);
  const ensureSeeded = useCardsStore((s) => s.ensureSeeded);
  const settleDue = useCardsStore((s) => s.settleDue);

  useFocusEffect(
    useCallback(() => {
      ensureSeeded();
      settleDue();
    }, [ensureSeeded, settleDue])
  );

  const playable = useMemo(() => openCards(cards), [cards]);
  const affordable = playable.filter((c) => (bankroll ?? 0) >= c.amount).length;

  return (
    <CardTableScreen>
      <View style={styles.headerRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.eyebrow}>THE OPEN TABLE</Text>
          <Text style={styles.title}>Play a card</Text>
        </View>
        <View style={styles.balanceChip}>
          <AppIcon name="coin" size={15} />
          <Text style={styles.balanceText} numberOfLines={1}>
            {bankroll == null ? '—' : formatMoney(bankroll)}
          </Text>
        </View>
      </View>

      <Text style={styles.subtitle}>
        Someone has hidden a figure behind each of these. Match the stake, pick your number, and if it lands
        on theirs you take 80% of the pot.
      </Text>

      {playable.length > 0 && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryValue}>{playable.length}</Text>
            <Text style={styles.summaryLabel}>open</Text>
          </View>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryValue}>{affordable}</Text>
            <Text style={styles.summaryLabel}>you can afford</Text>
          </View>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryValue}>{formatMoney(playable[0]?.amount ?? 0)}</Text>
            <Text style={styles.summaryLabel}>lowest stake</Text>
          </View>
        </View>
      )}

      {playable.length === 0 ? (
        <CardPanel tone="deep" style={{ marginTop: 16, alignItems: 'center' }}>
          <Illustration name="cards" size={140} />
          <Text style={styles.emptyTitle}>The table is empty</Text>
          <Text style={styles.emptyBody}>
            Nobody has a card open right now. Put one down and let someone come to you.
          </Text>
          <CardButton
            title="Create a card"
            icon="plus"
            onPress={() => stackNavigation?.navigate('SetCard')}
            style={{ marginTop: 16 }}
          />
        </CardPanel>
      ) : (
        <View style={{ gap: 12, marginTop: 16 }}>
          {playable.map((card) => {
            const canAfford = (bankroll ?? 0) >= card.amount;
            return (
              <CardPanel key={card.id} tone="table" style={styles.cardRow}>
                <PlayingCard amount={card.amount} size={78} />
                <View style={styles.cardInfo}>
                  <Text style={styles.originator} numberOfLines={1}>
                    {card.originatorName}
                  </Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    hid a figure · {timeAgo(card.createdAt)}
                  </Text>
                  <View style={styles.stakeRow}>
                    <AppIcon name="lock" size={12} color={cardGame.gold} />
                    <Text style={styles.stakeText}>Match {formatMoney(card.amount)} to play</Text>
                  </View>
                  <CardButton
                    title={canAfford ? 'Unveil' : 'Not enough balance'}
                    size="sm"
                    icon={canAfford ? 'eye' : 'alert'}
                    variant={canAfford ? 'gold' : 'outline'}
                    disabled={!canAfford}
                    onPress={() => stackNavigation?.navigate('UnveilCard', { cardId: card.id })}
                    style={{ marginTop: 10 }}
                  />
                </View>
              </CardPanel>
            );
          })}
        </View>
      )}

      <CardPanel tone="gold" style={{ marginTop: 18 }}>
        <View style={styles.tipRow}>
          <AppIcon name="bulb" size={16} color={cardGame.gold} />
          <Text style={styles.tipText}>
            Every figure is equally likely, so there's no clever pick — only a confident one. A match pays
            back 80% of the two stakes combined.
          </Text>
        </View>
      </CardPanel>
    </CardTableScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  eyebrow: { color: cardGame.textDim, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.1 },
  title: { color: cardGame.text, fontSize: 26, fontWeight: '900', marginTop: 1 },
  balanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: cardGame.tableDeep,
    borderWidth: 1.5,
    borderColor: cardGame.gold,
    borderRadius: cardRadius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  balanceText: { color: cardGame.gold, fontSize: 13.5, fontWeight: '900' },
  subtitle: { color: cardGame.textMuted, fontSize: 13.5, lineHeight: 20, marginTop: 10 },

  summaryRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
  summaryChip: {
    flex: 1,
    backgroundColor: cardGame.table,
    borderWidth: 1,
    borderColor: cardGame.rim,
    borderRadius: cardRadius.chip,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  summaryValue: { color: cardGame.gold, fontSize: 18, fontWeight: '900' },
  summaryLabel: { color: cardGame.textDim, fontSize: 10.5, fontWeight: '800', marginTop: 1 },

  cardRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  cardInfo: { flex: 1, minWidth: 0 },
  originator: { color: cardGame.text, fontSize: 16, fontWeight: '900' },
  cardMeta: { color: cardGame.textDim, fontSize: 12, marginTop: 2, fontWeight: '600' },
  stakeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  stakeText: { color: cardGame.gold, fontSize: 12.5, fontWeight: '800' },

  emptyTitle: { color: cardGame.text, fontSize: 19, fontWeight: '900', marginTop: 12 },
  emptyBody: { color: cardGame.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },

  tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  tipText: { color: cardGame.textMuted, fontSize: 12.5, flex: 1, lineHeight: 18 },
});

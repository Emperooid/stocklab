import { useCallback, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { CardPanel } from '../../components/cards/CardPanel';
import { CardButton } from '../../components/cards/CardButton';
import { PlayingCard } from '../../components/cards/PlayingCard';
import { Colors, radius, useColors } from '../../theme/theme';
import { openCards, useCardsStore } from '../../store/cardsStore';
import { formatMoney, formatCreatedAt } from '../../lib/format';
import { CardsTabParamList, MainStackParamList } from '../../navigation/types';


/**
 * Page 2 — the open table. Other players' face-down cards, each showing only
 * its price. Tapping one takes you to the unveil step.
 */
export default function PlayCardsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
    <Screen>
      <View style={styles.headerRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.eyebrow}>THE OPEN TABLE</Text>
          <Text style={styles.title}>Play a card</Text>
        </View>
        <View style={styles.balanceChip}>
          <Ionicons name="cash-outline" size={15} color={colors.primary} />
          <Text style={styles.balanceText} numberOfLines={1}>
            {bankroll == null ? '—' : formatMoney(bankroll)}
          </Text>
        </View>
      </View>

      <Text style={styles.subtitle}>
        Someone has hidden a number between 1 and 5 behind a card. Guess correctly to win the value on the
        card, or lose your entry stake if you guess wrong.
      </Text>

      {playable.length > 0 && (
        <View style={styles.summaryRow}>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {playable.length}
            </Text>
            <Text style={styles.summaryLabel}>open</Text>
          </View>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {affordable}
            </Text>
            <Text style={styles.summaryLabel}>you can afford</Text>
          </View>
          <View style={styles.summaryChip}>
            <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
              {formatMoney(playable[0]?.amount ?? 0)}
            </Text>
            <Text style={styles.summaryLabel}>lowest entry</Text>
          </View>
        </View>
      )}

      {playable.length === 0 ? (
        <CardPanel tone="deep" style={{ marginTop: 16, alignItems: 'center' }}>
          {/* Placeholder for the removed bundled "cards" illustration. */}
          <Ionicons name="albums-outline" size={140} color={colors.textDim} />
          <Text style={styles.emptyTitle}>The table is empty</Text>
          <Text style={styles.emptyBody}>
            Nobody has a card open right now. Put one down and let someone come to you.
          </Text>
          <CardButton
            title="Create a card"
            icon="add"
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
                    hid a number · {formatCreatedAt(card.createdAtRaw, card.createdAt)}
                  </Text>
                  <View style={styles.stakeRow}>
                    <Ionicons name="lock-closed-outline" size={12} color={colors.primary} />
                    <Text style={styles.stakeText}>Put in {formatMoney(card.amount)} to play</Text>
                  </View>
                  <CardButton
                    title={canAfford ? 'Unveil a card' : 'Not enough balance'}
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
          <Ionicons name="bulb-outline" size={16} color={colors.primary} />
          <Text style={styles.tipText}>
            Every number is equally likely. There's no clever pick — only a confident one.
          </Text>
        </View>
      </CardPanel>
    </Screen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    eyebrow: { color: colors.textDim, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.1 },
    title: { color: colors.text, fontSize: 26, fontWeight: '900', marginTop: 1 },
    balanceChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1.5,
      borderColor: colors.primary,
      borderRadius: radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    balanceText: { color: colors.primary, fontSize: 13.5, fontWeight: '900' },
    subtitle: { color: colors.textMuted, fontSize: 13.5, lineHeight: 20, marginTop: 10 },

    summaryRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
    summaryChip: {
      flex: 1,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radius.sm,
      paddingVertical: 10,
      paddingHorizontal: 10,
    },
    summaryValue: { color: colors.primary, fontSize: 18, fontWeight: '900' },
    summaryLabel: { color: colors.textDim, fontSize: 10.5, fontWeight: '800', marginTop: 1 },

    cardRow: { flexDirection: 'row', gap: 14, alignItems: 'center' },
    cardInfo: { flex: 1, minWidth: 0 },
    originator: { color: colors.text, fontSize: 16, fontWeight: '900' },
    cardMeta: { color: colors.textDim, fontSize: 12, marginTop: 2, fontWeight: '600' },
    stakeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
    stakeText: { color: colors.primary, fontSize: 12.5, fontWeight: '800' },

    emptyTitle: { color: colors.text, fontSize: 19, fontWeight: '900', marginTop: 12 },
    emptyBody: { color: colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },

    tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    tipText: { color: colors.textMuted, fontSize: 12.5, flex: 1, lineHeight: 18 },
  });
}

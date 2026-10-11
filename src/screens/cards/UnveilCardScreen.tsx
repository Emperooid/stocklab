import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { CardFlowHeader } from '../../components/cards/CardFlowHeader';
import { CardPanel } from '../../components/cards/CardPanel';
import { CardButton } from '../../components/cards/CardButton';
import { PlayingCard } from '../../components/cards/PlayingCard';
import { DepositModal } from '../../components/DepositModal';
import { FigurePicker } from '../../components/cards/FigurePicker';
import { PotBreakdown } from '../../components/cards/PotBreakdown';
import { Colors, radius, useColors } from '../../theme/theme';
import { useCardsStore } from '../../store/cardsStore';
import { formatMoney } from '../../lib/format';
import { getErrorMessage } from '../../lib/validation';
import { MainStackParamList } from '../../navigation/types';

/**
 * Page 2, step 2 — "Unveil Card". You stake the same amount the originator set,
 * pick your figure, and the card is scored immediately.
 */
export default function UnveilCardScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const route = useRoute<RouteProp<MainStackParamList, 'UnveilCard'>>();
  const { cardId } = route.params;

  const cards = useCardsStore((s) => s.cards);
  const bankroll = useCardsStore((s) => s.bankroll);
  const playCard = useCardsStore((s) => s.playCard);

  const card = useMemo(() => cards.find((c) => c.id === cardId), [cards, cardId]);
  const [figure, setFigure] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [topUpOpen, setTopUpOpen] = useState(false);

  const canAfford = card ? (bankroll ?? 0) >= card.amount : false;

  async function handlePlay() {
    if (!card || figure == null) return;
    setError('');
    setSaving(true);
    try {
      await playCard(card.id, figure);
      // replace, so Back from the reveal returns to the open table
      navigation.replace('CardResult', { cardId: card.id });
    } catch (e) {
      setError(getErrorMessage(e, 'Could not play that card.'));
      setSaving(false);
    }
  }

  if (!card || card.status !== 'open') {
    return (
      <Screen>
        <CardFlowHeader title="Unveil the card" onBack={() => navigation.goBack()} />
        <CardPanel tone="deep" style={{ alignItems: 'center' }}>
          <Ionicons name="alert-circle-outline" size={34} color={colors.primary} />
          <Text style={styles.goneTitle}>This card has already been played</Text>
          <Text style={styles.goneBody}>Someone got there first. There are other cards on the table.</Text>
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

  return (
    <Screen>
      <CardFlowHeader title="Unveil the card" step="MATCH THE STAKE" onBack={() => navigation.goBack()} />

      <View style={styles.heroRow}>
        <PlayingCard amount={card.amount} size={124} />
        <View style={styles.heroInfo}>
          <Text style={styles.originatorLabel}>ORIGINATOR</Text>
          <Text style={styles.originator} numberOfLines={1}>
            {card.originatorName}
          </Text>
          <View style={styles.pillRow}>
            <Ionicons name="lock-closed-outline" size={12} color={colors.warning} />
            <Text style={[styles.pillText, { color: colors.warning }]}>Figure hidden</Text>
          </View>
          <View style={[styles.pillRow, styles.pillRowCyan]}>
            <Ionicons name="cash-outline" size={12} color={colors.blue} />
            <Text style={[styles.pillText, { color: colors.blue }]}>Stake {formatMoney(card.amount)}</Text>
          </View>
        </View>
      </View>

      <CardPanel eyebrow="YOUR MOVE" title="Pick your figure" style={{ marginTop: 18 }}>
        <Text style={styles.helper}>
          Match the figure they hid and you take the pot. There's no second chance once you play.
        </Text>
        <FigurePicker value={figure} onChange={setFigure} style={{ marginTop: 14 }} />
      </CardPanel>

      <CardPanel eyebrow="IF YOU MATCH" title="What you'd win INSTANTLY" tone="gold" style={{ marginTop: 16 }}>
        <PotBreakdown amount={card.amount} />
      </CardPanel>

      <View style={styles.balanceRow}>
        <Ionicons name="wallet-outline" size={14} color={colors.textMuted} />
        <Text style={styles.balanceText}>
          Balance {bankroll == null ? '—' : formatMoney(bankroll)} · after staking{' '}
          {formatMoney(Math.max(0, (bankroll ?? 0) - card.amount))}
        </Text>
      </View>

      {!canAfford && (
        <>
          <View style={styles.warnRow}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
            <Text style={styles.warnText}>
              You need {formatMoney(card.amount)} to match this stake. Top up your wallet to play it.
            </Text>
          </View>
          {/* Saying "top up your wallet" without a way to do it was a dead end. */}
          <CardButton
            title="Top up wallet"
            icon="add-circle"
            variant="gold"
            onPress={() => setTopUpOpen(true)}
            style={{ marginTop: 10 }}
          />
        </>
      )}

      {!!error && (
        <View style={styles.warnRow}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
          <Text style={styles.warnText}>{error}</Text>
        </View>
      )}

      <CardButton
        // The stake is already on the card and in the pill above, so the action
        // just names what it does.
        title={!canAfford ? 'Not enough balance' : figure == null ? 'Pick a figure to unveil' : 'Unveil'}
        icon="eye"
        loading={saving}
        disabled={figure == null || !canAfford}
        onPress={handlePlay}
        style={{ marginTop: 18 }}
      />

      <DepositModal
        visible={topUpOpen}
        onClose={() => {
          setTopUpOpen(false);
          // The card balance mirrors the wallet, so pull the new balance in —
          // otherwise the card stays unplayable until the next focus.
          useCardsStore.getState().refreshFromServer().catch(() => {});
        }}
      />
    </Screen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    heroRow: { flexDirection: 'row', gap: 16, alignItems: 'center' },
    heroInfo: { flex: 1, minWidth: 0 },
    originatorLabel: { color: colors.textDim, fontSize: 10.5, fontWeight: '800', letterSpacing: 1.1 },
    originator: { color: colors.text, fontSize: 19, fontWeight: '900', marginTop: 2 },
    pillRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(247,183,51,0.14)',
      borderWidth: 1,
      borderColor: 'rgba(247,183,51,0.4)',
      borderRadius: radius.pill,
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginTop: 10,
    },
    pillRowCyan: { backgroundColor: 'rgba(74,222,222,0.12)', borderColor: 'rgba(74,222,222,0.4)' },
    pillText: { color: colors.primary, fontSize: 11.5, fontWeight: '800' },
    helper: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 4 },
    balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
    balanceText: { color: colors.textMuted, fontSize: 12, flex: 1, fontWeight: '600' },
    warnRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 14,
      backgroundColor: 'rgba(255,91,127,0.14)',
      borderWidth: 1,
      borderColor: 'rgba(255,91,127,0.4)',
      borderRadius: radius.sm,
      padding: 12,
    },
    warnText: { color: colors.danger, fontSize: 12.5, flex: 1, fontWeight: '700' },
    goneTitle: { color: colors.text, fontSize: 19, fontWeight: '900', marginTop: 12 },
    goneBody: { color: colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },
  });
}

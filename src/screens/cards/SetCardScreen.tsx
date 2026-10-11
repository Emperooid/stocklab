import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Screen } from '../../components/Screen';
import { CardFlowHeader } from '../../components/cards/CardFlowHeader';
import { CardPanel } from '../../components/cards/CardPanel';
import { CardButton } from '../../components/cards/CardButton';
import { PlayingCard } from '../../components/cards/PlayingCard';
import { FigurePicker } from '../../components/cards/FigurePicker';
import { AmountPicker } from '../../components/cards/AmountPicker';
import { PotBreakdown } from '../../components/cards/PotBreakdown';
import { Colors, radius, useColors } from '../../theme/theme';
import { CARD_MAX, CARD_MIN, GameCard, payoutFor, potFor, useCardsStore } from '../../store/cardsStore';
import { formatMoney } from '../../lib/format';
import { getErrorMessage } from '../../lib/validation';
import { MainStackParamList } from '../../navigation/types';

/**
 * Page 1 — "Set Card".
 *
 * Choose → Hide (the card goes face down) → it's live. The figure is never shown
 * on this screen once picked, which is the whole point of the game.
 */
export default function SetCardScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const bankroll = useCardsStore((s) => s.bankroll);
  const createCard = useCardsStore((s) => s.createCard);

  const [step, setStep] = useState<'figure' | 'price' | 'done'>('figure');
  const [figure, setFigure] = useState<number | null>(null);
  const [amount, setAmount] = useState(500);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [created, setCreated] = useState<GameCard | null>(null);

  async function handleCreate() {
    if (figure == null) return;
    setError('');
    setSaving(true);
    try {
      const card = await createCard(figure, amount);
      setCreated(card);
      setStep('done');
    } catch (e) {
      setError(getErrorMessage(e, 'Could not create that card.'));
    } finally {
      setSaving(false);
    }
  }

  function reset() {
    setFigure(null);
    setAmount(500);
    setCreated(null);
    setError('');
    setStep('figure');
  }

  const stepLabel = step === 'figure' ? 'STEP 1 OF 2' : step === 'price' ? 'STEP 2 OF 2' : 'CARD IS LIVE';

  return (
    <Screen>
      <CardFlowHeader
        title="Create a card"
        step={stepLabel}
        onBack={() => navigation.goBack()}
        actionLabel={step === 'done' ? 'Results' : undefined}
        onAction={step === 'done' ? () => navigation.navigate('CardsGame', { screen: 'Rewards' }) : undefined}
      />

      {step === 'figure' && (
        <>
          <CardPanel eyebrow="MAKE YOUR PICK" title="Choose the figure you'll hide">
            <Text style={styles.helper}>
              Any number from 1 to 5. Nobody sees it — not even after the card is created. Only the price is public.
            </Text>
            <FigurePicker value={figure} onChange={setFigure} style={{ marginTop: 14 }} />
            <View style={styles.noteRow}>
              <Ionicons name="lock-closed-outline" size={14} color={colors.primary} />
              <Text style={styles.noteText}>Your figure is sealed the moment you move on.</Text>
            </View>
          </CardPanel>

          <CardPanel eyebrow="HOW IT WORKS" title="What you're playing" tone="deep" style={{ marginTop: 16 }}>
            <Text style={styles.helper}>
              You hide one number. Everyone else can see what the card is worth, but never your figure. Someone
              has to match that price to take you on — and then guess the number you hid.
            </Text>
            <View style={styles.steps}>
              {[
                ['1', 'Hide a figure', 'Pick any number from 1 to 5. It stays secret — even after the card goes live.'],
                ['2', 'Set the price', `Choose what the card is worth (${'₦'}100 – ${'₦'}1,000). Whoever plays it must stake the same amount.`],
                ['3', 'Someone takes it on', 'Any player can match your price and guess your figure. Your balance covers the stake the moment you create the card.'],
                ['4', 'The reveal', 'Guess right and they win 80% of the pot. Guess wrong and you win it. CrowdStock keeps 20%.'],
              ].map(([n, title, body]) => (
                <View key={n} style={styles.stepRow}>
                  <View style={styles.stepNum}>
                    <Text style={styles.stepNumText}>{n}</Text>
                  </View>
                  <View style={styles.stepBody}>
                    <Text style={styles.stepTitle}>{title}</Text>
                    <Text style={styles.stepText}>{body}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={styles.noteRow}>
              <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
              <Text style={styles.noteText}>
                Every figure is equally likely, so there's no clever pick — only a confident one.
              </Text>
            </View>
          </CardPanel>

          <CardButton
            title="Next: set the price"
            icon="arrow-forward"
            disabled={figure == null}
            onPress={() => setStep('price')}
            style={{ marginTop: 16 }}
          />
        </>
      )}

      {step === 'price' && (
        <>
          <View style={styles.previewWrap}>
            <PlayingCard amount={amount} size={132} picked={figure ?? undefined} />
            <View style={styles.previewBadge}>
              <Ionicons name="lock-closed-outline" size={13} color={colors.surfaceAlt} />
              <Text style={styles.previewBadgeText}>Hidden from other players</Text>
            </View>
          </View>
          <Text style={styles.previewCaption}>This is exactly what other players will see.</Text>

          <CardPanel eyebrow="SET THE PRICE" title="How much is this card worth?" style={{ marginTop: 16 }}>
            <Text style={styles.helper}>
              Whoever plays it has to match this amount. You both put in the same stake.
            </Text>
            <AmountPicker value={amount} onChange={setAmount} min={CARD_MIN} max={CARD_MAX} style={{ marginTop: 14 }} />
          </CardPanel>

          <CardPanel eyebrow="IF SOMEONE MATCHES" title="What's at stake" tone="deep" style={{ marginTop: 16 }}>
            <PotBreakdown amount={amount} />
          </CardPanel>

          <View style={styles.tipRow}>
            <Ionicons name="information-circle-outline" size={14} color={colors.blue} />
            <Text style={styles.tipText}>
              Your balance is {bankroll == null ? '—' : formatMoney(bankroll)}. Staking leaves{' '}
              {formatMoney(Math.max(0, (bankroll ?? 0) - amount))}.
            </Text>
          </View>

          {!!error && (
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <CardButton
            title="Create card"
            icon="checkmark"
            loading={saving}
            onPress={handleCreate}
            style={{ marginTop: 16 }}
          />
          <CardButton
            title="Back"
            variant="ghost"
            onPress={() => setStep('figure')}
            style={{ marginTop: 8 }}
          />
        </>
      )}

      {step === 'done' && created && (
        <>
          <View style={styles.previewWrap}>
            <PlayingCard amount={created.amount} size={150} picked={created.originatorFigure} />
          </View>
          <Text style={styles.doneTitle}>Your card is live</Text>
          <Text style={styles.doneBody}>
            It's face down on the table. The moment someone plays it, the figures are revealed and the winner
            takes {formatMoney(payoutFor(created.amount))} of the {formatMoney(potFor(created.amount))} pot.
          </Text>

          <CardPanel eyebrow="WAITING ON" title="An answering player" tone="gold" style={{ marginTop: 16 }}>
            <View style={styles.waitRow}>
              <Ionicons name="time-outline" size={16} color={colors.primary} />
              <Text style={styles.waitText}>
                We'll settle it automatically and it'll appear in your results. Your figure stays hidden until then.
              </Text>
            </View>
            <PotBreakdown amount={created.amount} style={{ marginTop: 12 }} />
          </CardPanel>

          <CardButton
            title="See my cards"
            icon="albums-outline"
            onPress={() => navigation.navigate('CardsGame', { screen: 'MyCards' })}
            style={{ marginTop: 16 }}
          />
          <CardButton title="Create another" variant="outline" icon="add" onPress={reset} style={{ marginTop: 10 }} />
        </>
      )}
    </Screen>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    helper: { color: colors.textMuted, fontSize: 13, lineHeight: 19, marginTop: 4 },
    noteRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
    noteText: { color: colors.textDim, fontSize: 11.5, flex: 1, fontWeight: '600' },

    previewWrap: { alignItems: 'center', marginTop: 4 },
    previewBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: colors.primary,
      borderRadius: radius.pill,
      paddingHorizontal: 12,
      paddingVertical: 6,
      marginTop: 12,
    },
    previewBadgeText: { color: colors.surfaceAlt, fontSize: 11.5, fontWeight: '900' },
    steps: { marginTop: 14, gap: 12 },
    stepRow: { flexDirection: 'row', gap: 10 },
    stepNum: {
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: colors.primaryTint,
      borderWidth: 1,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepNumText: { color: colors.primary, fontSize: 12, fontWeight: '900' },
    stepBody: { flex: 1, minWidth: 0 },
    stepTitle: { color: colors.text, fontSize: 13.5, fontWeight: '900' },
    stepText: { color: colors.textMuted, fontSize: 12, fontWeight: '600', marginTop: 2, lineHeight: 17 },
    previewCaption: { color: colors.textDim, fontSize: 12, textAlign: 'center', marginTop: 8 },

    tipRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 14 },
    tipText: { color: colors.textMuted, fontSize: 12, flex: 1, lineHeight: 17 },

    errorRow: {
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
    errorText: { color: colors.danger, fontSize: 12.5, flex: 1, fontWeight: '700' },

    doneTitle: { color: colors.text, fontSize: 26, fontWeight: '900', textAlign: 'center', marginTop: 18 },
    doneBody: { color: colors.textMuted, fontSize: 13.5, lineHeight: 20, textAlign: 'center', marginTop: 8 },
    waitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    waitText: { color: colors.textMuted, fontSize: 12.5, flex: 1, lineHeight: 18 },
  });
}

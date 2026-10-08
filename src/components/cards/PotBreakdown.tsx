import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { AppIcon } from '../AppIcon';
import { cardGame, cardRadius } from '../../theme/cardsTheme';
import { formatMoney } from '../../lib/format';
import { PLATFORM_SHARE, WINNER_SHARE, payoutFor, potFor } from '../../store/cardsStore';

interface PotBreakdownProps {
  amount: number;
  /** Who won, so the winner row can be highlighted. */
  won?: boolean | null;
  style?: StyleProp<ViewStyle>;
}

/** Total pot → winner's 80% → the house's 20%. */
export function PotBreakdown({ amount, won, style }: PotBreakdownProps) {
  const pot = potFor(amount);
  const payout = payoutFor(amount);
  const fee = pot - payout;

  return (
    <View style={[styles.wrap, style]}>
      <Row label="Total Pot" value={formatMoney(pot)} icon="pot" />
      <View style={styles.divider} />
      <Row
        label={`Winner gets (${Math.round(WINNER_SHARE * 100)}%)`}
        value={formatMoney(payout)}
        icon="crown"
        highlight={won === true ? 'win' : won === false ? 'lose' : undefined}
      />
      <View style={styles.divider} />
      <Row label={`Platform fee (${Math.round(PLATFORM_SHARE * 100)}%)`} value={formatMoney(fee)} icon="bank-outline" muted />
    </View>
  );
}

function Row({
  label,
  value,
  icon,
  highlight,
  muted,
}: {
  label: string;
  value: string;
  icon: Parameters<typeof AppIcon>[0]['name'];
  highlight?: 'win' | 'lose';
  muted?: boolean;
}) {
  const colour = highlight === 'win' ? cardGame.success : highlight === 'lose' ? cardGame.danger : cardGame.text;
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <AppIcon name={icon} size={16} color={muted ? cardGame.textDim : cardGame.gold} />
      </View>
      <Text style={[styles.label, muted && styles.labelMuted]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.value, { color: colour }, muted && styles.labelMuted]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: cardGame.tableDeep,
    borderWidth: 1,
    borderColor: cardGame.rim,
    borderRadius: cardRadius.chip,
    paddingHorizontal: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  iconWrap: { width: 22, alignItems: 'center' },
  label: { color: cardGame.textMuted, fontSize: 13, fontWeight: '700', flex: 1 },
  labelMuted: { color: cardGame.textDim },
  value: { fontSize: 15, fontWeight: '900' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: cardGame.rimSoft },
});

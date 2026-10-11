import { useMemo } from 'react';
import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, radius, useColors } from '../../theme/theme';
import { formatMoney } from '../../lib/format';
import { payoutFor, potFor } from '../../store/cardsStore';

interface PotBreakdownProps {
  amount: number;
  /** Who won, so the winner row can be highlighted. */
  won?: boolean | null;
  /**
   * What the gateway actually paid. Pass this for a settled card so the split
   * shows real money; without it the local 80/20 rule is used, which is only
   * truthful as a preview of a card that hasn't been played yet.
   */
  payout?: number;
  style?: StyleProp<ViewStyle>;
}

/** Total pot → what the winner is paid. No fee line: the split isn't disclosed. */
export function PotBreakdown({ amount, won, payout: reported, style }: PotBreakdownProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const pot = potFor(amount);
  const payout = reported ?? payoutFor(amount);

  return (
    <View style={[styles.wrap, style]}>
      <Row colors={colors} styles={styles} label="Total Pot" value={formatMoney(pot)} icon="cash" />
      <View style={styles.divider} />
      <Row
        colors={colors}
        styles={styles}
        label="Winner gets"
        value={formatMoney(payout)}
        icon="trophy"
        highlight={won === true ? 'win' : won === false ? 'lose' : undefined}
      />
    </View>
  );
}

function Row({
  label,
  value,
  icon,
  highlight,
  colors,
  styles,
}: {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  highlight?: 'win' | 'lose';
  colors: Colors;
  styles: ReturnType<typeof createStyles>;
}) {
  const colour = highlight === 'win' ? colors.success : highlight === 'lose' ? colors.danger : colors.text;
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={16} color={colors.warning} />
      </View>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.value, { color: colour }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    // No background/border of its own — this sits directly inside a
    // CardPanel (gold-tinted), and a second nested box-within-a-box read as
    // visually busy rather than blended. Dividers alone separate the rows.
    wrap: {},
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
    iconWrap: { width: 22, alignItems: 'center' },
    label: { color: colors.textMuted, fontSize: 13, fontWeight: '700', flex: 1 },
    value: { fontSize: 15, fontWeight: '900' },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  });
}

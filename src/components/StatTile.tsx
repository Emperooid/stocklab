import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { AppIcon } from './AppIcon';
import { IconName } from '../theme/icons';
import { withAlpha } from '../lib/color';
import { radius, spacing, typography, useColors } from '../theme/theme';

interface StatTileProps {
  label: string;
  value: string;
  icon: IconName;
  color?: string;
  hint?: string;
  style?: StyleProp<ViewStyle>;
}

/** Compact metric tile: picture bubble, big number, small caption. */
export function StatTile({ label, value, icon, color, hint, style }: StatTileProps) {
  const colors = useColors();
  const tint = color ?? colors.primary;
  return (
    <View
      style={[
        tile.wrap,
        { backgroundColor: colors.surface, borderColor: colors.border },
        style,
      ]}
    >
      <View style={[tile.bubble, { backgroundColor: withAlpha(tint, 0.14) }]}>
        <AppIcon name={icon} size={19} color={tint} />
      </View>
      <Text style={[tile.value, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {value}
      </Text>
      <Text style={[tile.label, { color: colors.textMuted }]} numberOfLines={2}>
        {label}
      </Text>
      {!!hint && <Text style={[tile.hint, { color: tint }]}>{hint}</Text>}
    </View>
  );
}

const tile = StyleSheet.create({
  wrap: {
    flex: 1,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    minHeight: 118,
    justifyContent: 'center',
  },
  bubble: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  value: { ...typography.h2 },
  label: { ...typography.tiny, marginTop: 2, lineHeight: 14 },
  hint: { ...typography.tiny, fontWeight: '800', marginTop: 3 },
});

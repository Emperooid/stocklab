import { Pressable, StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { AppIcon } from '../AppIcon';
import { cardGame, cardRadius } from '../../theme/cardsTheme';
import { formatMoney } from '../../lib/format';

interface AmountPickerProps {
  value: number;
  onChange: (amount: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const PRESETS = [100, 200, 500, 1000];

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

/** Price setter — big ₦ readout, a −/+ stepper, and quick presets. */
export function AmountPicker({
  value,
  onChange,
  min = 100,
  max = 1000,
  step = 50,
  disabled,
  style,
}: AmountPickerProps) {
  return (
    <View style={style}>
      <View style={styles.readout}>
        <Pressable
          disabled={disabled || value <= min}
          onPress={() => onChange(clamp(value - step, min, max))}
          style={[styles.stepBtn, (disabled || value <= min) && styles.stepDisabled]}
          accessibilityLabel="Decrease price"
        >
          <AppIcon name="minus" size={18} color={cardGame.gold} />
        </Pressable>

        <View style={styles.amountWrap}>
          <Text style={styles.amount}>{formatMoney(value)}</Text>
          <Text style={styles.range}>
            {formatMoney(min)} – {formatMoney(max)}
          </Text>
        </View>

        <Pressable
          disabled={disabled || value >= max}
          onPress={() => onChange(clamp(value + step, min, max))}
          style={[styles.stepBtn, (disabled || value >= max) && styles.stepDisabled]}
          accessibilityLabel="Increase price"
        >
          <AppIcon name="plus" size={18} color={cardGame.gold} />
        </Pressable>
      </View>

      <View style={styles.presets}>
        {PRESETS.filter((p) => p >= min && p <= max).map((p) => {
          const active = p === value;
          return (
            <Pressable
              key={p}
              disabled={disabled}
              onPress={() => onChange(p)}
              style={[styles.preset, active && styles.presetActive]}
            >
              <Text style={[styles.presetText, active && styles.presetTextActive]}>{formatMoney(p)}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  readout: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    backgroundColor: cardGame.tableDeep,
    borderWidth: 2,
    borderColor: cardGame.rim,
    borderRadius: cardRadius.chip,
    padding: 10,
  },
  stepBtn: {
    width: 46,
    height: 46,
    borderRadius: cardRadius.chip,
    borderWidth: 2,
    borderColor: cardGame.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDisabled: { opacity: 0.35 },
  amountWrap: { flex: 1, alignItems: 'center' },
  amount: { color: cardGame.cream, fontSize: 26, fontWeight: '900' },
  range: { color: cardGame.textDim, fontSize: 11, fontWeight: '700', marginTop: 1 },
  presets: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  preset: {
    borderRadius: cardRadius.pill,
    borderWidth: 1.5,
    borderColor: cardGame.rim,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  presetActive: { backgroundColor: cardGame.gold, borderColor: cardGame.gold },
  presetText: { color: cardGame.textMuted, fontSize: 12.5, fontWeight: '800' },
  presetTextActive: { color: cardGame.ink },
});

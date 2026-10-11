import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { Colors, radius, useColors } from '../../theme/theme';

interface FigurePickerProps {
  value: number | null;
  onChange: (figure: number) => void;
  disabled?: boolean;
  /** Revealed figures (result screens) render green/red instead of gold. */
  outcomes?: Record<number, 'win' | 'lose'>;
  style?: StyleProp<ViewStyle>;
}

const FIGURES = [1, 2, 3, 4, 5];

/** Same per-value palette as Stock's figure picker, so "1-5" reads as the same idea in both games. */
function valueColor(colors: Colors, value: number): string {
  const palette = [colors.blue, colors.success, colors.danger, colors.warning, colors.purple];
  return palette[(value - 1) % palette.length];
}

/** The 1–5 figure selector, as a row of chunky card-table tiles. */
export function FigurePicker({ value, onChange, disabled, outcomes, style }: FigurePickerProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.row, style]}>
      {FIGURES.map((f) => {
        const selected = value === f;
        const outcome = outcomes?.[f];
        const tint = valueColor(colors, f);
        return (
          <Pressable
            key={f}
            disabled={disabled}
            onPress={() => onChange(f)}
            accessibilityLabel={`Figure ${f}`}
            style={({ pressed }) => [
              styles.tile,
              { borderColor: tint },
              selected && { backgroundColor: tint },
              outcome === 'win' && styles.tileWin,
              outcome === 'lose' && styles.tileLose,
              disabled && !selected && styles.tileDisabled,
              pressed && !disabled && { transform: [{ scale: 0.95 }] },
            ]}
          >
            <Text
              style={[
                styles.figure,
                { color: tint },
                selected && styles.figureSelected,
                outcome === 'win' && styles.figureWin,
                outcome === 'lose' && styles.figureLose,
              ]}
            >
              {f}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: 8 },
    tile: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: radius.sm,
      borderWidth: 2,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tileWin: { backgroundColor: colors.success, borderColor: colors.success },
    tileLose: { backgroundColor: colors.danger, borderColor: colors.danger },
    tileDisabled: { opacity: 0.4 },
    figure: { fontSize: 22, fontWeight: '900' },
    figureSelected: { color: '#FFFFFF' },
    figureWin: { color: colors.ink },
    figureLose: { color: '#FFFFFF' },
  });
}

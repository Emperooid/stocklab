import { Pressable, StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { cardGame, cardRadius } from '../../theme/cardsTheme';

interface FigurePickerProps {
  value: number | null;
  onChange: (figure: number) => void;
  disabled?: boolean;
  /** Revealed figures (result screens) render green/red instead of gold. */
  outcomes?: Record<number, 'win' | 'lose'>;
  style?: StyleProp<ViewStyle>;
}

const FIGURES = [1, 2, 3, 4, 5];

/** The 1–5 figure selector, as a row of chunky card-table tiles. */
export function FigurePicker({ value, onChange, disabled, outcomes, style }: FigurePickerProps) {
  return (
    <View style={[styles.row, style]}>
      {FIGURES.map((f) => {
        const selected = value === f;
        const outcome = outcomes?.[f];
        return (
          <Pressable
            key={f}
            disabled={disabled}
            onPress={() => onChange(f)}
            accessibilityLabel={`Figure ${f}`}
            style={({ pressed }) => [
              styles.tile,
              selected && styles.tileSelected,
              outcome === 'win' && styles.tileWin,
              outcome === 'lose' && styles.tileLose,
              disabled && !selected && styles.tileDisabled,
              pressed && !disabled && { transform: [{ scale: 0.95 }] },
            ]}
          >
            <Text
              style={[
                styles.figure,
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

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  tile: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: cardRadius.chip,
    borderWidth: 2,
    borderColor: cardGame.rim,
    backgroundColor: cardGame.tableDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileSelected: { backgroundColor: cardGame.gold, borderColor: cardGame.goldDeep },
  tileWin: { backgroundColor: cardGame.success, borderColor: cardGame.successDeep },
  tileLose: { backgroundColor: cardGame.danger, borderColor: cardGame.dangerDeep },
  tileDisabled: { opacity: 0.4 },
  figure: { color: cardGame.gold, fontSize: 22, fontWeight: '900' },
  figureSelected: { color: cardGame.ink },
  figureWin: { color: cardGame.ink },
  figureLose: { color: '#FFFFFF' },
});

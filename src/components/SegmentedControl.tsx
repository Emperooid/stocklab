import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { IconName } from '../theme/icons';
import { Colors, radius, shadow, spacing, typography, useColors } from '../theme/theme';

interface Option<T extends string> {
  key: T;
  label: string;
  count?: number;
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[];
  value: T;
  onChange: (key: T) => void;
}

/** Chunky pill switcher — the active pill lifts onto a soft shadow. */
export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>) {
  const colors = useColors();
  const styles = createStyles(colors);
  return (
    <View style={styles.track}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <TouchableOpacity
            key={opt.key}
            activeOpacity={0.8}
            onPress={() => onChange(opt.key)}
            style={[styles.pill, active && styles.pillActive]}
          >
            <Text style={[styles.label, { color: active ? colors.onPrimary : colors.textMuted }]} numberOfLines={1}>
              {opt.label}
              {opt.count != null ? ` (${opt.count})` : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** Small inline status chip used inside lists. */
export function MiniChip({ label, color, icon }: { label: string; color: string; icon?: IconName }) {
  return (
    <View style={[chipStyles.chip, { backgroundColor: color + '22' }]}>
      {!!icon && <AppIcon name={icon} size={11} color={color} style={{ marginRight: 3 }} />}
      <Text style={[chipStyles.text, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.pill },
  text: { ...typography.tiny, fontWeight: '800' },
});

function createStyles(colors: Colors) {
  return StyleSheet.create({
    track: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceAlt,
      borderRadius: radius.pill,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pill: {
      flex: 1,
      height: 42,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pillActive: { backgroundColor: colors.primary, ...shadow.sm },
    label: { ...typography.small, fontWeight: '800' },
  });
}

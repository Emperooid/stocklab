import { StyleSheet, Text, View, ViewStyle, StyleProp } from 'react-native';
import { AppIcon } from './AppIcon';
import { IconName } from '../theme/icons';
import { withAlpha } from '../lib/color';
import { Colors, radius, spacing, typography, useColors } from '../theme/theme';

/** Rounded image band used as a page header on secondary screens. */
export function PageHeader({
  title,
  subtitle,
  icon,
  color,
  right,
  style,
}: {
  title: string;
  subtitle?: string;
  icon?: IconName;
  color?: string;
  right?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  const tint = color ?? colors.primary;
  const styles = createStyles(colors);
  return (
    <View style={[styles.wrap, { backgroundColor: withAlpha(tint, 0.1) }, style]}>
      {!!icon && (
        <View style={[styles.bubble, { backgroundColor: tint }]}>
          <AppIcon name={icon} size={26} color="#FFFFFF" />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {!!subtitle && <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  );
}

/** Small dotted "fun" divider. */
export function DotDivider({ color }: { color?: string }) {
  const colors = useColors();
  const c = color ?? colors.border;
  return (
    <View style={styles2.row}>
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={[styles2.dot, { backgroundColor: c }]} />
      ))}
    </View>
  );
}

/** Horizontally scrolling row of rounded chips. */
export function ChipRow({ children }: { children: React.ReactNode }) {
  return <View style={styles2.chipRow}>{children}</View>;
}

export function Chip({ label, active, color, onPress }: { label: string; active?: boolean; color?: string; onPress?: () => void }) {
  const colors = useColors();
  const tint = color ?? colors.primary;
  return (
    <Text
      onPress={onPress}
      style={[
        styles2.chip,
        {
          backgroundColor: active ? tint : colors.surface,
          borderColor: active ? tint : colors.border,
          color: active ? '#FFFFFF' : colors.textMuted,
        },
      ]}
    >
      {label}
    </Text>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      borderRadius: radius.xl,
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },
    bubble: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    title: { ...typography.h2 },
    subtitle: { ...typography.small, marginTop: 3, lineHeight: 18 },
  });
}

const styles2 = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginVertical: spacing.md },
  dot: { width: 6, height: 6, borderRadius: 3, opacity: 0.7 },
  chipRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  chip: {
    ...typography.small,
    fontWeight: '800',
    overflow: 'hidden',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
});

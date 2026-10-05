import { StyleSheet, Text, View } from 'react-native';
import { AppIcon } from './AppIcon';
import { radius, spacing, typography, useColors } from '../theme/theme';

export function FormError({ message }: { message: string }) {
  const colors = useColors();
  if (!message) return null;
  return (
    <View style={[styles.wrap, { backgroundColor: colors.dangerTint, borderColor: colors.danger + '44' }]}>
      <AppIcon name="alert" size={17} color={colors.danger} />
      <Text style={[styles.text, { color: colors.danger }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  text: { ...typography.small, flex: 1, fontWeight: '600', lineHeight: 18 },
});

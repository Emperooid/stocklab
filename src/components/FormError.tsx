import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, radius, spacing, typography, useColors } from '../theme/theme';

export function FormError({ message }: { message: string }) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  if (!message) return null;
  return (
    <View style={styles.wrap}>
      <Ionicons name="alert-circle" size={16} color={colors.danger} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      backgroundColor: colors.dangerTint,
      borderRadius: radius.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    text: { ...typography.small, color: colors.danger, flex: 1 },
  });
}

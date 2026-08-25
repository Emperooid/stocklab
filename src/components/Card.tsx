import { useMemo } from 'react';
import { StyleSheet, View, ViewProps } from 'react-native';
import { Colors, radius, shadow, spacing, useColors } from '../theme/theme';

export function Card({ style, children, ...rest }: ViewProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      ...shadow.sm,
    },
  });
}

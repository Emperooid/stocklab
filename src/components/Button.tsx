import { useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  GestureResponderEvent,
  Pressable,
  PressableProps,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { Colors, radius, spacing, typography, useColors } from '../theme/theme';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, variant = 'primary', size = 'md', loading, style, disabled, onPressIn, onPressOut, ...rest }: ButtonProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isDisabled = disabled || loading;

  function handlePressIn(e: GestureResponderEvent) {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 0 }).start();
    onPressIn?.(e);
  }

  function handlePressOut(e: GestureResponderEvent) {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
    onPressOut?.(e);
  }

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        style={[
          styles.base,
          size === 'sm' && styles.baseSm,
          styles[variant],
          isDisabled && styles.disabled,
          style,
        ]}
        disabled={isDisabled}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? colors.onPrimary : colors.primary} />
        ) : (
          <Text style={[styles.text, size === 'sm' && styles.textSm, TEXT_STYLE(colors)[variant]]} numberOfLines={1}>
            {title}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const TEXT_STYLE = (colors: Colors) => ({
  primary: { color: colors.onPrimary },
  danger: { color: colors.onPrimary },
  outline: { color: colors.primary },
  ghost: { color: colors.primary },
});

function createStyles(colors: Colors) {
  return StyleSheet.create({
    base: {
      height: 50,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    baseSm: { height: 40, paddingHorizontal: spacing.md },
    primary: { backgroundColor: colors.primary },
    danger: { backgroundColor: colors.danger },
    outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
    ghost: { backgroundColor: 'transparent' },
    disabled: { opacity: 0.5 },
    text: { ...typography.h3 },
    textSm: { fontSize: typography.body.fontSize },
  });
}

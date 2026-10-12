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
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, radius, spacing, typography, useColors } from '../theme/theme';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'md' | 'sm';
  loading?: boolean;
  disabled?: boolean;
  /** Leading glyph, as the auth mockups show on Log In, Send Code and the biometric button. */
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}

export function Button({ title, variant = 'primary', size = 'md', loading, style, disabled, icon, onPressIn, onPressOut, ...rest }: ButtonProps) {
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
        // Match CardButton: every button is announced by its title unless the
        // caller overrides it. Without this a screen reader just reads "button".
        accessibilityLabel={rest.accessibilityLabel ?? title}
        {...rest}
      >
        {loading ? (
          <ActivityIndicator color={variant === 'primary' || variant === 'danger' ? colors.onPrimary : colors.primary} />
        ) : (
          <View style={styles.content}>
            {icon && (
              <Ionicons
                name={icon}
                size={size === 'sm' ? 15 : 18}
                color={variant === 'primary' || variant === 'danger' ? colors.onPrimary : colors.primary}
              />
            )}
            <Text style={[styles.text, size === 'sm' && styles.textSm, TEXT_STYLE(colors)[variant]]} numberOfLines={1}>
              {title}
            </Text>
          </View>
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
    content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    base: {
      height: 52,
      borderRadius: radius.lg,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    baseSm: { height: 42, paddingHorizontal: spacing.md, borderRadius: radius.md },
    primary: { backgroundColor: colors.primary },
    danger: { backgroundColor: colors.danger },
    outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
    ghost: { backgroundColor: 'transparent' },
    disabled: { opacity: 0.5 },
    text: { ...typography.h3 },
    textSm: { fontSize: typography.body.fontSize },
  });
}

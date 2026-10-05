import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { AppIcon } from './AppIcon';
import { IconName } from '../theme/icons';
import { Colors, radius, spacing, typography, useColors } from '../theme/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  /** Picture icon shown inside the field on the left. */
  leftIcon?: IconName;
  /** Styles the outer wrapper (e.g. `{ flex: 1 }` for side-by-side inputs) — `style` only reaches the TextInput itself. */
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({
  label,
  error,
  leftIcon,
  style,
  containerStyle,
  secureTextEntry,
  onFocus,
  onBlur,
  ...rest
}: InputProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const isPasswordField = !!secureTextEntry;

  return (
    <View style={[styles.wrap, containerStyle]}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.shell,
          focused && { borderColor: colors.primary, backgroundColor: colors.surface },
          !!error && { borderColor: colors.danger },
        ]}
      >
        {!!leftIcon && <AppIcon name={leftIcon} size={18} color={focused ? colors.primary : colors.textDim} style={{ marginRight: spacing.sm }} />}
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.textDim}
          secureTextEntry={isPasswordField && !revealed}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {isPasswordField && (
          <Pressable
            onPress={() => setRevealed((v) => !v)}
            hitSlop={12}
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
            style={styles.eye}
          >
            <AppIcon name={revealed ? 'eye-off' : 'eye'} size={19} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    wrap: { width: '100%' },
    label: { ...typography.small, color: colors.textMuted, marginBottom: spacing.xs, fontWeight: '700' },
    shell: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surfaceAlt,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      height: 56,
    },
    input: { flex: 1, color: colors.text, fontSize: typography.body.fontSize, fontWeight: '600', height: '100%' },
    eye: { paddingLeft: spacing.sm },
    error: { ...typography.small, color: colors.danger, marginTop: spacing.xs, fontWeight: '600' },
  });
}

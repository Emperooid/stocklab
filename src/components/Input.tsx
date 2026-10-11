import { useMemo, useState } from 'react';
import { StyleProp, StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, radius, spacing, typography, useColors } from '../theme/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  /** Styles the outer wrapper (e.g. `{ flex: 1 }` for side-by-side inputs) — `style` only reaches the TextInput itself. */
  containerStyle?: StyleProp<ViewStyle>;
}

export function Input({ label, error, style, containerStyle, secureTextEntry, onFocus, onBlur, ...rest }: InputProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const isPasswordField = !!secureTextEntry;

  return (
    <View style={[styles.wrap, containerStyle]}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            isPasswordField && styles.inputWithIcon,
            focused && styles.inputFocused,
            !!error && styles.inputError,
            style,
          ]}
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
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setRevealed((v) => !v)}
            hitSlop={10}
            accessibilityLabel={revealed ? 'Hide password' : 'Show password'}
          >
            <Ionicons name={revealed ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>
      {!!error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    wrap: { width: '100%' },
    label: { ...typography.small, color: colors.textMuted, marginBottom: spacing.xs },
    inputRow: { position: 'relative', justifyContent: 'center' },
    input: {
      backgroundColor: colors.surfaceAlt,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      height: 50,
      color: colors.text,
      fontSize: typography.body.fontSize,
    },
    inputWithIcon: { paddingRight: 44 },
    inputFocused: { borderColor: colors.primary },
    inputError: { borderColor: colors.danger },
    eyeButton: { position: 'absolute', right: spacing.md, height: 50, justifyContent: 'center' },
    error: { ...typography.small, color: colors.danger, marginTop: spacing.xs },
  });
}

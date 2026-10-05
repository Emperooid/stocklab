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
import { AppIcon } from './AppIcon';
import { IconName } from '../theme/icons';
import { withAlpha } from '../lib/color';
import { Colors, radius, spacing, typography, useColors } from '../theme/theme';

export type ButtonVariant = 'primary' | 'accent' | 'success' | 'danger' | 'outline' | 'ghost' | 'cream';
export type ButtonSize = 'lg' | 'md' | 'sm';

interface ButtonProps extends Omit<PressableProps, 'style'> {
  title: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  /** Optional leading picture icon. */
  icon?: IconName;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

interface Skin {
  face: string;
  base: string;
  text: string;
  border: string;
  icon: string;
}

function skinFor(colors: Colors, variant: ButtonVariant): Skin {
  switch (variant) {
    case 'accent':
      return { face: colors.accent, base: colors.accentDark, text: '#FFFFFF', border: colors.accentDark, icon: '#FFFFFF' };
    case 'success':
      return { face: colors.success, base: '#0B7C39', text: '#FFFFFF', border: '#0B7C39', icon: '#FFFFFF' };
    case 'danger':
      return { face: colors.danger, base: '#C81F27', text: '#FFFFFF', border: '#C81F27', icon: '#FFFFFF' };
    case 'cream':
      return { face: colors.cream, base: '#E7D3BC', text: colors.ink, border: '#E7D3BC', icon: colors.ink };
    case 'outline':
      return { face: 'transparent', base: withAlpha(colors.primary, 0.22), text: colors.primary, border: colors.primary, icon: colors.primary };
    case 'ghost':
      return { face: 'transparent', base: 'transparent', text: colors.primary, border: 'transparent', icon: colors.primary };
    default:
      return { face: colors.primary, base: colors.primaryDark, text: '#FFFFFF', border: colors.primaryDark, icon: '#FFFFFF' };
  }
}

const DEPTH: Record<ButtonSize, number> = { lg: 5, md: 4, sm: 3 };
const HEIGHT: Record<ButtonSize, number> = { lg: 58, md: 52, sm: 44 };

/**
 * Chunky 3-D pressable — a solid face sitting on a darker base that compresses
 * when you push it. This is the app's main "fun" interaction signature.
 */
export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading,
  style,
  disabled,
  icon,
  fullWidth = true,
  onPressIn,
  onPressOut,
  ...rest
}: ButtonProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const skin = skinFor(colors, variant);
  const depth = DEPTH[size];
  const isDisabled = disabled || loading;
  const push = useRef(new Animated.Value(0)).current;

  function handlePressIn(e: GestureResponderEvent) {
    Animated.timing(push, { toValue: 1, duration: 70, useNativeDriver: true }).start();
    onPressIn?.(e);
  }

  function handlePressOut(e: GestureResponderEvent) {
    Animated.spring(push, { toValue: 0, useNativeDriver: true, speed: 24, bounciness: 10 }).start();
    onPressOut?.(e);
  }

  const translateY = push.interpolate({ inputRange: [0, 1], outputRange: [0, depth] });

  return (
    <View style={[styles.wrap, { paddingBottom: isDisabled ? 0 : depth }, fullWidth && styles.full, isDisabled && styles.disabled, style]}>
      {!isDisabled && (
        <View
          pointerEvents="none"
          style={[
            styles.base,
            { top: depth, backgroundColor: skin.base, borderRadius: radius.lg + 2 },
          ]}
        />
      )}
      <Animated.View style={{ transform: [{ translateY }] }}>
        <Pressable
          disabled={isDisabled}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[
            styles.face,
            {
              height: HEIGHT[size],
              backgroundColor: skin.face,
              borderColor: skin.border,
            },
            variant === 'ghost' && styles.ghostFace,
          ]}
          {...rest}
        >
          {loading ? (
            <ActivityIndicator color={skin.text} />
          ) : (
            <>
              {!!icon && <AppIcon name={icon} size={size === 'sm' ? 17 : 19} color={skin.icon} style={{ marginRight: spacing.sm }} />}
              <Text style={[styles.text, { color: skin.text, fontSize: size === 'sm' ? typography.body.fontSize : typography.h3.fontSize }]} numberOfLines={1}>
                {title}
              </Text>
            </>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

function createStyles(_colors: Colors) {
  return StyleSheet.create({
    wrap: { width: '100%' },
    full: { alignSelf: 'stretch' },
    disabled: { opacity: 0.45 },
    base: { position: 'absolute', left: 0, right: 0, bottom: 0 },
    face: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.lg + 2,
      borderWidth: 2,
      paddingHorizontal: spacing.lg,
    },
    ghostFace: { borderWidth: 0 },
    text: { fontWeight: '800' },
  });
}

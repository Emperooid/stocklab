import { useMemo, useRef } from 'react';
import { ActivityIndicator, Animated, GestureResponderEvent, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, radius, useColors, glow } from '../../theme/theme';

type CardButtonVariant = 'gold' | 'magenta' | 'cream' | 'outline' | 'ghost';

interface CardButtonProps {
  title: string;
  onPress?: () => void;
  variant?: CardButtonVariant;
  size?: 'lg' | 'md' | 'sm';
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const DEPTH = { lg: 5, md: 4, sm: 3 } as const;
const HEIGHT = { lg: 58, md: 52, sm: 44 } as const;

/** The card game's own 3-D pressable — themed with the app's primary accent. */
export function CardButton({
  title,
  onPress,
  variant = 'gold',
  size = 'md',
  icon,
  loading,
  disabled,
  fullWidth = true,
  style,
  accessibilityLabel,
}: CardButtonProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const SKINS: Record<CardButtonVariant, { face: string; base: string; text: string; border: string; icon: string }> = useMemo(
    () => ({
      gold: { face: colors.primary, base: colors.primaryDark, text: colors.ink, border: colors.primaryDark, icon: colors.ink },
      magenta: { face: colors.purple, base: colors.purple, text: '#FFFFFF', border: colors.purple, icon: '#FFFFFF' },
      cream: { face: colors.cream, base: colors.cream, text: colors.ink, border: colors.cream, icon: colors.ink },
      outline: { face: 'transparent', base: colors.primaryTint, text: colors.primary, border: colors.primary, icon: colors.primary },
      ghost: { face: 'transparent', base: 'transparent', text: colors.primary, border: 'transparent', icon: colors.primary },
    }),
    [colors]
  );

  const isDisabled = disabled || loading;
  // Disabled reads as a distinct neutral state, not just a faded version of
  // the colorful variant — CONFIRMED low-contrast complaint: the "gold"
  // variant's dark ink text, faded to 45% opacity along with the green face,
  // made "Pick a figure to play" nearly unreadable against the dark page.
  const skin = isDisabled
    ? { face: colors.surfaceAlt, base: colors.surfaceAlt, text: colors.textDim, border: colors.border, icon: colors.textDim }
    : SKINS[variant];
  const depth = DEPTH[size];
  // Only solid faces get the 3-D base — on a transparent face the base would
  // show straight through and read as a muddy filled button.
  const hasBase = variant === 'gold' || variant === 'magenta' || variant === 'cream';
  const push = useRef(new Animated.Value(0)).current;

  function down(_e: GestureResponderEvent) {
    Animated.timing(push, { toValue: 1, duration: 70, useNativeDriver: true }).start();
  }
  function up(_e: GestureResponderEvent) {
    Animated.spring(push, { toValue: 0, useNativeDriver: true, speed: 24, bounciness: 10 }).start();
  }

  const translateY = push.interpolate({ inputRange: [0, 1], outputRange: [0, hasBase ? depth : 0] });

  return (
    <View
      style={[styles.wrap, { paddingBottom: isDisabled || !hasBase ? 0 : depth }, fullWidth && styles.full, style]}
    >
      {!isDisabled && hasBase && (
        <View pointerEvents="none" style={[styles.base, { top: depth, backgroundColor: skin.base, borderRadius: radius.lg + 2 }]} />
      )}
      <Animated.View style={{ transform: [{ translateY }] }}>
        <Pressable
          onPress={onPress}
          disabled={isDisabled}
          onPressIn={down}
          onPressOut={up}
          accessibilityLabel={accessibilityLabel ?? title}
          style={[
            styles.face,
            { height: HEIGHT[size], backgroundColor: skin.face, borderColor: skin.border },
            !isDisabled && variant === 'gold' && glow(colors.primary),
            variant === 'ghost' && styles.ghostFace,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={skin.text} />
          ) : (
            <>
              {!!icon && <Ionicons name={icon} size={size === 'sm' ? 16 : 18} color={skin.icon} style={{ marginRight: 8 }} />}
              <Text style={[styles.text, { color: skin.text, fontSize: size === 'sm' ? 13.5 : 16 }]} numberOfLines={1}>
                {title}
              </Text>
            </>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    wrap: { width: '100%' },
    full: { alignSelf: 'stretch' },
    base: { position: 'absolute', left: 0, right: 0, bottom: 0 },
    face: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.lg + 2,
      borderWidth: 2,
      paddingHorizontal: 16,
    },
    ghostFace: { borderWidth: 0 },
    text: { fontWeight: '900' },
  });
}

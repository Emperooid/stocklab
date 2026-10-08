import { useMemo, useRef } from 'react';
import { ActivityIndicator, Animated, GestureResponderEvent, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { AppIcon } from '../AppIcon';
import { IconName } from '../../theme/icons';
import { cardGame, cardRadius, goldGlow } from '../../theme/cardsTheme';

type CardButtonVariant = 'gold' | 'magenta' | 'cream' | 'outline' | 'ghost';

interface CardButtonProps {
  title: string;
  onPress?: () => void;
  variant?: CardButtonVariant;
  size?: 'lg' | 'md' | 'sm';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const SKINS: Record<CardButtonVariant, { face: string; base: string; text: string; border: string; icon: string }> = {
  gold: { face: cardGame.gold, base: cardGame.goldDeep, text: cardGame.ink, border: cardGame.goldDeep, icon: cardGame.ink },
  magenta: { face: cardGame.magenta, base: cardGame.magentaDeep, text: '#FFFFFF', border: cardGame.magentaDeep, icon: '#FFFFFF' },
  cream: { face: cardGame.cream, base: cardGame.creamDeep, text: cardGame.ink, border: cardGame.creamDeep, icon: cardGame.ink },
  outline: { face: 'transparent', base: 'rgba(247,183,51,0.22)', text: cardGame.gold, border: cardGame.gold, icon: cardGame.gold },
  ghost: { face: 'transparent', base: 'transparent', text: cardGame.gold, border: 'transparent', icon: cardGame.gold },
};

const DEPTH = { lg: 5, md: 4, sm: 3 } as const;
const HEIGHT = { lg: 58, md: 52, sm: 44 } as const;

/** The card game's own 3-D pressable — gold on the felt, not the app's violet. */
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
  const skin = SKINS[variant];
  const depth = DEPTH[size];
  const isDisabled = disabled || loading;
  const push = useRef(new Animated.Value(0)).current;

  function down(_e: GestureResponderEvent) {
    Animated.timing(push, { toValue: 1, duration: 70, useNativeDriver: true }).start();
  }
  function up(_e: GestureResponderEvent) {
    Animated.spring(push, { toValue: 0, useNativeDriver: true, speed: 24, bounciness: 10 }).start();
  }

  const translateY = push.interpolate({ inputRange: [0, 1], outputRange: [0, depth] });

  return (
    <View style={[styles.wrap, { paddingBottom: isDisabled ? 0 : depth }, fullWidth && styles.full, isDisabled && styles.disabled, style]}>
      {!isDisabled && (
        <View pointerEvents="none" style={[styles.base, { top: depth, backgroundColor: skin.base, borderRadius: cardRadius.card + 2 }]} />
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
            variant === 'gold' && goldGlow(0.3),
            variant === 'ghost' && styles.ghostFace,
          ]}
        >
          {loading ? (
            <ActivityIndicator color={skin.text} />
          ) : (
            <>
              {!!icon && <AppIcon name={icon} size={size === 'sm' ? 16 : 18} color={skin.icon} style={{ marginRight: 8 }} />}
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

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  full: { alignSelf: 'stretch' },
  disabled: { opacity: 0.45 },
  base: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  face: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: cardRadius.card + 2,
    borderWidth: 2,
    paddingHorizontal: 16,
  },
  ghostFace: { borderWidth: 0 },
  text: { fontWeight: '900' },
});

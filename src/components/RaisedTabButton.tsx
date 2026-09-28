import { useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Colors, moderateScale, shadow, typography, useColors } from '../theme/theme';

interface RaisedTabButtonProps extends BottomTabBarButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

// A low scaling factor keeps this a floating action button rather than
// letting it balloon on tablets the way body text intentionally does.
const SIZE = moderateScale(54, 0.2);
const HALO_SIZE = SIZE + 16;

export function RaisedTabButton({
  icon,
  label,
  onPress,
  accessibilityState,
  testID,
  'aria-selected': ariaSelected,
}: RaisedTabButtonProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  // This react-navigation version reports tab focus via the `aria-selected`
  // prop, not the older `accessibilityState.selected` — this button never
  // actually detected its own focus until this was added (it always fell
  // back to the unfocused/gray look, even while on the Predict/Stock tab).
  const focused = !!accessibilityState?.selected || !!ariaSelected;
  const pressScale = useRef(new Animated.Value(1)).current;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable
        testID={testID}
        accessibilityState={accessibilityState}
        aria-selected={ariaSelected}
        onPress={onPress}
        onPressIn={() => Animated.spring(pressScale, { toValue: 0.92, useNativeDriver: true, speed: 40 }).start()}
        onPressOut={() => Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start()}
        style={styles.pressable}
      >
        <View style={styles.halo}>
          <Animated.View
            style={[
              styles.circle,
              shadow.md,
              { backgroundColor: focused ? colors.primary : colors.surfaceRaised, transform: [{ scale: pressScale }] },
            ]}
          >
            <Ionicons name={icon} size={24} color={focused ? colors.onPrimary : colors.textMuted} />
          </Animated.View>
        </View>
        <Text style={[styles.label, { color: focused ? colors.primary : colors.textDim }]}>{label}</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    wrap: { flex: 1, alignItems: 'center' },
    pressable: { alignItems: 'center', top: -18 },
    // A step lighter than the (flat, blended) tab bar behind it — gives the
    // button local presence without boxing the whole bar in a distinct
    // surface color, which read as an unwanted "border" at its edges.
    halo: {
      width: HALO_SIZE,
      height: HALO_SIZE,
      borderRadius: HALO_SIZE / 2,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    circle: {
      width: SIZE,
      height: SIZE,
      borderRadius: SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: { ...typography.tiny, fontWeight: '700', marginTop: 4 },
  });
}

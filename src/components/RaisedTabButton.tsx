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

export function RaisedTabButton({ icon, label, onPress, accessibilityState, testID }: RaisedTabButtonProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const focused = !!accessibilityState?.selected;
  const pressScale = useRef(new Animated.Value(1)).current;

  return (
    <View style={styles.wrap} pointerEvents="box-none">
      <Pressable
        testID={testID}
        accessibilityState={accessibilityState}
        onPress={onPress}
        onPressIn={() => Animated.spring(pressScale, { toValue: 0.92, useNativeDriver: true, speed: 40 }).start()}
        onPressOut={() => Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start()}
        style={styles.pressable}
      >
        <Animated.View
          style={[
            styles.circle,
            shadow.md,
            { backgroundColor: focused ? colors.primary : colors.surfaceRaised, transform: [{ scale: pressScale }] },
          ]}
        >
          <Ionicons name={icon} size={24} color={focused ? colors.onPrimary : colors.textMuted} />
        </Animated.View>
        <Text style={[styles.label, { color: focused ? colors.primary : colors.textDim }]}>{label}</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    wrap: { flex: 1, alignItems: 'center' },
    pressable: { alignItems: 'center', top: -14 },
    circle: {
      width: SIZE,
      height: SIZE,
      borderRadius: SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: colors.background,
    },
    label: { ...typography.tiny, fontWeight: '700', marginTop: 4 },
  });
}

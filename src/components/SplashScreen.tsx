import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { darkColors, spacing, typography } from '../theme/theme';

/** Matches app.json's expo-splash-screen backgroundColor, so the native splash
 *  hands off to this one without a visible seam. */
const SPLASH_BG = '#080D15';

/**
 * The branded splash, shown on every cold start before the app decides between
 * Auth (login/signup) and the main stack.
 *
 * The expo-splash-screen plugin's native splash only exists in a real build and
 * auto-hides the instant the JS bundle loads, and Expo Go shows no splash at all
 * — so app startup used to be a bare spinner on a plain background.
 *
 * Deliberately the dark palette rather than useColors(): a splash is the app's
 * identity, not one of its themes. Following the theme here would mean a light
 * splash behind a dark native one on light-mode devices, which is exactly the
 * flash this is meant to remove.
 *
 * No spinner either — a splash is a welcome, and the app is only ever a moment
 * from here. The mark rises and fades in so it reads as intentional rather than
 * a stalled frame.
 */
export function SplashScreen() {
  const styles = useMemo(() => createStyles(), []);
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 450,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, rise]);

  return (
    <View style={styles.root}>
      <Animated.View style={[styles.mark, { opacity: fade, transform: [{ translateY: rise }] }]}>
        <Image source={require('../../assets/icon.png')} style={styles.icon} resizeMode="contain" />
        {/* Same lockup as the login and signup headers, so the splash hands off
            to them without the branding shifting. */}
        <Text style={styles.name}>CrowdStock</Text>
        <Text style={styles.tagline}>PREDICT · PLAY · PROSPER</Text>
      </Animated.View>
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: SPLASH_BG,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    mark: { alignItems: 'center' },
    icon: { width: 112, height: 112, borderRadius: 26, marginBottom: spacing.lg },
    name: { ...typography.h1, color: darkColors.primary, letterSpacing: 0.2 },
    tagline: { ...typography.tiny, color: darkColors.textMuted, letterSpacing: 2, marginTop: spacing.xs },
  });
}

import { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, AppState, AppStateStatus, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme, Theme } from '@react-navigation/native';
import { AuthNavigator } from './AuthNavigator';
import { MainStack } from './MainStack';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useWalletStore } from '../store/walletStore';
import { useRoundsStore } from '../store/roundsStore';
import { Colors, spacing, typography, useColors } from '../theme/theme';
import { isBackendConfigured } from '../config/backend';

function buildNavTheme(colors: Colors, mode: 'light' | 'dark'): Theme {
  const base = mode === 'dark' ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      background: colors.background,
      card: colors.surface,
      border: colors.border,
      primary: colors.primary,
      text: colors.text,
    },
  };
}

export function RootNavigator() {
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const colors = useColors();
  const mode = useThemeStore((s) => s.mode);
  const navTheme = useMemo(() => buildNavTheme(colors, mode), [colors, mode]);
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    if (hasHydrated && user) {
      refreshUser().catch(() => {});
    }
  }, [hasHydrated]);

  // Deposits/withdrawals complete on an external page opened via
  // Linking.openURL (a hosted checkout, not an in-app WebView), so
  // returning to the app is an app-foreground event, not a screen-focus
  // event — whichever tab happened to be showing when the app was
  // backgrounded never re-fires its own useFocusEffect refresh. CONFIRMED
  // live: balance genuinely didn't update after a completed deposit until
  // manually pulling to refresh. Refreshing on every foreground (not just
  // right after a deposit) also covers a round settling while away.
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    if (!user) return;
    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        useWalletStore.getState().refresh().catch(() => {});
        useRoundsStore.getState().fetchRounds().catch(() => {});
      }
      appState.current = next;
    });
    return () => subscription.remove();
  }, [user]);

  if (!hasHydrated) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  // CONFIRMED live cause of "Could not reach the server" on an installed
  // APK that works fine in Expo Go: EXPO_PUBLIC_* vars are baked into the
  // JS bundle at BUILD time, not read from the device at runtime. .env is
  // (correctly) gitignored, so unless these three are also set as EAS
  // Environment Variables for the build profile used, an EAS-built APK
  // bundles BACKEND_BASE_URL as an empty string — every request then hits
  // a malformed URL and fails at the network layer, which reads exactly
  // like a real connectivity problem even though it never touches the
  // network. Surfacing this distinctly instead of letting it masquerade as
  // "check your internet connection".
  if (!isBackendConfigured()) {
    return (
      <View style={styles.splash}>
        <Text style={styles.configTitle}>App isn't configured</Text>
        <Text style={styles.configBody}>
          This build is missing its backend connection details. This isn't a network problem — the app needs to
          be rebuilt with EXPO_PUBLIC_BACKEND_BASE_URL and the auth credentials set as EAS Environment Variables
          for this build profile.
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      {user ? <MainStack /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    splash: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
    configTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.sm },
    configBody: { ...typography.small, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
  });
}

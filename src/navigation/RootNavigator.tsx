import { useEffect, useMemo, useRef } from 'react';
import { ActivityIndicator, AppState, AppStateStatus, Image, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer, DarkTheme, DefaultTheme, Theme } from '@react-navigation/native';
import { AuthNavigator } from './AuthNavigator';
import { MainStack } from './MainStack';
import { OnboardingCarousel } from '../components/OnboardingCarousel';
import { AlertPopup } from '../components/AlertPopup';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { useWalletStore } from '../store/walletStore';
import { useRoundsStore } from '../store/roundsStore';
import { useTourStore } from '../store/tourStore';
import { useAlertPopupStore } from '../store/alertPopupStore';
import { Colors, spacing, typography, useColors } from '../theme/theme';
import { isBackendConfigured } from '../config/backend';
import { navigationRef } from '../lib/navigationRef';
import { useAutoPlayStore } from '../store/autoPlayStore';

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
      // Loaded here (not just on Predict's own focus) so Home's Auto Play
      // summary card has real data the moment the app opens, regardless of
      // which tab the user lands on first. The backend now fully owns
      // submitting/settling Auto Play rounds after A1 — the client no longer
      // runs its own close-time engine, this is purely for display.
      useAutoPlayStore.getState().loadFromServer().catch(() => {});
    }
  }, [hasHydrated]);

  // Auto-start onboarding once, for a user who's never seen it — guarded by
  // a ref (not just hasCompletedTour) so a later refreshUser() re-render
  // can't retrigger it while it's already showing.
  const pendingPopupsCount = useAlertPopupStore((s) => s.pendingPopups.length);
  const tourAutoStarted = useRef(false);
  useEffect(() => {
    if (!hasHydrated || !user || tourAutoStarted.current) return;
    if (useTourStore.getState().hasCompletedTour) return;
    // Let any alert/news popup from this login get seen and dismissed first
    // — stacking the carousel's own full-screen modal on top of it would bury it.
    if (pendingPopupsCount > 0) return;
    tourAutoStarted.current = true;
    const timer = setTimeout(() => useTourStore.getState().startTour(), 600);
    return () => clearTimeout(timer);
  }, [hasHydrated, user, pendingPopupsCount]);

  // A virtual-account deposit lands via a bank transfer, not an in-app
  // action, so the balance can change while the app is merely backgrounded
  // — no screen-focus event fires for that. Refreshing on every foreground
  // (not just after a specific action) covers both that and a round
  // settling while away. CONFIRMED live (from the old checkout-based
  // deposit flow, same underlying gap): balance genuinely didn't update
  // until manually pulling to refresh without this.
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
        <Image source={require('../../assets/icon.png')} style={styles.splashLogo} resizeMode="contain" />
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
    <NavigationContainer ref={navigationRef} theme={navTheme}>
      {user ? <MainStack /> : <AuthNavigator />}
      {user && <AlertPopup />}
      {user && <OnboardingCarousel />}
    </NavigationContainer>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    splash: { flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
    splashLogo: { width: 96, height: 96, borderRadius: 22, marginBottom: spacing.xl },
    configTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.sm },
    configBody: { ...typography.small, color: colors.textMuted, textAlign: 'center', lineHeight: 18 },
  });
}

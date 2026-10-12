import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ImageSourcePropType } from 'react-native';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, layout, spacing, typography, useColors } from '../theme/theme';
import { navigationRef } from '../lib/navigationRef';
import { refreshAppData } from '../lib/refresh';
import { useAuthStore } from '../store/authStore';
import { KeyboardScrollContext } from '../lib/keyboardScroll';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Pull-to-refresh. Omit it and the pull reloads every cached store instead. */
  /** Hides the "Other Games" strip — only for screens that come before a game is picked (auth). */
  hideGameSwitcher?: boolean;
  /**
   * Full-bleed artwork behind the content, replacing the default orbs. The auth
   * screens have a designed background the orbs only approximate.
   */
  background?: ImageSourcePropType;
}

/**
 * Jumps back to the game picker lobby from anywhere, regardless of how deep
 * the current screen is nested (inside a game's own tab navigator, or a
 * detail screen pushed on top of one) — going through `navigationRef`
 * sidesteps having to walk `getParent()` up from each call site. CONFIRMED
 * user-reported dead end: once inside a game space there was no way back to
 * the lobby to switch games at all.
 */
function GameSwitcherBar({ colors }: { colors: Colors }) {
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      style={({ pressed }) => [styles.switcherBar, pressed && { opacity: 0.6 }]}
      onPress={() => navigationRef.isReady() && navigationRef.navigate('GamePicker' as never)}
      accessibilityLabel="Check other games"
    >
      <Ionicons name="apps" size={15} color={colors.onPrimary} />
      <Text style={styles.switcherText}>Other Games</Text>
    </Pressable>
  );
}

export function Screen({
  children,
  scroll = true,
  style,
  refreshing,
  onRefresh,
  hideGameSwitcher,
  background,
}: ScreenProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const hasSession = useAuthStore((s) => !!s.user);
const [pullBusy, setPullBusy] = useState(false);

  // How much room the keyboard is taking. Input scrolls the focused field up
  // (see keyboardScroll), but the content also has to be able to scroll at all
  // past the keyboard — otherwise a form shorter than the screen cannot move,
  // and its lower fields are simply unreachable.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Every screen pulls to refresh, not just the handful that wired their own.
  // Without an onRefresh the pull reloads everything the app caches from the
  // backend — see refreshAppData — so a page with nothing specific to reload
  // still fetches real data rather than spinning for nothing.
  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh();
      return;
    }
    setPullBusy(true);
    refreshAppData().finally(() => setPullBusy(false));
  }, [onRefresh]);

  // The auth screens have no session, so there is nothing to pull for.
  const canPull = onRefresh != null || hasSession;
  const refreshControl = canPull ? (
    <RefreshControl
      refreshing={!!(refreshing || pullBusy)}
      onRefresh={handleRefresh}
      tintColor={colors.primary}
      colors={[colors.primary]}
    />
  ) : undefined;

  // The artwork sits OUTSIDE the SafeAreaView so it covers the status bar too.
  // Inside it, the safe-area padding inset the image and left a black band
  // across the top of every screen that used one.
  const backdrop = background ? (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image source={background} style={StyleSheet.absoluteFill} resizeMode="cover" />
    </View>
  ) : null;
  const orbs = (
    <>
      <View pointerEvents="none" style={[styles.orb, styles.orbTop]} />
      <View pointerEvents="none" style={[styles.orb, styles.orbBottom]} />
    </>
  );
  const safeStyle = [styles.safe, !!background && styles.clear];

  if (!scroll) {
    return (
      <View style={styles.root}>
        {backdrop}
        <SafeAreaView style={safeStyle}>
          <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.flex}>
              {!background && orbs}
              {!hideGameSwitcher && <GameSwitcherBar colors={colors} />}
              <View style={[styles.flex, styles.content, styles.centered, style]}>{children}</View>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {backdrop}
      <SafeAreaView style={safeStyle}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.flex}>
            {!background && orbs}
            {!hideGameSwitcher && <GameSwitcherBar colors={colors} />}
            <KeyboardScrollContext.Provider value={scrollRef}>
              <ScrollView
                ref={scrollRef}
                style={[styles.container, !!background && styles.clear]}
                contentContainerStyle={[
                  styles.content,
                  styles.centered,
                  style,
                  // Room to scroll the last field clear of the keyboard.
                  keyboardHeight > 0 && { paddingBottom: spacing.xxl + keyboardHeight },
                ]}
                showsVerticalScrollIndicator={false}
                refreshControl={refreshControl}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
              >
                {children}
              </ScrollView>
            </KeyboardScrollContext.Provider>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    safe: { flex: 1, backgroundColor: colors.background },
    clear: { backgroundColor: 'transparent' },
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: colors.background },
    // The ScrollView is a sibling painted over the artwork, so its own opaque
    // background hid the designed background on every screen that passes one —
    // the waves simply never appeared.

    content: { padding: spacing.lg, paddingBottom: spacing.xxl },
    centered: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
    orb: { position: 'absolute', width: 220, height: 220, borderRadius: 110, opacity: 0.22 },
    orbTop: { top: -125, right: -80, backgroundColor: colors.primaryTint },
    orbBottom: { bottom: -145, left: -95, backgroundColor: colors.blueTint },
    switcherBar: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-end',
      gap: 6,
      backgroundColor: colors.primary,
      borderRadius: 999,
      paddingHorizontal: spacing.md,
      paddingVertical: 7,
      marginHorizontal: spacing.lg,
      marginTop: spacing.sm,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 4,
    },
    switcherText: { ...typography.small, color: colors.onPrimary, fontWeight: '800' },
  });
}

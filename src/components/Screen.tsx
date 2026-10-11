import React, { useMemo } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, layout, spacing, typography, useColors } from '../theme/theme';
import { navigationRef } from '../lib/navigationRef';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
  /** Hides the "Other Games" strip — only for screens that come before a game is picked (auth). */
  hideGameSwitcher?: boolean;
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

export function Screen({ children, scroll = true, style, refreshing, onRefresh, hideGameSwitcher }: ScreenProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const refreshControl =
    onRefresh != null ? (
      <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />
    ) : undefined;

  if (!scroll) {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.flex}>
            <View pointerEvents="none" style={[styles.orb, styles.orbTop]} />
            <View pointerEvents="none" style={[styles.orb, styles.orbBottom]} />
            {!hideGameSwitcher && <GameSwitcherBar colors={colors} />}
            <View style={[styles.flex, styles.content, styles.centered, style]}>{children}</View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.flex}>
          <View pointerEvents="none" style={[styles.orb, styles.orbTop]} />
          <View pointerEvents="none" style={[styles.orb, styles.orbBottom]} />
          {!hideGameSwitcher && <GameSwitcherBar colors={colors} />}
          <ScrollView
            style={styles.container}
            contentContainerStyle={[styles.content, styles.centered, style]}
            showsVerticalScrollIndicator={false}
            refreshControl={refreshControl}
            keyboardShouldPersistTaps="handled"
          >
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: colors.background },
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

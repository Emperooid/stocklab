import React, { useMemo } from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, layout, spacing, useColors } from '../theme/theme';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export function Screen({ children, scroll = true, style, refreshing, onRefresh }: ScreenProps) {
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
  });
}

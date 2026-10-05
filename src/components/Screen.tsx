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

/**
 * Page shell: warm paper background with two soft colour blobs bleeding off the
 * edges, content capped and centred on tablets.
 */
export function Screen({ children, scroll = true, style, refreshing, onRefresh }: ScreenProps) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const refreshControl =
    onRefresh != null ? (
      <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} progressBackgroundColor={colors.surface} />
    ) : undefined;

  const decor = (
    <>
      <View pointerEvents="none" style={[styles.blob, styles.blobTop]} />
      <View pointerEvents="none" style={[styles.blob, styles.blobSide]} />
      <View pointerEvents="none" style={[styles.blob, styles.blobBottom]} />
    </>
  );

  if (!scroll) {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.flex}>
            {decor}
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
          {decor}
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
    container: { flex: 1, backgroundColor: 'transparent' },
    content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
    centered: { width: '100%', maxWidth: layout.contentMaxWidth, alignSelf: 'center' },
    blob: { position: 'absolute', borderRadius: 999 },
    blobTop: { width: 260, height: 260, top: -140, right: -90, backgroundColor: colors.primary, opacity: 0.09 },
    blobSide: { width: 180, height: 180, top: 220, left: -110, backgroundColor: colors.accent, opacity: 0.1 },
    blobBottom: { width: 300, height: 300, bottom: -170, right: -120, backgroundColor: colors.teal, opacity: 0.09 },
  });
}

import React from 'react';
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { cardGame, cardRadius } from '../../theme/cardsTheme';

interface CardTableScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  refreshing?: boolean;
  onRefresh?: () => void;
}

/**
 * Page shell for the card-duel game. Unlike <Screen> it ignores the app theme:
 * this space is always the felt table — deep navy with soft gold/cyan light
 * bleeding in from the corners.
 */
export function CardTableScreen({ children, scroll = true, style, refreshing, onRefresh }: CardTableScreenProps) {
  const refreshControl =
    onRefresh != null ? (
      <RefreshControl
        refreshing={!!refreshing}
        onRefresh={onRefresh}
        tintColor={cardGame.gold}
        colors={[cardGame.gold]}
        progressBackgroundColor={cardGame.table}
      />
    ) : undefined;

  const decor = (
    <>
      <View pointerEvents="none" style={[styles.glow, styles.glowTop]} />
      <View pointerEvents="none" style={[styles.glow, styles.glowSide]} />
      <View pointerEvents="none" style={[styles.glow, styles.glowBottom]} />
    </>
  );

  if (!scroll) {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.flex, styles.clip]}>
            {decor}
            <View style={[styles.flex, styles.content, style]}>{children}</View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.flex, styles.clip]}>
          {decor}
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[styles.content, style]}
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: cardGame.background },
  flex: { flex: 1 },
  clip: { overflow: 'hidden' },
  content: { padding: 16, paddingBottom: 40, width: '100%', maxWidth: 520, alignSelf: 'center' },
  glow: { position: 'absolute', borderRadius: cardRadius.pill, opacity: 0.16 },
  glowTop: { width: 280, height: 280, top: -150, right: -100, backgroundColor: cardGame.gold },
  glowSide: { width: 200, height: 200, top: 240, left: -120, backgroundColor: cardGame.magenta },
  glowBottom: { width: 320, height: 320, bottom: -190, right: -130, backgroundColor: cardGame.cyan },
});

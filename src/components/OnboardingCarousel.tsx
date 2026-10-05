import { useMemo, useRef, useState } from 'react';
import { Dimensions, Modal, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from './Button';
import { Illustration } from './AppIcon';
import { IconBubble } from './IconBubble';
import { withAlpha } from '../lib/color';
import { Colors, radius, spacing, typography, useColors } from '../theme/theme';
import { useTourStore } from '../store/tourStore';
import { TOUR_STEPS } from '../lib/tourSteps';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * First-login onboarding — a full-screen, swipeable card carousel (swipe
 * either direction, or use Next/Skip). Each slide leads with a picture bubble
 * or hero artwork, matching the rest of the redesign.
 */
export function OnboardingCarousel() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isVisible = useTourStore((s) => s.isVisible);
  const completeTour = useTourStore((s) => s.completeTour);
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);

  if (!isVisible) return null;

  const isLast = page === TOUR_STEPS.length - 1;

  function handleScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setPage(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH));
  }

  function goNext() {
    if (isLast) {
      completeTour();
      return;
    }
    const next = page + 1;
    scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
    setPage(next);
  }

  return (
    <Modal transparent={false} visible animationType="fade" onRequestClose={completeTour}>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.skipRow}>
          <Text style={styles.skipText} onPress={completeTour}>
            Skip
          </Text>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
          style={{ flex: 1 }}
        >
          {TOUR_STEPS.map((step, i) => (
            <View key={i} style={[styles.card, { width: SCREEN_WIDTH }]}>
              {step.illustration ? (
                <Illustration name={step.illustration} size={190} style={{ marginBottom: spacing.xl }} />
              ) : (
                <View style={[styles.art, { backgroundColor: withAlpha(step.color, 0.12) }]}>
                  <IconBubble name={step.icon} size={96} iconSize={46} color={step.color} background="transparent" />
                </View>
              )}
              <Text style={styles.title}>{step.title}</Text>
              <Text style={styles.body}>{step.body}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.dotsRow}>
          {TOUR_STEPS.map((step, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === page ? step.color : colors.border },
                i === page && styles.dotActive,
              ]}
            />
          ))}
        </View>

        <View style={styles.footer}>
          <Button title={isLast ? "Let's go!" : 'Next'} icon={isLast ? 'check' : 'arrow-right'} onPress={goNext} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    skipRow: { alignItems: 'flex-end', paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
    skipText: { ...typography.small, color: colors.textMuted, fontWeight: '800', padding: spacing.sm },
    card: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
    art: {
      width: 190,
      height: 190,
      borderRadius: radius.xxl,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xl,
    },
    title: { ...typography.h1, color: colors.text, textAlign: 'center' },
    body: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md, lineHeight: 22 },
    dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, marginBottom: spacing.lg },
    dot: { width: 8, height: 8, borderRadius: 4 },
    dotActive: { width: 24 },
    footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  });
}

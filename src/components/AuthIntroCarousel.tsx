import { useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from './Button';
import { Colors, radius, spacing, typography, useColors } from '../theme/theme';
import { useIntroStore } from '../store/introStore';

const { width: SCREEN_W } = Dimensions.get('window');

/**
 * Three slides before sign-in, then on to login. Written from the app's own
 * art rather than the supplied "splash screen" files, which carry a StockLab
 * wordmark and a "SPLASH SCREEN 2" caption baked into the pixels.
 */
const SLIDES = [
  {
    key: 'welcome',
    title: 'Welcome to CrowdStock',
    body: 'Predict · Play · Prosper. Two games, one wallet — pick one and start playing.',
    art: null as null | number,
  },
  {
    key: 'hourly',
    title: 'Hourly Cash',
    body: 'Pick a number from 1 to 5 every hour. The closer your number is to the crowd’s average, the more you win.',
    art: require('../../assets/banner-pick-1-5-hourly.jpg') as number,
  },
  {
    key: 'cards',
    title: 'Hide or Guess',
    body: 'Someone hides a number between 1 and 5 behind a card. Guess it right to win the value on the card.',
    art: require('../../assets/banner-hide-a-number.jpg') as number,
  },
];

export function AuthIntroCarousel() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const completeIntro = useIntroStore((s) => s.completeIntro);

  const isLast = page === SLIDES.length - 1;

  function goNext() {
    if (isLast) {
      completeIntro();
      return;
    }
    const next = page + 1;
    setPage(next);
    scrollRef.current?.scrollTo({ x: next * SCREEN_W, animated: true });
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setPage(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
  }

  return (
    <View style={styles.root}>
      <Image source={require('../../assets/auth-background.png')} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.skipRow}>
          {!isLast && (
            <TouchableOpacity onPress={completeIntro} hitSlop={10} accessibilityRole="button" accessibilityLabel="Skip">
              <Text style={styles.skip}>Skip</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScroll}
          style={styles.pager}
        >
          {SLIDES.map((slide) => (
            <View key={slide.key} style={styles.slide}>
              <View style={styles.artWrap}>
                {slide.art ? (
                  <Image source={slide.art} style={styles.art} resizeMode="contain" />
                ) : (
                  <Image source={require('../../assets/logo-mark-badge.png')} style={styles.mark} resizeMode="contain" />
                )}
              </View>
              <Text style={styles.title}>{slide.title}</Text>
              <Text style={styles.body}>{slide.body}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.dots}>
          {SLIDES.map((s, i) => (
            <View key={s.key} style={[styles.dot, i === page && styles.dotActive]} />
          ))}
        </View>

        <Button title={isLast ? 'Get started' : 'Next'} onPress={goNext} style={styles.cta} />
      </SafeAreaView>
    </View>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.background },
    safe: { flex: 1 },
    skipRow: { height: 44, justifyContent: 'center', paddingHorizontal: spacing.lg, alignItems: 'flex-end' },
    skip: { ...typography.small, color: colors.textMuted, fontWeight: '700' },
    pager: { flex: 1 },
    slide: { width: SCREEN_W, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
    artWrap: { height: 210, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl },
    art: { width: SCREEN_W - spacing.xl * 2, height: 190, borderRadius: radius.lg },
    mark: { width: 180, height: 150 },
    title: { ...typography.h1, color: colors.text, textAlign: 'center' },
    body: { ...typography.body, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md, lineHeight: 22 },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.lg },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
    dotActive: { backgroundColor: colors.primary, width: 22 },
    cta: { marginHorizontal: spacing.xl, marginBottom: spacing.lg },
  });
}

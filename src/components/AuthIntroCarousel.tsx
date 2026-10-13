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
 * The edge colour of the supplied splash artwork. The pages letterbox it to fit
 * the screen, and matching this exactly is what makes that letterbox vanish
 * rather than read as bars above and below the picture.
 */
const ART_EDGE = '#015419';

const SLIDES: Array<{ key: string; art?: number; title?: string; body?: string }> = [
  { key: 'splash-1', art: require('../../assets/splash-1.jpg') as number },
  { key: 'splash-2', art: require('../../assets/splash-2.jpg') as number },
  {
    key: 'ready',
    title: 'Ready to play?',
    body: 'Two games, one wallet. Pick one and start playing — your balance is ready when you are.',
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
          {SLIDES.map((slide) =>
            slide.art ? (
              <View key={slide.key} style={styles.slide}>
                {/* resizeMode contain so none of the artwork is cropped; the page
                    behind it is the artwork's own edge colour. */}
                <Image source={slide.art} style={styles.art} resizeMode="contain" />
              </View>
            ) : (
              <View key={slide.key} style={styles.slide}>
                <Image source={require('../../assets/logo-mark-badge.png')} style={styles.mark} resizeMode="contain" />
                <Text style={styles.title}>{slide.title}</Text>
                <Text style={styles.body}>{slide.body}</Text>
              </View>
            )
          )}
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
    root: { flex: 1, backgroundColor: ART_EDGE },
    safe: { flex: 1 },
    skipRow: { height: 40, justifyContent: 'center', paddingHorizontal: spacing.lg, alignItems: 'flex-end' },
    skip: { ...typography.small, color: '#FFFFFF', fontWeight: '800' },
    pager: { flex: 1 },
    slide: { width: SCREEN_W, flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.lg },
    art: { width: '100%', height: '100%' },
    mark: { width: 170, height: 140, marginBottom: spacing.lg },
    title: { ...typography.h1, color: '#FFFFFF', textAlign: 'center' },
    body: { ...typography.body, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: spacing.md, lineHeight: 22 },
    dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginBottom: spacing.md },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)' },
    dotActive: { backgroundColor: '#FFFFFF', width: 22 },
    cta: { marginHorizontal: spacing.xl, marginBottom: spacing.lg },
  });
}

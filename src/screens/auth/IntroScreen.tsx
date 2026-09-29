import { useMemo, useRef, useState } from 'react';
import { Dimensions, NativeScrollEvent, NativeSyntheticEvent, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button } from '../../components/Button';
import { Colors, spacing, typography, useColors } from '../../theme/theme';
import { useIntroStore } from '../../store/introStore';
import { AuthStackParamList } from '../../navigation/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Props = NativeStackScreenProps<AuthStackParamList, 'Intro'>;

const SLIDES: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
  {
    icon: 'trending-up',
    title: 'Bid on great products',
    body: 'Discover quality products and place a bid for the deal you want.',
  },
  {
    icon: 'time',
    title: 'Fresh auctions every day',
    body: 'Explore live product auctions and choose the ones that suit you.',
  },
  {
    icon: 'wallet',
    title: 'We deliver your wins',
    body: 'Win an auction, complete payment, and we deliver your product to your location.',
  },
];

/**
 * First-ever-open, pre-login intro — shown once per device via
 * introStore's persisted flag, before Welcome/Login/Register. Separate from
 * the post-login OnboardingCarousel (which walks a logged-in user through
 * the app's own screens); this one explains what the app *is*, for someone
 * who's never opened it before.
 */
export default function IntroScreen({ navigation }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const scrollRef = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const isLast = page === SLIDES.length - 1;

  function finish() {
    useIntroStore.getState().completeIntro();
    navigation.replace('Welcome');
  }

  function handleScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setPage(Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH));
  }

  function goNext() {
    if (isLast) {
      finish();
      return;
    }
    const next = page + 1;
    scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
    setPage(next);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.skipRow}>
        <Text style={styles.skipText} onPress={finish}>
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
        {SLIDES.map((slide, i) => (
          <View key={i} style={[styles.card, { width: SCREEN_WIDTH }]}>
            <View style={styles.iconCircle}>
              <Ionicons name={slide.icon} size={48} color={colors.onPrimary} />
            </View>
            <Text style={styles.title}>{slide.title}</Text>
            <Text style={styles.body}>{slide.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => (
          <View key={i} style={[styles.dot, i === page && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.footer}>
        <Button title={isLast ? 'Get Started' : 'Next'} onPress={goNext} />
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    skipRow: { alignItems: 'flex-end', paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
    skipText: { ...typography.small, color: colors.textMuted, fontWeight: '600', padding: spacing.sm },
    card: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
    iconCircle: {
      width: 112,
      height: 112,
      borderRadius: 56,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xl,
    },
    title: { ...typography.h2, color: colors.text, textAlign: 'center', marginBottom: spacing.sm },
    body: { ...typography.body, color: colors.textMuted, textAlign: 'center', lineHeight: 22, maxWidth: 300 },
    dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, marginBottom: spacing.lg },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border },
    dotActive: { backgroundColor: colors.primary, width: 22 },
    footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.md },
  });
}

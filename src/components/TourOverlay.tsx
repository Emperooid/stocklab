import { useEffect, useMemo, useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Mask, Rect } from 'react-native-svg';
import { Button } from './Button';
import { Colors, radius, spacing, typography, useColors } from '../theme/theme';
import { useTourStore } from '../store/tourStore';
import { TOUR_STEPS } from '../lib/tourSteps';
import { navigateToTab } from '../lib/navigationRef';
import { measureTourTarget, TourRect } from '../lib/tourRegistry';

const SPOTLIGHT_PAD = 8;
const SPOTLIGHT_RADIUS = 14;

// The mask's cutout is built from several concentric rounded rects, smallest
// (fully opaque = fully clear/bright) drawn last on top of larger, softer
// ones — that's what turns a hard-edged box into a soft glow that fades
// outward into the dimmed backdrop, no SVG blur filter needed (those have
// spotty cross-platform support in react-native-svg).
const FEATHER_RINGS = [
  { extra: 34, opacity: 0.12 },
  { extra: 24, opacity: 0.3 },
  { extra: 15, opacity: 0.55 },
  { extra: 7, opacity: 0.82 },
  { extra: 0, opacity: 1 },
];

// Drawn on top, unmasked — concentric colored strokes standing in for a
// proper box-shadow glow around the highlighted area.
const GLOW_RINGS = [
  { extra: 16, opacity: 0.12, width: 10 },
  { extra: 9, opacity: 0.22, width: 6 },
  { extra: 3, opacity: 0.4, width: 3 },
  { extra: 0, opacity: 0.9, width: 1.5 },
];

const MAX_MEASURE_ATTEMPTS = 25;
const MEASURE_RETRY_MS = 100;
const INITIAL_DELAY_MS = 250;
// Once a target's first found, keep re-measuring at this slower cadence for
// as long as the step is showing, instead of locking in that first result.
// A freshly-mounted tab's layout can still shift after the first committed
// frame (safe-area insets resolve async on Android, fonts/images swap in),
// so a single measurement can land on a stale position — this self-corrects
// without any extra flicker, since state only updates when the rect
// actually changes.
const STABLE_POLL_MS = 400;

function rectsEqual(a: TourRect | null, b: TourRect | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

/**
 * Global spotlight/coach-mark tour, rendered once at the app root. Walks
 * through TOUR_STEPS in order: switches tabs itself (navigateToTab), polls
 * for the target's live on-screen position (targets register themselves via
 * <TourTarget> as they mount), then softly glows around it — a feathered
 * clearing through the dimmed backdrop plus a colored glow ring, rather than
 * a hard-edged box — with an anchored tooltip.
 *
 * Modal deliberately does NOT use statusBarTranslucent: measureInWindow
 * (what TourTarget/tourRegistry use) reports positions in the same
 * coordinate space the rest of the app renders in, which does not extend
 * under the status bar — a translucent modal would shift its own origin to
 * the true top of the screen and throw every measurement off by roughly the
 * status bar's height.
 *
 * If a target never appears (e.g. conditional UI that isn't showing right
 * now), the step is skipped automatically after MAX_MEASURE_ATTEMPTS rather
 * than leaving the tour stuck on a dark screen forever.
 */
export function TourOverlay() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const activeStepIndex = useTourStore((s) => s.activeStepIndex);
  const nextStep = useTourStore((s) => s.nextStep);
  const skipTour = useTourStore((s) => s.skipTour);
  const [rect, setRect] = useState<TourRect | null>(null);

  useEffect(() => {
    if (activeStepIndex == null) {
      setRect(null);
      return;
    }
    const step = TOUR_STEPS[activeStepIndex];
    setRect(null);
    navigateToTab(step.tab);

    let cancelled = false;
    let attemptsWithoutResult = 0;
    let foundOnce = false;
    let lastRect: TourRect | null = null;

    function tick() {
      if (cancelled) return;
      measureTourTarget(step.id).then((r) => {
        if (cancelled) return;
        if (r) {
          foundOnce = true;
          if (!rectsEqual(lastRect, r)) {
            lastRect = r;
            setRect(r);
          }
          // Found it — keep tracking at a relaxed cadence in case layout
          // settles late, rather than stopping here.
          setTimeout(tick, STABLE_POLL_MS);
          return;
        }
        if (!foundOnce) {
          attemptsWithoutResult += 1;
          if (attemptsWithoutResult >= MAX_MEASURE_ATTEMPTS) {
            nextStep();
            return;
          }
        }
        setTimeout(tick, MEASURE_RETRY_MS);
      });
    }

    // Small head start for the tab switch to actually mount the new screen
    // before the first measurement attempt.
    const timer = setTimeout(tick, INITIAL_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeStepIndex]);

  if (activeStepIndex == null) return null;

  const step = TOUR_STEPS[activeStepIndex];
  const isLastStep = activeStepIndex === TOUR_STEPS.length - 1;
  const { width: screenW, height: screenH } = Dimensions.get('window');

  const holeX = rect ? Math.max(rect.x - SPOTLIGHT_PAD, 0) : 0;
  const holeY = rect ? Math.max(rect.y - SPOTLIGHT_PAD, 0) : 0;
  const holeW = rect ? rect.width + SPOTLIGHT_PAD * 2 : 0;
  const holeH = rect ? rect.height + SPOTLIGHT_PAD * 2 : 0;
  const placeBelow = rect ? rect.y + rect.height / 2 < screenH / 2 : true;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={skipTour}>
      <View style={StyleSheet.absoluteFill}>
        {rect ? (
          <Svg width={screenW} height={screenH} style={StyleSheet.absoluteFill}>
            <Defs>
              <Mask id="tourMask">
                <Rect x={0} y={0} width={screenW} height={screenH} fill="#fff" />
                {FEATHER_RINGS.map((ring) => (
                  <Rect
                    key={ring.extra}
                    x={holeX - ring.extra}
                    y={holeY - ring.extra}
                    width={holeW + ring.extra * 2}
                    height={holeH + ring.extra * 2}
                    rx={SPOTLIGHT_RADIUS + ring.extra}
                    fill="#000"
                    fillOpacity={ring.opacity}
                  />
                ))}
              </Mask>
            </Defs>
            <Rect x={0} y={0} width={screenW} height={screenH} fill="rgba(0,0,0,0.78)" mask="url(#tourMask)" />
            {GLOW_RINGS.map((ring) => (
              <Rect
                key={ring.extra}
                x={holeX - ring.extra}
                y={holeY - ring.extra}
                width={holeW + ring.extra * 2}
                height={holeH + ring.extra * 2}
                rx={SPOTLIGHT_RADIUS + ring.extra}
                fill="none"
                stroke={colors.primary}
                strokeOpacity={ring.opacity}
                strokeWidth={ring.width}
              />
            ))}
          </Svg>
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.78)' }]} />
        )}

        {rect && (
          <View
            style={[
              styles.tooltip,
              placeBelow
                ? { top: Math.min(rect.y + rect.height + SPOTLIGHT_PAD + 12, screenH - 200) }
                : { bottom: screenH - rect.y + SPOTLIGHT_PAD + 12 },
              { marginBottom: placeBelow ? 0 : insets.bottom, marginTop: placeBelow ? insets.top : 0 },
            ]}
          >
            <Text style={styles.stepCounter}>
              {activeStepIndex + 1} / {TOUR_STEPS.length}
            </Text>
            <Text style={styles.tooltipTitle}>{step.title}</Text>
            <Text style={styles.tooltipBody}>{step.body}</Text>
            <View style={styles.tooltipActions}>
              <Pressable onPress={skipTour} hitSlop={8}>
                <Text style={styles.skipText}>Skip tour</Text>
              </Pressable>
              <Button title={isLastStep ? 'Done' : 'Next'} size="sm" onPress={nextStep} />
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    tooltip: {
      position: 'absolute',
      left: spacing.lg,
      right: spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
    },
    stepCounter: { ...typography.tiny, color: colors.textDim, fontWeight: '700', letterSpacing: 0.5 },
    tooltipTitle: { ...typography.h3, color: colors.text, marginTop: spacing.xs },
    tooltipBody: { ...typography.small, color: colors.textMuted, marginTop: spacing.xs, lineHeight: 18 },
    tooltipActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: spacing.md,
    },
    skipText: { ...typography.small, color: colors.textDim, fontWeight: '600' },
  });
}

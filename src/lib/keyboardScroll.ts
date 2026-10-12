import { createContext, useCallback, useContext, useRef } from 'react';
import { LayoutChangeEvent, Platform, ScrollView } from 'react-native';

/**
 * The screen's ScrollView, so a field can ask to be brought above the keyboard.
 *
 * Neither platform does this unaided. iOS only moves the focused field for
 * ScrollViews that manage their own insets, and Android's adjustResize shrinks
 * the window without scrolling anything — so a field low on a form ends up
 * behind the keyboard with no way to reach it.
 *
 * Screen provides the ref; Input calls into it on focus.
 */
export const KeyboardScrollContext = createContext<React.RefObject<ScrollView | null> | null>(null);

export function useBringIntoViewOnFocus() {
  const scrollRef = useContext(KeyboardScrollContext);
  const y = useRef(0);

  // Where this field sits inside the scroll content. Only correct for a field
  // that is a direct child of it (or inside a list header, which starts at the
  // top anyway) — which is every form in the app. A field nested deeper would
  // ask for a slightly wrong offset, which scrolls to roughly the right place
  // rather than breaking.
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    y.current = e.nativeEvent.layout.y;
  }, []);

  const onFocus = useCallback(() => {
    // Wait for the keyboard to open and the window to settle, or the scroll is
    // computed against the old, taller viewport.
    setTimeout(() => {
      const scroll = scrollRef?.current;
      if (!scroll) return;
      // A field's own height up from the top leaves room for its label, the
      // text under it, and the keyboard overhang.
      scroll.scrollTo({ y: Math.max(0, y.current - 140), animated: true });
    }, Platform.OS === 'ios' ? 140 : 280);
  }, [scrollRef]);

  return { onLayout, onFocus };
}

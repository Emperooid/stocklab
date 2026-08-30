import { RefObject } from 'react';
import { View } from 'react-native';

export interface TourRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// A plain module-level map (not React state) — screens across different tabs
// mount/unmount their TourTarget wrappers as the user navigates, and the
// overlay only ever needs an imperative "where is this on screen right now"
// lookup at the moment it advances to a step, not a reactive subscription.
const targets = new Map<string, RefObject<View | null>>();

export function registerTourTarget(id: string, ref: RefObject<View | null>) {
  targets.set(id, ref);
}

export function unregisterTourTarget(id: string, ref: RefObject<View | null>) {
  if (targets.get(id) === ref) targets.delete(id);
}

/** Measures a registered target's current on-screen position, or null if it isn't mounted/laid out (yet, or at all — e.g. conditional UI). */
export function measureTourTarget(id: string): Promise<TourRect | null> {
  return new Promise((resolve) => {
    const node = targets.get(id)?.current;
    if (!node || typeof node.measureInWindow !== 'function') {
      resolve(null);
      return;
    }
    node.measureInWindow((x, y, width, height) => {
      resolve(width > 0 && height > 0 ? { x, y, width, height } : null);
    });
  });
}

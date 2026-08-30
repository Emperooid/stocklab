import { useEffect, useRef } from 'react';
import { View, ViewProps } from 'react-native';
import { registerTourTarget, unregisterTourTarget } from '../lib/tourRegistry';

interface TourTargetProps extends ViewProps {
  id: string;
  children: React.ReactNode;
}

/**
 * Marks a piece of UI as a stop on the guided tour — TourOverlay measures
 * this view's live on-screen position (via its ref) to draw the spotlight
 * cutout around it. `collapsable={false}` keeps Android from optimizing the
 * view out of the native hierarchy, which would otherwise break measurement.
 */
export function TourTarget({ id, children, ...rest }: TourTargetProps) {
  const ref = useRef<View>(null);

  useEffect(() => {
    registerTourTarget(id, ref);
    return () => unregisterTourTarget(id, ref);
  }, [id]);

  return (
    <View ref={ref} collapsable={false} {...rest}>
      {children}
    </View>
  );
}

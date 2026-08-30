import { createNavigationContainerRef } from '@react-navigation/native';
import { MainTabParamList } from '../navigation/types';

export const navigationRef = createNavigationContainerRef<any>();

/** Imperatively switches tabs from outside the component tree — used by the guided tour to walk through each tab in order. */
export function navigateToTab(tab: keyof MainTabParamList) {
  if (navigationRef.isReady()) {
    (navigationRef.navigate as (...args: any[]) => void)('MainTabs', { screen: tab });
  }
}

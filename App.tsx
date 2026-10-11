import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as NativeSplash from 'expo-splash-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation/RootNavigator';

// Hold the native splash (real builds only — Expo Go has none) until our own
// splash has had a chance to mount, so the handoff is seamless instead of a
// flash of empty background. Released from an effect in App, so it is always
// let go even if a screen throws on first render — a stuck splash would be far
// worse than a flash.
NativeSplash.preventAutoHideAsync().catch(() => {});

export default function App() {
  useEffect(() => {
    NativeSplash.hideAsync().catch(() => {});
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <RootNavigator />
    </SafeAreaProvider>
  );
}

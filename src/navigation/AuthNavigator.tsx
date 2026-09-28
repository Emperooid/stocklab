import { createNativeStackNavigator } from '@react-navigation/native-stack';
import IntroScreen from '../screens/auth/IntroScreen';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import { AuthStackParamList } from './types';
import { useIntroStore } from '../store/introStore';
import { useAuthStore } from '../store/authStore';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  const hasSeenIntro = useIntroStore((s) => s.hasSeenIntro);
  const hasHydrated = useIntroStore((s) => s.hasHydrated);
  const justLoggedOut = useAuthStore((s) => s.justLoggedOut);

  // Wait for the persisted flag before picking an initial route — starting
  // on Intro then immediately swapping to Welcome (or vice versa) once
  // AsyncStorage resolves would flash the wrong screen for a moment.
  if (!hasHydrated) return null;

  // A just-logged-out user goes straight back to Login, skipping the
  // Create-account-or-Login choice screen — they already have an account
  // and almost always want to log back into it. Consumed once (see the
  // clearJustLoggedOut() effect on LoginScreen) so a later fresh
  // login-then-logout still triggers this every time, not just the first.
  const initialRouteName = justLoggedOut ? 'Login' : hasSeenIntro ? 'Welcome' : 'Intro';

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={initialRouteName}
    >
      <Stack.Screen name="Intro" component={IntroScreen} />
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

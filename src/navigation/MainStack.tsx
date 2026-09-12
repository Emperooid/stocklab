import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabs } from './MainTabs';
import RoundHistoryScreen from '../screens/main/RoundHistoryScreen';
import WithdrawalScreen from '../screens/main/WithdrawalScreen';
import NewsScreen from '../screens/main/NewsScreen';
import InviteScreen from '../screens/main/InviteScreen';
import { MainStackParamList } from './types';
import { typography, useColors } from '../theme/theme';

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainStack() {
  const colors = useColors();
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerTitleStyle: { fontSize: typography.h3.fontSize, fontWeight: typography.h3.fontWeight },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="RoundHistory" component={RoundHistoryScreen} options={{ title: 'Round History' }} />
      <Stack.Screen name="Withdrawal" component={WithdrawalScreen} options={{ title: 'Withdraw' }} />
      <Stack.Screen name="News" component={NewsScreen} options={{ title: 'News & Alerts' }} />
      <Stack.Screen name="Invite" component={InviteScreen} options={{ title: 'Increase Payout' }} />
    </Stack.Navigator>
  );
}

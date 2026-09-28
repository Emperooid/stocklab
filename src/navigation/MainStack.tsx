import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { MainTabs } from './MainTabs';
import WithdrawalScreen from '../screens/main/WithdrawalScreen';
import NewsScreen from '../screens/main/NewsScreen';
import InviteScreen from '../screens/main/InviteScreen';
import LegalScreen from '../screens/main/LegalScreen';
import MyBidsScreen from '../screens/main/MyBidsScreen';
import WinnersScreen from '../screens/main/WinnersScreen';
import { LegalDoc, MainStackParamList } from './types';
import { typography, useColors } from '../theme/theme';

const LEGAL_TITLES: Record<LegalDoc, string> = {
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
  responsible: 'Responsible Use',
};

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
      <Stack.Screen name="Withdrawal" component={WithdrawalScreen} options={{ title: 'Withdraw' }} />
      <Stack.Screen name="News" component={NewsScreen} options={{ title: 'News & Alerts' }} />
      <Stack.Screen name="Invite" component={InviteScreen} options={{ title: 'Increase Payout' }} />
      <Stack.Screen name="MyBids" component={MyBidsScreen} options={{ title: 'My Bids' }} />
      <Stack.Screen name="Winners" component={WinnersScreen} options={{ title: 'Auction Winners' }} />
      <Stack.Screen
        name="Legal"
        component={LegalScreen}
        options={({ route }: { route: RouteProp<MainStackParamList, 'Legal'> }) => ({ title: LEGAL_TITLES[route.params.doc] })}
      />
    </Stack.Navigator>
  );
}

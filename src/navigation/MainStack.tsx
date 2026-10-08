import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { MainTabs } from './MainTabs';
import { CardsTabs } from './CardsTabs';
import GamePickerScreen from '../screens/picker/GamePickerScreen';
import RoundHistoryScreen from '../screens/main/RoundHistoryScreen';
import WithdrawalScreen from '../screens/main/WithdrawalScreen';
import NewsScreen from '../screens/main/NewsScreen';
import InviteScreen from '../screens/main/InviteScreen';
import SetCardScreen from '../screens/cards/SetCardScreen';
import UnveilCardScreen from '../screens/cards/UnveilCardScreen';
import CardResultScreen from '../screens/cards/CardResultScreen';
import { MainStackParamList } from './types';
import { typography, useColors } from '../theme/theme';
import { cardGame } from '../theme/cardsTheme';

const Stack = createNativeStackNavigator<MainStackParamList>();

/**
 * Root stack for a signed-in user.
 *
 *   GamePicker   → the lobby, no navbar at all
 *   RoundsGame   → stock rounds, brings the cream/violet navbar
 *   CardsGame    → card duel, brings the navy/gold navbar
 *
 * Both `<Stack.Screen>`s for the game spaces hide the native header; the game
 * spaces supply their own bars.
 */
export function MainStack() {
  const colors = useColors();
  return (
    <Stack.Navigator
      initialRouteName="GamePicker"
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontSize: typography.h3.fontSize, fontWeight: '800' },
        headerShadowVisible: false,
        headerBackTitle: '',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="GamePicker" component={GamePickerScreen} options={{ headerShown: false }} />

      <Stack.Screen
        name="RoundsGame"
        component={MainTabs}
        options={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
      />

      <Stack.Screen
        name="CardsGame"
        component={CardsTabs}
        options={{ headerShown: false, contentStyle: { backgroundColor: cardGame.background } }}
      />

      {/* stock-rounds details */}
      <Stack.Screen name="RoundHistory" component={RoundHistoryScreen} options={{ title: 'All Results' }} />
      <Stack.Screen name="Withdrawal" component={WithdrawalScreen} options={{ title: 'Withdraw' }} />
      <Stack.Screen name="News" component={NewsScreen} options={{ title: 'News & Alerts' }} />
      <Stack.Screen name="Invite" component={InviteScreen} options={{ title: 'Increase Payout' }} />

      {/* card-duel flow — these draw their own navy headers */}
      <Stack.Screen
        name="SetCard"
        component={SetCardScreen}
        options={{ headerShown: false, contentStyle: { backgroundColor: cardGame.background } }}
      />
      <Stack.Screen
        name="UnveilCard"
        component={UnveilCardScreen}
        options={{ headerShown: false, contentStyle: { backgroundColor: cardGame.background } }}
      />
      <Stack.Screen
        name="CardResult"
        component={CardResultScreen}
        options={{ headerShown: false, contentStyle: { backgroundColor: cardGame.background } }}
      />
    </Stack.Navigator>
  );
}

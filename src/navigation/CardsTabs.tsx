import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import CardsHomeScreen from '../screens/cards/CardsHomeScreen';
import MyCardsScreen from '../screens/cards/MyCardsScreen';
import PlayCardsScreen from '../screens/cards/PlayCardsScreen';
import RewardsScreen from '../screens/cards/RewardsScreen';
import CardsProfileScreen from '../screens/cards/CardsProfileScreen';
import { CardsTabBar } from '../components/cards/CardsTabBar';
import { CardsTabParamList } from './types';
import { cardGame } from '../theme/cardsTheme';

const Tab = createBottomTabNavigator<CardsTabParamList>();

/**
 * The card game's own space. Its bar is the navy/gold CardsTabBar — nothing
 * like the stock-rounds bar — so the two games never look like the same app.
 */
export function CardsTabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CardsTabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: cardGame.background } }}
    >
      <Tab.Screen name="CardsHome" component={CardsHomeScreen} />
      <Tab.Screen name="MyCards" component={MyCardsScreen} />
      <Tab.Screen name="Play" component={PlayCardsScreen} />
      <Tab.Screen name="Rewards" component={RewardsScreen} />
      <Tab.Screen name="Profile" component={CardsProfileScreen} />
    </Tab.Navigator>
  );
}

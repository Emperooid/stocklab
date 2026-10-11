import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CardsHomeScreen from '../screens/cards/CardsHomeScreen';
import MyCardsScreen from '../screens/cards/MyCardsScreen';
import PlayCardsScreen from '../screens/cards/PlayCardsScreen';
import RewardsScreen from '../screens/cards/RewardsScreen';
import CardsProfileScreen from '../screens/cards/CardsProfileScreen';
import { RaisedTabButton } from '../components/RaisedTabButton';
import { CardsTabParamList } from './types';
import { layout, shadow, typography, useColors } from '../theme/theme';

const Tab = createBottomTabNavigator<CardsTabParamList>();

const ICONS: Record<keyof CardsTabParamList, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  CardsHome: ['home', 'home-outline'],
  MyCards: ['albums', 'albums-outline'],
  Play: ['albums', 'albums-outline'],
  Rewards: ['trophy', 'trophy-outline'],
  Profile: ['person-circle', 'person-circle-outline'],
};

const TAB_BAR_CONTENT_HEIGHT = 54;
const TAB_BAR_MIN_PADDING_BOTTOM = 8;

/** The card game's own space — same tab-bar pattern as MainTabs (RaisedTabButton on the primary action tab), just a different icon/label set. */
export function CardsTabs() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(TAB_BAR_MIN_PADDING_BOTTOM, insets.bottom);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: { fontSize: typography.tiny.fontSize, fontWeight: '600' },
        tabBarItemStyle: { marginVertical: 0 },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0,
          borderWidth: 0,
          height: TAB_BAR_CONTENT_HEIGHT + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 0,
          marginHorizontal: 0,
          marginBottom: 0,
          ...(layout.isTablet && {
            width: layout.contentMaxWidth,
            alignSelf: 'center',
            borderRadius: 0,
          }),
          ...shadow.sm,
        },
        tabBarIcon: ({ color, size, focused }) => {
          const [active, inactive] = ICONS[route.name as keyof CardsTabParamList];
          return <Ionicons name={focused ? active : inactive} size={size - 2} color={color} />;
        },
      })}
    >
      <Tab.Screen name="CardsHome" component={CardsHomeScreen} />
      <Tab.Screen name="MyCards" component={MyCardsScreen} />
      <Tab.Screen
        name="Play"
        component={PlayCardsScreen}
        options={{
          tabBarButton: (props) => <RaisedTabButton {...props} icon="albums" label="Play" />,
        }}
      />
      <Tab.Screen name="Rewards" component={RewardsScreen} />
      <Tab.Screen name="Profile" component={CardsProfileScreen} />
    </Tab.Navigator>
  );
}

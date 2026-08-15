import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/main/HomeScreen';
import RoundsScreen from '../screens/main/RoundsScreen';
import PredictScreen from '../screens/main/PredictScreen';
import WalletScreen from '../screens/main/WalletScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import { MainTabParamList } from './types';
import { colors, shadow, typography } from '../theme/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Home: ['home', 'home-outline'],
  Rounds: ['calendar', 'calendar-outline'],
  Predict: ['stats-chart', 'stats-chart-outline'],
  Wallet: ['wallet', 'wallet-outline'],
  Profile: ['person-circle', 'person-circle-outline'],
};

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: { fontSize: typography.tiny.fontSize, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 6,
          ...shadow.md,
        },
        tabBarIcon: ({ color, size, focused }) => {
          const [active, inactive] = ICONS[route.name as keyof MainTabParamList];
          return <Ionicons name={focused ? active : inactive} size={size - 2} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Rounds" component={RoundsScreen} />
      <Tab.Screen name="Predict" component={PredictScreen} />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/main/HomeScreen';
import RoundsScreen from '../screens/main/RoundsScreen';
import PredictScreen from '../screens/main/PredictScreen';
import WalletScreen from '../screens/main/WalletScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import { RaisedTabButton } from '../components/RaisedTabButton';
import { MainTabParamList } from './types';
import { layout, radius, shadow, typography, useColors } from '../theme/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Home: ['home', 'home-outline'],
  Rounds: ['calendar', 'calendar-outline'],
  Predict: ['stats-chart', 'stats-chart-outline'],
  Wallet: ['wallet', 'wallet-outline'],
  Profile: ['person-circle', 'person-circle-outline'],
};

// Icon/label content area, independent of the device's bottom inset.
const TAB_BAR_CONTENT_HEIGHT = 50;
const TAB_BAR_PADDING_TOP = 6;
const TAB_BAR_MIN_PADDING_BOTTOM = 10;

export function MainTabs() {
  const colors = useColors();
  // react-navigation's default tab bar auto-pads for the device's bottom
  // inset, but overriding tabBarStyle's height/padding (needed for the
  // raised Stock button) opts out of that — on phones with an on-screen
  // gesture bar or 3-button nav, the tab bar then sits underneath it and
  // becomes unreachable. Compute the inset ourselves and fold it back in.
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(TAB_BAR_MIN_PADDING_BOTTOM, insets.bottom);

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
          height: TAB_BAR_CONTENT_HEIGHT + TAB_BAR_PADDING_TOP + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: TAB_BAR_PADDING_TOP,
          // Every screen caps content at layout.contentMaxWidth and centers
          // it on tablets (see Screen.tsx) — an edge-to-edge tab bar would
          // stretch 5 tabs across the full width and look inconsistent with
          // that, so mirror the same centered, capped treatment here.
          ...(layout.isTablet && {
            width: layout.contentMaxWidth,
            alignSelf: 'center',
            borderLeftWidth: 1,
            borderRightWidth: 1,
            borderColor: colors.border,
            borderTopLeftRadius: radius.lg,
            borderTopRightRadius: radius.lg,
          }),
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
      <Tab.Screen
        name="Predict"
        component={PredictScreen}
        options={{
          tabBarButton: (props) => <RaisedTabButton {...props} icon="stats-chart" label="Stock" />,
        }}
      />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

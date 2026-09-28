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
import { layout, typography, useColors } from '../theme/theme';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICONS: Record<keyof MainTabParamList, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Home: ['home', 'home-outline'],
  Rounds: ['storefront', 'storefront-outline'],
  Predict: ['hammer', 'hammer-outline'],
  Wallet: ['wallet', 'wallet-outline'],
  Profile: ['person-circle', 'person-circle-outline'],
};

// Icon/label content area, independent of the device's bottom inset. Taller
// than a plain tab bar strictly needs, on purpose — this is also the
// reference height the raised Stock button (RaisedTabButton) floats above,
// so cramming it too short is exactly what previously left the label text
// looking clipped/crowded against the edge.
const TAB_BAR_CONTENT_HEIGHT = 58;
const TAB_BAR_PADDING_TOP = 8;
const TAB_BAR_MIN_PADDING_BOTTOM = 10;

export function MainTabs() {
  const colors = useColors();
  // react-navigation's default tab bar auto-pads for the device's bottom
  // inset, but overriding tabBarStyle's height/padding (needed for the
  // raised Stock button) opts out of that — on phones with an on-screen
  // gesture bar or 3-button nav, the tab bar then sits underneath it and
  // becomes unreachable. Compute the inset ourselves and fold it back in.
  const insets = useSafeAreaInsets();
  // Rounded — useSafeAreaInsets() can return a fractional value (varies by
  // device), and feeding that straight into a native height/padding prop
  // crashes under the New Architecture: Fabric throws on a lossy
  // float-to-integer conversion instead of silently rounding it the way the
  // old architecture did.
  const bottomPadding = Math.round(Math.max(TAB_BAR_MIN_PADDING_BOTTOM, insets.bottom));
  const barHeight = TAB_BAR_CONTENT_HEIGHT + TAB_BAR_PADDING_TOP + bottomPadding;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textDim,
        tabBarLabelStyle: { fontSize: typography.tiny.fontSize, fontWeight: '600' },
        tabBarStyle: {
          // Flat and blended — same color as the screen behind it, no
          // rounded corners, no shadow. A distinct surface color here (even
          // without a shadow) still reads as a visible "card" edge right
          // where its rounded corner meets the screen's own background,
          // which is exactly the "extra border" this was rejected for. The
          // raised Stock button (RaisedTabButton) carries the visual
          // presence instead, via its own halo — a locally different tone
          // just behind the button, not a bar-wide box.
          backgroundColor: colors.background,
          borderTopWidth: 0,
          height: barHeight,
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
          }),
        },
        tabBarIcon: ({ color, size, focused }) => {
          const [active, inactive] = ICONS[route.name as keyof MainTabParamList];
          return <Ionicons name={focused ? active : inactive} size={size - 2} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Rounds" component={RoundsScreen} options={{ title: 'Auctions' }} />
      <Tab.Screen
        name="Predict"
        component={PredictScreen}
        options={{
          tabBarButton: (props) => <RaisedTabButton {...props} icon="hammer" label="Bid" />,
        }}
      />
      <Tab.Screen name="Wallet" component={WalletScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

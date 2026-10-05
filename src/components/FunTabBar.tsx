import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { AppIcon } from './AppIcon';
import { BrandIconName } from '../theme/icons';
import { withAlpha } from '../lib/color';
import { layout, radius, shadow, spacing, typography, useColors } from '../theme/theme';

interface TabMeta {
  icon: BrandIconName;
  label: string;
  color: string;
}

const TAB_META: Record<string, TabMeta> = {
  Home: { icon: 'home', label: 'Home', color: '#6D4AFF' },
  Rounds: { icon: 'calendar', label: 'Rounds', color: '#2E9BFF' },
  Predict: { icon: 'stock', label: 'Play', color: '#00B39B' },
  Wallet: { icon: 'wallet', label: 'Wallet', color: '#FF6B2C' },
  Profile: { icon: 'profile', label: 'Profile', color: '#FF4D8D' },
};

const RAISED_SIZE = 62;

/**
 * Hand-built bottom bar: rounded floating slab, picture icons from the bundled
 * PNG set (no icon font anywhere), and a raised centre "Play" button that pops
 * out of the bar.
 */
export function FunTabBar({ state, navigation }: BottomTabBarProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets.bottom);

  return (
    <View style={styles.host} pointerEvents="box-none">
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const meta = TAB_META[route.name];
          if (!meta) return null;
          const focused = state.index === index;
          const isRaised = route.name === 'Predict';

          function handlePress() {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          }

          if (isRaised) {
            return (
              <View key={route.key} style={styles.raisedSlot}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handlePress}
                  accessibilityRole="button"
                  accessibilityState={focused ? { selected: true } : {}}
                  accessibilityLabel={meta.label}
                  style={[
                    styles.raisedBtn,
                    { backgroundColor: focused ? meta.color : colors.primary },
                  ]}
                >
                  <AppIcon name={meta.icon} size={30} />
                </TouchableOpacity>
                <Text style={[styles.raisedLabel, { color: focused ? colors.primary : colors.textDim }]}>{meta.label}</Text>
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={route.key}
              activeOpacity={0.8}
              onPress={handlePress}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={meta.label}
              style={styles.item}
            >
              <View style={[styles.iconWell, focused && { backgroundColor: withAlpha(meta.color, 0.16) }]}>
                <AppIcon name={meta.icon} size={focused ? 27 : 24} opacity={focused ? 1 : 0.55} />
              </View>
              <Text style={[styles.label, { color: focused ? meta.color : colors.textDim }]} numberOfLines={1}>
                {meta.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useColors>, bottomInset: number) {
  const pad = Math.max(bottomInset, spacing.sm);
  return StyleSheet.create({
    host: {
      paddingHorizontal: spacing.md,
      paddingBottom: pad,
      paddingTop: spacing.sm,
      backgroundColor: 'transparent',
    },
    bar: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      borderWidth: 1,
      borderColor: colors.border,
      height: layout.tabBarHeight,
      paddingHorizontal: spacing.xs,
      ...shadow.lg,
    },
    item: { flex: 1, alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 },
    iconWell: { width: 44, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
    label: { ...typography.tiny, fontWeight: '800' },
    raisedSlot: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
    raisedBtn: {
      width: RAISED_SIZE,
      height: RAISED_SIZE,
      borderRadius: RAISED_SIZE / 2,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: -26,
      borderWidth: 4,
      borderColor: colors.surface,
      ...shadow.lg,
    },
    raisedLabel: { ...typography.tiny, fontWeight: '800', marginTop: 2 },
  });
}
